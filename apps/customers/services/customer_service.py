"""
Service de gestion avancée des clients SYSCOHADA
Recouvrement automatisé et analytics selon EXF-CC-002 et EXF-CC-003
"""
from typing import List, Dict, Optional, Any
from django.db import transaction, connection
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Sum, Count, Q, F, Avg
from django.core.cache import cache
from decimal import Decimal
from datetime import date, timedelta
import logging

from ..models import (
    Customer, CustomerContact, CustomerPaymentPromise, 
    CustomerReminderHistory, CustomerAnalytics
)
from apps.accounting.models import JournalEntryLine, JournalEntry


logger = logging.getLogger(__name__)


class CustomerService:
    """
    Service de gestion clients avec recouvrement intelligent
    Performance optimisée et conformité SYSCOHADA
    """
    
    @staticmethod
    def create_customer(
        company,
        customer_data: Dict[str, Any],
        contacts_data: List[Dict] = None,
        user=None
    ) -> Customer:
        """
        Crée un nouveau client avec validation complète
        Auto-génération du code selon nomenclature cahier des charges
        """
        with transaction.atomic():
            # Auto-génération du code client si non fourni
            if not customer_data.get('code'):
                customer_data['code'] = CustomerService._generate_customer_code(
                    company, customer_data.get('country', 'Cameroun')
                )
            
            # Validation des données
            CustomerService._validate_customer_data(customer_data, company)
            
            # Création du client
            customer = Customer.objects.create(
                company=company,
                **customer_data
            )
            
            # Création analytics associées
            CustomerAnalytics.objects.create(customer=customer)
            
            # Création contacts si fournis
            if contacts_data:
                for contact_data in contacts_data:
                    CustomerService.add_contact(customer, contact_data, user)
            
            logger.info(f"Client {customer.code} créé pour {company.name}")
            
            return customer
    
    @staticmethod
    def _generate_customer_code(company, country: str = "Cameroun") -> str:
        """
        Génère un code client selon format cahier des charges:
        C + [Pays] + [Numéro séquentiel]
        """
        # Mapping pays -> code
        country_codes = {
            'Cameroun': 'CM',
            'Gabon': 'GA', 
            'Tchad': 'TD',
            'Centrafrique': 'CF',
            'Congo': 'CG',
            'Guinée Équatoriale': 'GQ',
            'France': 'FR',
            'Autres': 'XX',
        }
        
        country_code = country_codes.get(country, 'XX')
        
        # Dernier numéro utilisé pour ce pays
        last_customer = Customer.objects.filter(
            company=company,
            code__startswith=f'C{country_code}'
        ).order_by('code').last()
        
        if last_customer:
            # Extraction du numéro et incrémentation
            try:
                last_num = int(last_customer.code[3:])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1
        
        return f"C{country_code}{next_num:05d}"  # CCM00001
    
    @staticmethod
    def _validate_customer_data(data: Dict[str, Any], company) -> None:
        """Validation complète des données client"""
        required_fields = ['legal_name', 'main_address', 'city']
        
        for field in required_fields:
            if not data.get(field):
                raise ValidationError(f"Champ obligatoire: {field}")
        
        # Validation unicité code
        if data.get('code'):
            existing = Customer.objects.filter(
                company=company, 
                code=data['code']
            ).exists()
            if existing:
                raise ValidationError(f"Code client {data['code']} déjà utilisé")
    
    @staticmethod
    def calculate_customer_dso(customer: Customer, period_days: int = 90) -> Dict[str, Any]:
        """
        Calcul DSO client avec analyse détaillée (EXF-CC-003)
        """
        if not customer.account:
            return {'error': 'Aucun compte comptable associé'}
        
        period_start = date.today() - timedelta(days=period_days)
        
        # CA facturé sur la période
        sales_lines = JournalEntryLine.objects.filter(
            third_party=customer,
            account__account_class='7',  # Comptes produits
            entry__entry_date__gte=period_start,
            entry__is_validated=True
        )
        
        total_sales = sales_lines.aggregate(
            amount=Sum('credit_amount') or Decimal('0')
        )['amount']
        
        # Encours actuel non lettré
        outstanding = customer.current_outstanding or customer.update_outstanding_balance()
        
        # Calcul DSO
        if total_sales == 0:
            dso = 0
        else:
            dso = float((outstanding / total_sales * period_days).quantize(Decimal('0.1')))
        
        # Benchmark sectoriel (moyenne autres clients)
        sector_avg_dso = Customer.objects.filter(
            company=customer.company,
            business_sector=customer.business_sector
        ).exclude(id=customer.id).aggregate(
            avg_dso=Avg('analytics__average_payment_delay')
        )['avg_dso'] or 0
        
        return {
            'dso': dso,
            'outstanding_amount': float(outstanding),
            'sales_amount': float(total_sales),
            'period_days': period_days,
            'sector_average': float(sector_avg_dso),
            'performance': 'GOOD' if dso <= sector_avg_dso else 'POOR',
            'calculation_date': date.today().isoformat(),
        }
    
    @staticmethod
    def get_aging_dashboard(
        company, 
        fiscal_year: Optional = None,
        include_details: bool = True
    ) -> Dict[str, Any]:
        """
        Tableau de Bord Recouvrement Temps Réel (EXF-CC-003)
        Balance âgée interactive par client
        """
        cache_key = f"aging_dashboard_{company.id}_{fiscal_year.id if fiscal_year else 'current'}"
        
        # Vérification cache (10 minutes)
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        today = date.today()
        
        # Requête SQL optimisée pour balance âgée
        sql = """
        WITH customer_aging AS (
            SELECT 
                c.id,
                c.code,
                c.legal_name,
                c.credit_limit,
                c.risk_level,
                SUM(CASE 
                    WHEN je.entry_date >= %s THEN jel.debit_amount - jel.credit_amount 
                    ELSE 0 
                END) as current_amount,
                SUM(CASE 
                    WHEN je.entry_date < %s AND je.entry_date >= %s 
                    THEN jel.debit_amount - jel.credit_amount 
                    ELSE 0 
                END) as days_30_60,
                SUM(CASE 
                    WHEN je.entry_date < %s AND je.entry_date >= %s 
                    THEN jel.debit_amount - jel.credit_amount 
                    ELSE 0 
                END) as days_60_90,
                SUM(CASE 
                    WHEN je.entry_date < %s 
                    THEN jel.debit_amount - jel.credit_amount 
                    ELSE 0 
                END) as over_90_days,
                SUM(jel.debit_amount - jel.credit_amount) as total_outstanding
            FROM customers c
            LEFT JOIN accounting_journalentryline jel ON c.account_id = jel.account_id
            LEFT JOIN accounting_journalentry je ON jel.entry_id = je.id
            WHERE c.company_id = %s 
            AND c.status = 'ACTIVE'
            AND (jel.is_reconciled = false OR jel.is_reconciled IS NULL)
            AND je.is_validated = true
            GROUP BY c.id, c.code, c.legal_name, c.credit_limit, c.risk_level
            HAVING total_outstanding > 0
        """
        
        # Dates pour tranches d'ancienneté
        current_cutoff = today - timedelta(days=30)
        days_60_cutoff = today - timedelta(days=60)
        days_90_cutoff = today - timedelta(days=90)
        
        params = [
            current_cutoff, current_cutoff, days_60_cutoff,
            days_60_cutoff, days_90_cutoff, days_90_cutoff,
            company.id
        ]
        
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            columns = [col[0] for col in cursor.description]
            customers_aging = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        # Calcul des totaux globaux
        totals = {
            'current': sum(c['current_amount'] or 0 for c in customers_aging),
            'days_30_60': sum(c['days_30_60'] or 0 for c in customers_aging),
            'days_60_90': sum(c['days_60_90'] or 0 for c in customers_aging),
            'over_90': sum(c['over_90_days'] or 0 for c in customers_aging),
        }
        totals['total'] = sum(totals.values())
        
        # Top 10 clients à risque
        top_risk_customers = sorted(
            customers_aging,
            key=lambda x: (x['total_outstanding'] or 0),
            reverse=True
        )[:10]
        
        # DSO global
        if fiscal_year:
            period_sales = JournalEntryLine.objects.filter(
                entry__company=company,
                entry__fiscal_year=fiscal_year,
                account__account_class='7',
                entry__is_validated=True
            ).aggregate(total=Sum('credit_amount') or Decimal('0'))['total']
            
            global_dso = float((totals['total'] / period_sales * 365).quantize(Decimal('0.1'))) if period_sales > 0 else 0
        else:
            global_dso = 0
        
        # Actions prioritaires automatiques
        priority_actions = CustomerService._generate_priority_actions(customers_aging)
        
        result = {
            'summary': {
                'total_customers_with_outstanding': len(customers_aging),
                'total_outstanding': totals['total'],
                'global_dso': global_dso,
                'aging_breakdown': {
                    'current': totals['current'],
                    'days_30_60': totals['days_30_60'],
                    'days_60_90': totals['days_60_90'],
                    'over_90': totals['over_90'],
                },
                'aging_percentages': {
                    'current': (totals['current'] / totals['total'] * 100) if totals['total'] > 0 else 0,
                    'days_30_60': (totals['days_30_60'] / totals['total'] * 100) if totals['total'] > 0 else 0,
                    'days_60_90': (totals['days_60_90'] / totals['total'] * 100) if totals['total'] > 0 else 0,
                    'over_90': (totals['over_90'] / totals['total'] * 100) if totals['total'] > 0 else 0,
                }
            },
            'top_risk_customers': top_risk_customers,
            'priority_actions': priority_actions,
            'generated_at': timezone.now().isoformat(),
        }
        
        if include_details:
            result['customers_detail'] = customers_aging
        
        # Cache 10 minutes
        cache.set(cache_key, result, 600)
        
        return result
    
    @staticmethod
    def _generate_priority_actions(customers_aging: List[Dict]) -> List[Dict]:
        """Génère les actions prioritaires automatiques"""
        actions = []
        
        for customer_data in customers_aging:
            outstanding = customer_data.get('total_outstanding', 0)
            over_90 = customer_data.get('over_90_days', 0)
            
            # Actions selon ancienneté et montant
            if over_90 > 100000:  # > 100K XAF depuis 90+ jours
                actions.append({
                    'customer_code': customer_data['code'],
                    'customer_name': customer_data['legal_name'],
                    'priority': 'HIGH',
                    'action': 'LEGAL_ACTION',
                    'description': f"Contentieux - {outstanding:,.0f} XAF dont {over_90:,.0f} > 90j",
                    'amount': outstanding,
                })
            
            elif customer_data.get('days_60_90', 0) > 50000:  # > 50K entre 60-90j
                actions.append({
                    'customer_code': customer_data['code'], 
                    'customer_name': customer_data['legal_name'],
                    'priority': 'MEDIUM',
                    'action': 'FORMAL_NOTICE',
                    'description': f"Mise en demeure - {outstanding:,.0f} XAF",
                    'amount': outstanding,
                })
            
            elif customer_data.get('days_30_60', 0) > 10000:  # > 10K entre 30-60j
                actions.append({
                    'customer_code': customer_data['code'],
                    'customer_name': customer_data['legal_name'],
                    'priority': 'LOW',
                    'action': 'PHONE_CALL',
                    'description': f"Appel de relance - {outstanding:,.0f} XAF",
                    'amount': outstanding,
                })
        
        # Tri par priorité et montant
        priority_order = {'HIGH': 3, 'MEDIUM': 2, 'LOW': 1}
        actions.sort(key=lambda x: (priority_order[x['priority']], x['amount']), reverse=True)
        
        return actions[:20]  # Top 20 actions
    
    @staticmethod
    def process_automated_reminders(company) -> Dict[str, Any]:
        """
        Relances Multi-Niveaux Automatisées (EXF-CC-003)
        """
        today = date.today()
        processed_reminders = []
        
        # Clients actifs avec encours non lettré
        customers_to_process = Customer.objects.filter(
            company=company,
            status='ACTIVE',
            current_outstanding__gt=0
        ).select_related('account')
        
        for customer in customers_to_process:
            # Récupération des factures non lettrées avec ancienneté
            overdue_invoices = JournalEntryLine.objects.filter(
                account=customer.account,
                third_party=customer,
                entry__is_validated=True,
                is_reconciled=False,
                debit_amount__gt=0,  # Seulement les débits (factures)
                entry__entry_date__lt=today
            ).select_related('entry')
            
            for invoice_line in overdue_invoices:
                days_overdue = (today - invoice_line.entry.entry_date).days
                
                # Détermination du niveau de relance
                reminder_level = CustomerService._determine_reminder_level(days_overdue)
                
                if reminder_level:
                    # Vérification si relance déjà envoyée pour ce niveau
                    already_sent = CustomerReminderHistory.objects.filter(
                        customer=customer,
                        reminder_level=reminder_level,
                        sent_date__gte=today - timedelta(days=7)  # Pas de doublon sur 7j
                    ).exists()
                    
                    if not already_sent:
                        reminder = CustomerService._send_reminder(
                            customer, reminder_level, invoice_line
                        )
                        processed_reminders.append(reminder)
        
        return {
            'processed_count': len(processed_reminders),
            'reminders': processed_reminders,
            'process_date': today.isoformat(),
        }
    
    @staticmethod
    def _determine_reminder_level(days_overdue: int) -> Optional[str]:
        """Détermine le niveau de relance selon ancienneté"""
        if days_overdue >= 60:
            return 'LEVEL_5'  # Transfert contentieux (J+60)
        elif days_overdue >= 45:
            return 'LEVEL_4'  # Mise en demeure (J+45)
        elif days_overdue >= 30:
            return 'LEVEL_3'  # Lettre recommandée (J+30)
        elif days_overdue >= 15:
            return 'LEVEL_2'  # Email + SMS ferme (J+15)
        elif days_overdue >= 5:
            return 'LEVEL_1'  # Email rappel courtois (J+5)
        
        return None
    
    @staticmethod
    def _send_reminder(
        customer: Customer, 
        reminder_level: str, 
        invoice_line: JournalEntryLine
    ) -> Dict[str, Any]:
        """
        Envoie une relance selon le niveau
        """
        # Configuration des relances selon niveau
        reminder_config = {
            'LEVEL_1': {
                'channel': 'EMAIL',
                'subject': 'Rappel aimable - Échéance dépassée',
                'template': 'courteous_reminder',
            },
            'LEVEL_2': {
                'channel': 'EMAIL',  # + SMS si mobile disponible
                'subject': 'Relance ferme - Paiement en retard',
                'template': 'firm_reminder',
            },
            'LEVEL_3': {
                'channel': 'REGISTERED',
                'subject': 'Mise en demeure de payer',
                'template': 'registered_notice',
            },
            'LEVEL_4': {
                'channel': 'LEGAL',
                'subject': 'Mise en demeure officielle',
                'template': 'formal_notice',
            },
            'LEVEL_5': {
                'channel': 'LEGAL',
                'subject': 'Transfert contentieux',
                'template': 'legal_action',
            },
        }
        
        config = reminder_config.get(reminder_level)
        if not config:
            return {'error': 'Configuration relance inconnue'}
        
        # Génération du message personnalisé
        message_content = CustomerService._generate_reminder_message(
            customer, invoice_line, config['template']
        )
        
        # Sélection du contact cible
        target_contact = customer.contacts.filter(
            is_primary=True, is_active=True
        ).first() or customer.contacts.filter(
            role='ACCOUNTANT', is_active=True
        ).first()
        
        # Enregistrement de la relance
        reminder = CustomerReminderHistory.objects.create(
            customer=customer,
            reminder_level=reminder_level,
            channel=config['channel'],
            subject=config['subject'],
            message=message_content,
            target_contact=target_contact,
            target_email=target_contact.email if target_contact else customer.email,
            target_phone=target_contact.mobile if target_contact else customer.mobile_phone,
            sent_by=None,  # Automatique
        )
        
        # TODO: Intégration réelle envoi (email, SMS, etc.)
        # Pour l'instant, simulation
        reminder.status = 'SENT'
        reminder.save()
        
        logger.info(f"Relance {reminder_level} envoyée à {customer.code}")
        
        return {
            'reminder_id': str(reminder.id),
            'level': reminder_level,
            'customer': customer.code,
            'channel': config['channel'],
            'target': target_contact.email if target_contact else customer.email,
        }
    
    @staticmethod
    def _generate_reminder_message(
        customer: Customer, 
        invoice_line: JournalEntryLine, 
        template: str
    ) -> str:
        """Génère le contenu personnalisé de la relance"""
        
        templates = {
            'courteous_reminder': f"""
Cher(e) {customer.legal_name},

Nous nous permettons de vous rappeler aimablement que votre facture 
{invoice_line.entry.piece_number} du {invoice_line.entry.entry_date} 
d'un montant de {invoice_line.debit_amount:,.0f} XAF arrive à échéance.

Nous vous remercions de bien vouloir procéder au règlement dans les plus brefs délais.

Cordialement,
Service Comptable
            """,
            
            'firm_reminder': f"""
{customer.legal_name},

RAPPEL FERME - Facture en retard

Votre facture {invoice_line.entry.piece_number} du {invoice_line.entry.entry_date} 
d'un montant de {invoice_line.debit_amount:,.0f} XAF est en retard de paiement.

Merci de régulariser votre situation sous 48h ou de nous contacter.

Service Recouvrement
            """,
            
            'registered_notice': f"""
MISE EN DEMEURE DE PAYER

Facture: {invoice_line.entry.piece_number}
Date: {invoice_line.entry.entry_date}
Montant: {invoice_line.debit_amount:,.0f} XAF
Retard: {(date.today() - invoice_line.entry.entry_date).days} jours

Vous disposez de 15 jours pour régulariser votre situation avant 
engagement de poursuites judiciaires.
            """,
        }
        
        return templates.get(template, f"Relance {customer.code} - {invoice_line.debit_amount}")
    
    @staticmethod
    def create_payment_promise(
        customer: Customer,
        promise_data: Dict[str, Any],
        user=None
    ) -> CustomerPaymentPromise:
        """
        Enregistrement des engagements clients (EXF-CC-003)
        """
        with transaction.atomic():
            # Génération référence unique
            if not promise_data.get('promise_reference'):
                promise_data['promise_reference'] = f"PROM-{customer.code}-{timezone.now().strftime('%Y%m%d%H%M')}"
            
            promise = CustomerPaymentPromise.objects.create(
                customer=customer,
                created_by=user,
                **promise_data
            )
            
            # Programmation rappel automatique
            CustomerService._schedule_promise_reminder(promise)
            
            logger.info(f"Promesse paiement créée: {promise.promise_reference}")
            
            return promise
    
    @staticmethod
    def _schedule_promise_reminder(promise: CustomerPaymentPromise):
        """Programme les rappels automatiques pour les promesses"""
        # TODO: Intégration avec système de tâches (Celery)
        # Pour maintenant, marquage pour traitement batch
        pass
    
    @staticmethod
    def get_customer_statement(
        customer: Customer,
        date_from: date,
        date_to: date
    ) -> Dict[str, Any]:
        """
        Génère le relevé de compte client détaillé
        """
        if not customer.account:
            raise ValidationError("Aucun compte comptable associé au client")
        
        # Récupération des mouvements
        movements = JournalEntryLine.objects.filter(
            account=customer.account,
            third_party=customer,
            entry__entry_date__gte=date_from,
            entry__entry_date__lte=date_to,
            entry__is_validated=True
        ).select_related(
            'entry', 'entry__journal'
        ).order_by('entry__entry_date', 'entry__piece_number')
        
        # Calcul solde initial
        initial_balance = JournalEntryLine.objects.filter(
            account=customer.account,
            third_party=customer,
            entry__entry_date__lt=date_from,
            entry__is_validated=True
        ).aggregate(
            debit=Sum('debit_amount') or Decimal('0'),
            credit=Sum('credit_amount') or Decimal('0')
        )
        
        opening_balance = initial_balance['debit'] - initial_balance['credit']
        
        # Construction du relevé
        statement_lines = []
        running_balance = opening_balance
        
        for line in movements:
            movement = line.debit_amount - line.credit_amount
            running_balance += movement
            
            statement_lines.append({
                'date': line.entry.entry_date.isoformat(),
                'piece_number': line.entry.piece_number,
                'journal': line.entry.journal.code,
                'description': line.label,
                'reference': line.entry.reference,
                'debit': float(line.debit_amount),
                'credit': float(line.credit_amount),
                'balance': float(running_balance),
                'is_reconciled': line.is_reconciled,
                'due_date': None,  # À calculer si facture
            })
        
        return {
            'customer': {
                'code': customer.code,
                'name': customer.legal_name,
                'address': customer.main_address,
                'city': f"{customer.postal_code} {customer.city}" if customer.postal_code else customer.city,
            },
            'period': {
                'from': date_from.isoformat(),
                'to': date_to.isoformat(),
            },
            'balances': {
                'opening': float(opening_balance),
                'closing': float(running_balance),
                'total_debit': float(sum(l['debit'] for l in statement_lines)),
                'total_credit': float(sum(l['credit'] for l in statement_lines)),
            },
            'movements': statement_lines,
            'generated_at': timezone.now().isoformat(),
        }
    
    @staticmethod
    def analyze_customer_profitability(
        customer: Customer,
        period_months: int = 12
    ) -> Dict[str, Any]:
        """
        Analyse de rentabilité client avancée
        """
        period_start = date.today() - timedelta(days=period_months * 30)
        
        # CA généré
        sales_data = JournalEntryLine.objects.filter(
            third_party=customer,
            account__account_class='7',
            entry__entry_date__gte=period_start,
            entry__is_validated=True
        ).aggregate(
            total_sales=Sum('credit_amount') or Decimal('0'),
            invoice_count=Count('entry', distinct=True)
        )
        
        # Coûts de recouvrement (estimation)
        reminder_cost = customer.reminders.filter(
            sent_date__gte=period_start
        ).count() * Decimal('5000')  # 5000 XAF par relance
        
        # Provisions pour impayés
        provision_rate = Decimal('0.02')  # 2% standard
        provision_amount = sales_data['total_sales'] * provision_rate
        
        # Rentabilité nette estimée
        net_profitability = (
            sales_data['total_sales'] * Decimal('0.15') -  # Marge 15% estimée
            reminder_cost - 
            provision_amount
        )
        
        return {
            'customer_code': customer.code,
            'period_months': period_months,
            'sales_metrics': {
                'total_sales': float(sales_data['total_sales']),
                'invoice_count': sales_data['invoice_count'],
                'average_invoice': float(sales_data['total_sales'] / sales_data['invoice_count']) if sales_data['invoice_count'] > 0 else 0,
            },
            'cost_metrics': {
                'reminder_cost': float(reminder_cost),
                'provision_cost': float(provision_amount),
                'total_cost': float(reminder_cost + provision_amount),
            },
            'profitability': {
                'gross_profit': float(sales_data['total_sales'] * Decimal('0.15')),
                'net_profit': float(net_profitability),
                'margin_rate': float(net_profitability / sales_data['total_sales'] * 100) if sales_data['total_sales'] > 0 else 0,
            },
            'recommendation': 'PROFITABLE' if net_profitability > 0 else 'REVIEW_REQUIRED',
        }
    
    @staticmethod
    def get_collection_forecast(
        company,
        forecast_days: int = 90
    ) -> Dict[str, Any]:
        """
        Prévisions d'encaissement ML (EXF-CC-003)
        """
        # Collecte des données historiques pour ML
        historical_data = CustomerService._collect_payment_patterns(company)
        
        # Simulation prédiction simple (remplacer par vraie ML)
        forecast = CustomerService._simulate_collection_forecast(
            company, historical_data, forecast_days
        )
        
        return {
            'forecast_period_days': forecast_days,
            'total_expected': forecast['total_expected'],
            'confidence_score': forecast['confidence'],
            'weekly_breakdown': forecast['weekly'],
            'risk_assessment': forecast['risks'],
            'generated_at': timezone.now().isoformat(),
        }
    
    @staticmethod
    def _collect_payment_patterns(company) -> Dict[str, Any]:
        """Collecte patterns de paiement pour ML"""
        # Analyse des 6 derniers mois
        six_months_ago = date.today() - timedelta(days=180)
        
        payment_patterns = JournalEntryLine.objects.filter(
            account__company=company,
            account__account_class='4',
            account__code__startswith='41',
            entry__entry_date__gte=six_months_ago,
            entry__is_validated=True,
            is_reconciled=True
        ).values(
            'third_party__risk_level',
            'third_party__payment_terms'
        ).annotate(
            avg_delay=Avg(
                models.F('reconciliation_date') - models.F('entry__entry_date')
            ),
            payment_count=Count('id')
        )
        
        return {
            'patterns': list(payment_patterns),
            'collection_period': 180,
        }
    
    @staticmethod
    def _simulate_collection_forecast(
        company, 
        historical_data: Dict, 
        forecast_days: int
    ) -> Dict[str, Any]:
        """Simulation simple de prévision (remplacer par ML réel)"""
        
        # Récupération encours actuel par tranche de risque
        current_outstanding = Customer.objects.filter(
            company=company,
            status='ACTIVE'
        ).aggregate(
            risk_a=Sum('current_outstanding', filter=Q(risk_level='A')) or Decimal('0'),
            risk_b=Sum('current_outstanding', filter=Q(risk_level='B')) or Decimal('0'),
            risk_c=Sum('current_outstanding', filter=Q(risk_level='C')) or Decimal('0'),
            risk_d=Sum('current_outstanding', filter=Q(risk_level='D')) or Decimal('0'),
        )
        
        # Probabilités de recouvrement par niveau de risque
        recovery_rates = {
            'A': 0.95,  # 95% chances recouvrement
            'B': 0.85,  # 85% chances
            'C': 0.70,  # 70% chances
            'D': 0.40,  # 40% chances
        }
        
        # Calcul prévisions
        total_expected = sum(
            current_outstanding[f'risk_{level.lower()}'] * Decimal(str(rate))
            for level, rate in recovery_rates.items()
        )
        
        # Répartition hebdomadaire simplifiée
        weeks = forecast_days // 7
        weekly_forecast = []
        
        for week in range(weeks):
            week_percentage = max(0.05, 0.3 - (week * 0.05))  # Décroissance
            weekly_amount = total_expected * Decimal(str(week_percentage))
            
            weekly_forecast.append({
                'week': week + 1,
                'expected_amount': float(weekly_amount),
                'confidence': max(50, 90 - (week * 10)),  # Confiance décroissante
            })
        
        return {
            'total_expected': float(total_expected),
            'confidence': 75,  # Score global
            'weekly': weekly_forecast,
            'risks': [
                {'level': 'HIGH', 'customers': 0, 'amount': 0},
                {'level': 'MEDIUM', 'customers': 0, 'amount': 0},
                {'level': 'LOW', 'customers': 0, 'amount': 0},
            ]
        }