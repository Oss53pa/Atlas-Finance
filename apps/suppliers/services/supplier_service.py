"""
Service de gestion avancée des fournisseurs SYSCOHADA  
Optimisation paiements et intégration Wise Procure selon EXF-CF-001 à EXF-CF-004
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
    Supplier, SupplierContact, SupplierEvaluation, 
    SupplierInvoice, SupplierPayment, SupplierAnalytics
)
from apps.accounting.models import JournalEntryLine, JournalEntry


logger = logging.getLogger(__name__)


class SupplierService:
    """
    Service de gestion fournisseurs avec optimisation des paiements
    Interface native Wise Procure et analytics avancés
    """
    
    @staticmethod
    def create_supplier(
        company,
        supplier_data: Dict[str, Any],
        contacts_data: List[Dict] = None,
        user=None
    ) -> Supplier:
        """
        Crée un nouveau fournisseur avec validation complète
        Auto-génération du code selon nomenclature
        """
        with transaction.atomic():
            # Auto-génération du code fournisseur si non fourni
            if not supplier_data.get('code'):
                supplier_data['code'] = SupplierService._generate_supplier_code(
                    company, 
                    supplier_data.get('supplier_type', 'OTHER'),
                    supplier_data.get('country', 'Cameroun')
                )
            
            # Validation des données
            SupplierService._validate_supplier_data(supplier_data, company)
            
            # Création du fournisseur
            supplier = Supplier.objects.create(
                company=company,
                **supplier_data
            )
            
            # Création analytics associées
            SupplierAnalytics.objects.create(supplier=supplier)
            
            # Création contacts si fournis
            if contacts_data:
                for contact_data in contacts_data:
                    SupplierService.add_contact(supplier, contact_data, user)
            
            logger.info(f"Fournisseur {supplier.code} créé pour {company.name}")
            
            return supplier
    
    @staticmethod
    def _generate_supplier_code(
        company, 
        supplier_type: str = "OTHER",
        country: str = "Cameroun"
    ) -> str:
        """
        Génère code fournisseur selon format cahier des charges:
        F + [Type] + [Numéro] - Ex: FLO0001 (Fournisseur Local 0001)
        """
        # Mapping type -> code
        type_codes = {
            'GOODS': 'GO',       # Goods
            'SERVICES': 'SE',    # Services  
            'SUBCONTRACTOR': 'SU', # Sous-traitant
            'CONSULTING': 'CO',  # Conseil
            'TRANSPORT': 'TR',   # Transport
            'MAINTENANCE': 'MA', # Maintenance
            'LOCAL': 'LO',       # Local (par défaut)
            'FOREIGN': 'ET',     # Étranger
        }
        
        # Détermination du préfixe
        if country != "Cameroun":
            type_code = 'ET'  # Étranger
        else:
            type_code = type_codes.get(supplier_type, 'LO')
        
        # Recherche dernier numéro
        prefix = f'F{type_code}'
        last_supplier = Supplier.objects.filter(
            company=company,
            code__startswith=prefix
        ).order_by('code').last()
        
        if last_supplier:
            try:
                last_num = int(last_supplier.code[len(prefix):])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1
        
        return f"{prefix}{next_num:04d}"  # FLO0001
    
    @staticmethod
    def _validate_supplier_data(data: Dict[str, Any], company) -> None:
        """Validation complète des données fournisseur"""
        required_fields = ['legal_name', 'main_address', 'city', 'supplier_type']
        
        for field in required_fields:
            if not data.get(field):
                raise ValidationError(f"Champ obligatoire: {field}")
        
        # Validation unicité code
        if data.get('code'):
            existing = Supplier.objects.filter(
                company=company,
                code=data['code']
            ).exists()
            if existing:
                raise ValidationError(f"Code fournisseur {data['code']} déjà utilisé")
    
    @staticmethod
    def get_payment_optimization_dashboard(
        company,
        forecast_days: int = 30
    ) -> Dict[str, Any]:
        """
        Tableau de Bord Fournisseurs (EXF-CF-004)
        Optimisation trésorerie et capture escomptes
        """
        cache_key = f"supplier_dashboard_{company.id}_{forecast_days}"
        
        # Cache 15 minutes
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        today = date.today()
        forecast_end = today + timedelta(days=forecast_days)
        
        # Échéancier global avec optimisations
        sql = """
        WITH payment_schedule AS (
            SELECT 
                s.id,
                s.code,
                s.legal_name,
                si.invoice_number,
                si.due_date,
                si.amount_incl_tax,
                s.discount_rate,
                s.early_payment_discount,
                CASE 
                    WHEN %s - si.due_date >= s.early_payment_discount THEN si.amount_incl_tax * (1 - s.early_payment_discount/100)
                    ELSE si.amount_incl_tax
                END as optimized_amount,
                CASE
                    WHEN si.due_date < %s THEN 'OVERDUE'
                    WHEN si.due_date <= %s THEN 'DUE_SOON' 
                    WHEN si.due_date <= %s THEN 'UPCOMING'
                    ELSE 'FUTURE'
                END as urgency_category
            FROM suppliers s
            JOIN supplier_invoices si ON s.id = si.supplier_id
            WHERE s.company_id = %s
            AND si.status NOT IN ('PAID', 'REJECTED')
            AND si.due_date <= %s
        )
        SELECT 
            urgency_category,
            COUNT(*) as invoice_count,
            SUM(amount_incl_tax) as total_amount,
            SUM(optimized_amount) as optimized_total,
            SUM(amount_incl_tax - optimized_amount) as potential_savings
        FROM payment_schedule
        GROUP BY urgency_category
        ORDER BY urgency_category
        """
        
        params = [
            today, today, today + timedelta(days=7), 
            today + timedelta(days=30), company.id, forecast_end
        ]
        
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            columns = [col[0] for col in cursor.description]
            schedule_data = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        # DPO global
        global_dpo = SupplierService._calculate_company_dpo(company)
        
        # Opportunités d'escompte
        discount_opportunities = SupplierService._identify_discount_opportunities(company)
        
        # Propositions de règlement intelligentes
        payment_proposals = SupplierService._generate_smart_payment_proposals(company)
        
        result = {
            'summary': {
                'total_suppliers': Supplier.objects.filter(company=company, status='ACTIVE').count(),
                'total_outstanding': sum(item['total_amount'] or 0 for item in schedule_data),
                'potential_savings': sum(item['potential_savings'] or 0 for item in schedule_data),
                'global_dpo': global_dpo,
            },
            'payment_schedule': schedule_data,
            'discount_opportunities': discount_opportunities,
            'smart_proposals': payment_proposals,
            'generated_at': timezone.now().isoformat(),
        }
        
        # Cache 15 minutes
        cache.set(cache_key, result, 900)
        
        return result
    
    @staticmethod
    def _calculate_company_dpo(company) -> float:
        """Calcule le DPO global de l'entreprise"""
        # DPO = (Dettes fournisseurs / Achats) * 365
        
        # Dettes fournisseurs actuelles
        current_payables = JournalEntryLine.objects.filter(
            account__company=company,
            account__account_class='4',
            account__code__startswith='40',
            entry__is_validated=True,
            is_reconciled=False
        ).aggregate(
            total=Sum('credit_amount') - Sum('debit_amount') or Decimal('0')
        )['total']
        
        # Achats des 90 derniers jours
        ninety_days_ago = date.today() - timedelta(days=90)
        recent_purchases = JournalEntryLine.objects.filter(
            account__company=company,
            account__account_class='6',
            entry__entry_date__gte=ninety_days_ago,
            entry__is_validated=True
        ).aggregate(
            total=Sum('debit_amount') or Decimal('0')
        )['total']
        
        if recent_purchases == 0:
            return 0
        
        # DPO = (Dettes / Achats 90j) * 90
        dpo = float((current_payables / recent_purchases * 90).quantize(Decimal('0.1')))
        return dpo
    
    @staticmethod
    def _identify_discount_opportunities(company) -> List[Dict[str, Any]]:
        """
        Identifie les opportunités d'escompte automatiquement
        """
        today = date.today()
        
        # Factures avec possibilité d'escompte
        opportunities = SupplierInvoice.objects.filter(
            supplier__company=company,
            supplier__early_payment_discount__gt=0,
            status__in=['ACCOUNTING_OK', 'APPROVED'],
            due_date__gt=today  # Pas encore échues
        ).select_related('supplier').annotate(
            days_until_due=F('due_date') - today,
            potential_savings=F('amount_incl_tax') * F('supplier__early_payment_discount') / 100
        ).filter(
            days_until_due__gte=3  # Au moins 3 jours d'avance requis
        ).order_by('-potential_savings')
        
        result = []
        for invoice in opportunities[:20]:  # Top 20 opportunités
            result.append({
                'supplier_code': invoice.supplier.code,
                'supplier_name': invoice.supplier.legal_name,
                'invoice_number': invoice.invoice_number,
                'due_date': invoice.due_date.isoformat(),
                'amount': float(invoice.amount_incl_tax),
                'discount_rate': float(invoice.supplier.early_payment_discount),
                'potential_savings': float(invoice.potential_savings),
                'days_until_due': invoice.days_until_due.days,
                'recommendation': 'PAY_EARLY' if invoice.potential_savings > 10000 else 'EVALUATE',
            })
        
        return result
    
    @staticmethod
    def _generate_smart_payment_proposals(company) -> List[Dict[str, Any]]:
        """
        Propositions de Règlement Intelligentes (EXF-CF-004)
        """
        today = date.today()
        week_ahead = today + timedelta(days=7)
        
        # Factures à payer dans la semaine
        upcoming_invoices = SupplierInvoice.objects.filter(
            supplier__company=company,
            due_date__range=[today, week_ahead],
            status__in=['ACCOUNTING_OK', 'APPROVED']
        ).select_related('supplier').order_by('due_date', 'supplier')
        
        # Regroupement par fournisseur pour optimisation
        supplier_groups = {}
        for invoice in upcoming_invoices:
            supplier_id = invoice.supplier.id
            if supplier_id not in supplier_groups:
                supplier_groups[supplier_id] = {
                    'supplier': invoice.supplier,
                    'invoices': [],
                    'total_amount': Decimal('0'),
                }
            
            supplier_groups[supplier_id]['invoices'].append(invoice)
            supplier_groups[supplier_id]['total_amount'] += invoice.amount_incl_tax
        
        # Génération propositions optimisées
        proposals = []
        
        for group_data in supplier_groups.values():
            supplier = group_data['supplier']
            
            # Proposition de regroupement si > 1 facture
            if len(group_data['invoices']) > 1:
                proposals.append({
                    'type': 'GROUPED_PAYMENT',
                    'supplier_code': supplier.code,
                    'supplier_name': supplier.legal_name,
                    'invoice_count': len(group_data['invoices']),
                    'total_amount': float(group_data['total_amount']),
                    'proposed_date': today.isoformat(),
                    'optimization': 'Regroupement pour réduction frais bancaires',
                    'priority': 'MEDIUM',
                })
            
            # Proposition escompte si applicable
            total_discount = sum(
                inv.amount_incl_tax * supplier.early_payment_discount / 100
                for inv in group_data['invoices']
                if supplier.early_payment_discount > 0
            )
            
            if total_discount > 5000:  # Seuil minimum économie
                proposals.append({
                    'type': 'EARLY_PAYMENT',
                    'supplier_code': supplier.code,
                    'supplier_name': supplier.legal_name,
                    'total_amount': float(group_data['total_amount']),
                    'discount_amount': float(total_discount),
                    'discount_rate': float(supplier.early_payment_discount),
                    'net_payment': float(group_data['total_amount'] - total_discount),
                    'proposed_date': today.isoformat(),
                    'optimization': f"Escompte {supplier.early_payment_discount}% - Économie {total_discount:,.0f}",
                    'priority': 'HIGH',
                })
        
        # Tri par priorité et économies
        priority_order = {'HIGH': 3, 'MEDIUM': 2, 'LOW': 1}
        proposals.sort(
            key=lambda x: (
                priority_order.get(x['priority'], 0),
                x.get('discount_amount', 0)
            ), 
            reverse=True
        )
        
        return proposals[:10]  # Top 10 propositions
    
    @staticmethod
    def process_wise_procure_invoice(
        wise_procure_data: Dict[str, Any],
        company
    ) -> SupplierInvoice:
        """
        Interface avec Wise Procure - EXF-CF-002
        Réception et traitement automatique des factures
        """
        with transaction.atomic():
            # Recherche du fournisseur
            try:
                supplier = Supplier.objects.get(
                    company=company,
                    code=wise_procure_data['supplier_code']
                )
            except Supplier.DoesNotExist:
                raise ValidationError(f"Fournisseur {wise_procure_data['supplier_code']} inexistant")
            
            # Vérification doublon
            existing_invoice = SupplierInvoice.objects.filter(
                supplier=supplier,
                invoice_number=wise_procure_data['invoice_number']
            ).exists()
            
            if existing_invoice:
                raise ValidationError(f"Facture {wise_procure_data['invoice_number']} déjà existante")
            
            # Création de la facture
            invoice = SupplierInvoice.objects.create(
                supplier=supplier,
                invoice_number=wise_procure_data['invoice_number'],
                invoice_date=wise_procure_data['invoice_date'],
                due_date=wise_procure_data['due_date'],
                amount_excl_tax=Decimal(str(wise_procure_data['amount_ht'])),
                vat_amount=Decimal(str(wise_procure_data.get('vat_amount', 0))),
                amount_incl_tax=Decimal(str(wise_procure_data['amount_ttc'])),
                purchase_order_ref=wise_procure_data.get('purchase_order_ref'),
                delivery_receipt_ref=wise_procure_data.get('delivery_receipt_ref'),
                wise_procure_id=wise_procure_data.get('wise_procure_id'),
                ocr_extracted_data=wise_procure_data.get('ocr_data', {}),
                ocr_confidence_score=Decimal(str(wise_procure_data.get('ocr_confidence', 0))),
            )
            
            # Validation automatique si données complètes
            if invoice.ocr_confidence_score >= 95:
                invoice.technical_validation = 'APPROVED'
                invoice.technical_validation_date = timezone.now()
                invoice.save()
                
                # Auto-comptabilisation si validation technique OK
                SupplierService._auto_process_invoice(invoice)
            
            logger.info(f"Facture {invoice.invoice_number} reçue de Wise Procure")
            
            return invoice
    
    @staticmethod
    def _auto_process_invoice(invoice: SupplierInvoice):
        """
        Traitement automatique facture avec workflow (EXF-CF-003)
        """
        # Contrôles automatiques
        controls_passed = True
        
        # 1. Contrôle montant vs BC (si BC fourni)
        if invoice.purchase_order_ref:
            # TODO: Vérification avec Wise Procure
            invoice.amount_check_passed = True
        
        # 2. Contrôle correspondance 3-way (Commande/Livraison/Facture)
        if invoice.purchase_order_ref and invoice.delivery_receipt_ref:
            invoice.po_match_passed = True
        
        # 3. Si tous contrôles OK, validation comptable automatique
        if (invoice.duplicate_check_passed and 
            invoice.amount_check_passed and 
            invoice.po_match_passed):
            
            invoice.accounting_validation = 'APPROVED'
            invoice.accounting_validation_date = timezone.now()
            invoice.status = 'APPROVED'
            
            # Génération écriture comptable automatique
            try:
                journal_entry = invoice.create_accounting_entry()
                invoice.status = 'ACCOUNTING_OK'
            except Exception as e:
                logger.error(f"Erreur comptabilisation {invoice.invoice_number}: {e}")
                invoice.accounting_validation = 'REJECTED'
                invoice.accounting_comments = str(e)
        
        invoice.save()
    
    @staticmethod
    def generate_payment_run(
        company,
        payment_date: date,
        max_amount: Optional[Decimal] = None,
        prioritize_discounts: bool = True
    ) -> Dict[str, Any]:
        """
        Génère une proposition de virement masse optimisée
        """
        with transaction.atomic():
            # Sélection des factures à payer
            invoices_query = SupplierInvoice.objects.filter(
                supplier__company=company,
                status='APPROVED',
                due_date__lte=payment_date + timedelta(days=7)  # Échéance dans 7j
            ).select_related('supplier')
            
            if prioritize_discounts:
                # Prioriser les escomptes rentables
                invoices_query = invoices_query.annotate(
                    discount_savings=F('amount_incl_tax') * F('supplier__early_payment_discount') / 100
                ).order_by('-discount_savings', 'due_date')
            else:
                invoices_query = invoices_query.order_by('due_date')
            
            # Sélection avec contrainte montant
            selected_invoices = []
            total_selected = Decimal('0')
            total_savings = Decimal('0')
            
            for invoice in invoices_query:
                invoice_amount = invoice.amount_incl_tax
                
                # Application escompte si paiement anticipé
                if (payment_date < invoice.due_date and 
                    invoice.supplier.early_payment_discount > 0):
                    discount = invoice_amount * invoice.supplier.early_payment_discount / 100
                    net_amount = invoice_amount - discount
                    total_savings += discount
                else:
                    net_amount = invoice_amount
                    discount = Decimal('0')
                
                # Vérification limite montant
                if max_amount and (total_selected + net_amount) > max_amount:
                    continue
                
                selected_invoices.append({
                    'invoice': invoice,
                    'gross_amount': invoice_amount,
                    'discount_amount': discount,
                    'net_amount': net_amount,
                })
                
                total_selected += net_amount
            
            # Regroupement par fournisseur
            supplier_payments = {}
            for item in selected_invoices:
                supplier_id = item['invoice'].supplier.id
                
                if supplier_id not in supplier_payments:
                    supplier_payments[supplier_id] = {
                        'supplier': item['invoice'].supplier,
                        'invoices': [],
                        'total_gross': Decimal('0'),
                        'total_discount': Decimal('0'),
                        'total_net': Decimal('0'),
                    }
                
                group = supplier_payments[supplier_id]
                group['invoices'].append(item['invoice'])
                group['total_gross'] += item['gross_amount']
                group['total_discount'] += item['discount_amount']
                group['total_net'] += item['net_amount']
            
            return {
                'payment_run_id': str(uuid.uuid4()),
                'payment_date': payment_date.isoformat(),
                'summary': {
                    'suppliers_count': len(supplier_payments),
                    'invoices_count': len(selected_invoices),
                    'total_gross': float(sum(item['gross_amount'] for item in selected_invoices)),
                    'total_discount': float(total_savings),
                    'total_net': float(total_selected),
                    'savings_rate': float(total_savings / sum(item['gross_amount'] for item in selected_invoices) * 100) if selected_invoices else 0,
                },
                'supplier_payments': [
                    {
                        'supplier_code': group['supplier'].code,
                        'supplier_name': group['supplier'].legal_name,
                        'iban': group['supplier'].iban,
                        'invoices_count': len(group['invoices']),
                        'total_amount': float(group['total_net']),
                        'discount_amount': float(group['total_discount']),
                        'invoices': [
                            {
                                'number': inv.invoice_number,
                                'date': inv.invoice_date.isoformat(),
                                'due_date': inv.due_date.isoformat(),
                                'amount': float(inv.amount_incl_tax),
                            }
                            for inv in group['invoices']
                        ]
                    }
                    for group in supplier_payments.values()
                ],
            }
    
    @staticmethod
    def evaluate_supplier_performance(
        supplier: Supplier,
        evaluation_data: Dict[str, Any],
        user=None
    ) -> SupplierEvaluation:
        """
        Évaluation performance fournisseur (EXF-CF-001)
        """
        with transaction.atomic():
            evaluation = SupplierEvaluation.objects.create(
                supplier=supplier,
                evaluator=user,
                **evaluation_data
            )
            
            # Mise à jour des scores dans le fournisseur
            # (géré automatiquement par le save() du modèle)
            
            # Recommandation automatique selon score global
            if evaluation.overall_score >= 90:
                evaluation.recommendation = 'DEVELOP'
            elif evaluation.overall_score >= 75:
                evaluation.recommendation = 'CONTINUE'
            elif evaluation.overall_score >= 60:
                evaluation.recommendation = 'MONITOR'
            elif evaluation.overall_score >= 40:
                evaluation.recommendation = 'REDUCE'
            else:
                evaluation.recommendation = 'TERMINATE'
            
            evaluation.save()
            
            return evaluation
    
    @staticmethod
    def get_supplier_analytics_summary(company) -> Dict[str, Any]:
        """
        Synthèse analytics fournisseurs pour dashboard
        """
        # Métriques globales
        suppliers = Supplier.objects.filter(company=company, status='ACTIVE')
        
        summary_stats = suppliers.aggregate(
            total_count=Count('id'),
            avg_performance=Avg('overall_performance'),
            avg_delivery_time=Avg('average_delivery_delay'),
            total_outstanding=Sum('current_outstanding') or Decimal('0'),
        )
        
        # Répartition par notation
        rating_distribution = suppliers.values('supplier_rating').annotate(
            count=Count('id'),
            total_amount=Sum('current_outstanding') or Decimal('0')
        ).order_by('supplier_rating')
        
        # Top performants et à risque
        top_performers = suppliers.filter(
            overall_performance__gte=85
        ).order_by('-overall_performance')[:5]
        
        poor_performers = suppliers.filter(
            overall_performance__lt=60
        ).order_by('overall_performance')[:5]
        
        # Alertes contrats
        contract_alerts = suppliers.filter(
            contract_end_date__lte=date.today() + timedelta(days=60),
            contract_end_date__isnull=False
        ).count()
        
        return {
            'global_metrics': {
                'active_suppliers': summary_stats['total_count'],
                'average_performance': float(summary_stats['avg_performance'] or 0),
                'average_delivery_days': float(summary_stats['avg_delivery_time'] or 0),
                'total_payables': float(summary_stats['total_outstanding']),
            },
            'rating_distribution': [
                {
                    'rating': item['supplier_rating'],
                    'count': item['count'],
                    'amount': float(item['total_amount']),
                }
                for item in rating_distribution
            ],
            'performance_highlights': {
                'top_performers': [
                    {
                        'code': s.code,
                        'name': s.legal_name,
                        'score': float(s.overall_performance),
                    }
                    for s in top_performers
                ],
                'requires_attention': [
                    {
                        'code': s.code,
                        'name': s.legal_name,
                        'score': float(s.overall_performance),
                    }
                    for s in poor_performers
                ],
            },
            'alerts': {
                'contract_expiring_soon': contract_alerts,
                'blocked_suppliers': suppliers.filter(status='BLOCKED').count(),
                'overdue_evaluations': SupplierService._count_overdue_evaluations(company),
            },
            'generated_at': timezone.now().isoformat(),
        }
    
    @staticmethod
    def _count_overdue_evaluations(company) -> int:
        """Compte les évaluations fournisseurs en retard"""
        # Fournisseurs sans évaluation depuis 6 mois
        six_months_ago = date.today() - timedelta(days=180)
        
        return Supplier.objects.filter(
            company=company,
            status='ACTIVE'
        ).annotate(
            last_evaluation=models.Max('evaluations__evaluation_date')
        ).filter(
            Q(last_evaluation__lt=six_months_ago) |
            Q(last_evaluation__isnull=True)
        ).count()
    
    @staticmethod
    def synchronize_with_wise_procure(company) -> Dict[str, Any]:
        """
        Synchronisation Temps Réel avec Wise Procure (EXF-CF-002)
        """
        # TODO: Implémentation réelle API Wise Procure
        # Pour l'instant simulation
        
        sync_stats = {
            'invoices_received': 0,
            'invoices_processed': 0,
            'invoices_errors': 0,
            'purchase_orders_updated': 0,
            'deliveries_confirmed': 0,
        }
        
        # Simulation réception de données
        logger.info(f"Synchronisation Wise Procure pour {company.name}")
        
        return {
            'sync_status': 'SUCCESS',
            'statistics': sync_stats,
            'last_sync': timezone.now().isoformat(),
            'next_sync': (timezone.now() + timedelta(minutes=5)).isoformat(),
        }
    
    @staticmethod
    def calculate_supplier_roi(
        supplier: Supplier,
        period_months: int = 12
    ) -> Dict[str, Any]:
        """
        Calcule le ROI d'un fournisseur
        """
        period_start = date.today() - timedelta(days=period_months * 30)
        
        # Montant total acheté
        total_purchased = SupplierInvoice.objects.filter(
            supplier=supplier,
            invoice_date__gte=period_start,
            status__in=['PAID', 'APPROVED']
        ).aggregate(
            total=Sum('amount_incl_tax') or Decimal('0')
        )['total']
        
        # Économies réalisées
        total_discounts = SupplierPayment.objects.filter(
            supplier=supplier,
            payment_date__gte=period_start,
            payment_type='EARLY_DISCOUNT'
        ).aggregate(
            savings=Sum('discount_amount') or Decimal('0')
        )['savings']
        
        # Coûts de gestion (estimation)
        management_costs = supplier.evaluations.filter(
            evaluation_date__gte=period_start
        ).count() * Decimal('50000')  # 50K par évaluation
        
        # ROI = (Économies - Coûts) / Volume * 100
        net_benefit = total_discounts - management_costs
        roi = float(net_benefit / total_purchased * 100) if total_purchased > 0 else 0
        
        return {
            'supplier_code': supplier.code,
            'period_months': period_months,
            'volume_purchased': float(total_purchased),
            'savings_achieved': float(total_discounts),
            'management_costs': float(management_costs),
            'net_benefit': float(net_benefit),
            'roi_percentage': roi,
            'recommendation': 'STRATEGIC' if roi > 5 else 'STANDARD' if roi > 0 else 'REVIEW',
        }