"""
Service moteur d'écriture comptable SYSCOHADA
Gestion avancée des écritures avec validation et performance optimisée
"""
from typing import List, Dict, Optional, Any
from django.db import transaction, connection
from django.core.exceptions import ValidationError
from django.core.cache import cache
from django.utils import timezone
from django.db.models import Sum, Q, F
from decimal import Decimal
import uuid
from datetime import date

from ..models import (
    Company, JournalEntry, JournalEntryLine, ChartOfAccounts, 
    Journal, FiscalYear
)
from .plan_comptable_service import PlanComptableService


class EcritureService:
    """
    Moteur d'écriture comptable ultra-performant
    Validation automatique et conformité SYSCOHADA
    """
    
    @staticmethod
    def create_journal_entry(
        company: Company,
        journal: Journal,
        fiscal_year: FiscalYear,
        entry_data: Dict[str, Any],
        lines_data: List[Dict[str, Any]],
        user=None,
        auto_validate: bool = False
    ) -> JournalEntry:
        """
        Crée une écriture comptable complète avec validation
        Performance optimisée et contrôles métier avancés
        """
        with transaction.atomic():
            # Validation préalable des données
            EcritureService._validate_entry_data(entry_data, lines_data, company)
            
            # Création de l'en-tête d'écriture
            entry = JournalEntry.objects.create(
                company=company,
                journal=journal,
                fiscal_year=fiscal_year,
                piece_number=entry_data.get('piece_number') or journal.get_next_number(),
                reference=entry_data.get('reference', ''),
                entry_date=entry_data['entry_date'],
                value_date=entry_data.get('value_date'),
                description=entry_data['description'],
                source_document=entry_data.get('source_document', ''),
            )
            
            # Création des lignes d'écriture
            entry_lines = []
            for line_number, line_data in enumerate(lines_data, 1):
                line = EcritureService._create_entry_line(
                    entry, line_data, line_number
                )
                entry_lines.append(line)
            
            # Insertion batch des lignes - Performance optimisée
            JournalEntryLine.objects.bulk_create(entry_lines)
            
            # Recalcul des totaux et vérification équilibrage
            entry.calculate_totals()
            entry.save()
            
            # Validation automatique si demandée
            if auto_validate and entry.is_balanced:
                EcritureService.validate_entry(entry, user)
            
            # Invalidation du cache des balances
            EcritureService._invalidate_balance_cache(company, entry_lines)
            
            return entry
    
    @staticmethod
    def _validate_entry_data(
        entry_data: Dict[str, Any], 
        lines_data: List[Dict[str, Any]], 
        company: Company
    ):
        """Validation complète des données d'écriture"""
        # Validation en-tête
        required_fields = ['entry_date', 'description']
        for field in required_fields:
            if not entry_data.get(field):
                raise ValidationError(f"Le champ '{field}' est obligatoire")
        
        # Validation des lignes
        if len(lines_data) < 2:
            raise ValidationError("Une écriture doit contenir au moins 2 lignes")
        
        total_debit = Decimal('0')
        total_credit = Decimal('0')
        
        for i, line in enumerate(lines_data):
            # Validation de base
            if not line.get('account_code'):
                raise ValidationError(f"Ligne {i+1}: Code compte obligatoire")
            
            # Vérification existence du compte
            try:
                account = ChartOfAccounts.objects.get(
                    company=company,
                    code=line['account_code'],
                    is_active=True
                )
                if not account.allow_direct_entry:
                    raise ValidationError(
                        f"Ligne {i+1}: Le compte {account.code} n'autorise pas la saisie directe"
                    )
            except ChartOfAccounts.DoesNotExist:
                raise ValidationError(f"Ligne {i+1}: Compte {line['account_code']} inexistant")
            
            # Montants
            debit = Decimal(str(line.get('debit_amount', 0)))
            credit = Decimal(str(line.get('credit_amount', 0)))
            
            if debit < 0 or credit < 0:
                raise ValidationError(f"Ligne {i+1}: Les montants ne peuvent pas être négatifs")
            
            if debit > 0 and credit > 0:
                raise ValidationError(f"Ligne {i+1}: Une ligne ne peut avoir débit ET crédit")
            
            if debit == 0 and credit == 0:
                raise ValidationError(f"Ligne {i+1}: Montant obligatoire (débit ou crédit)")
            
            total_debit += debit
            total_credit += credit
        
        # Vérification équilibrage
        if total_debit != total_credit:
            raise ValidationError(
                f"L'écriture n'est pas équilibrée: "
                f"Débit {total_debit} ≠ Crédit {total_credit}"
            )
    
    @staticmethod
    def _create_entry_line(
        entry: JournalEntry, 
        line_data: Dict[str, Any], 
        line_number: int
    ) -> JournalEntryLine:
        """Crée une ligne d'écriture avec toutes les métadonnées"""
        account = ChartOfAccounts.objects.get(
            company=entry.company,
            code=line_data['account_code']
        )
        
        return JournalEntryLine(
            entry=entry,
            account=account,
            debit_amount=Decimal(str(line_data.get('debit_amount', 0))),
            credit_amount=Decimal(str(line_data.get('credit_amount', 0))),
            label=line_data.get('label', entry.description),
            line_number=line_number,
            currency=line_data.get('currency', 'XAF'),
            currency_amount=line_data.get('currency_amount'),
            exchange_rate=line_data.get('exchange_rate'),
        )
    
    @staticmethod
    def validate_entry(entry: JournalEntry, user=None) -> JournalEntry:
        """
        Valide définitivement une écriture comptable
        Contrôles avancés et verrouillage
        """
        with transaction.atomic():
            # Vérifications préalables
            if entry.is_validated:
                raise ValidationError("Cette écriture est déjà validée")
            
            if not entry.is_balanced:
                raise ValidationError("L'écriture doit être équilibrée pour être validée")
            
            # Validation des contraintes métier
            EcritureService._validate_business_rules(entry)
            
            # Validation de l'exercice
            if entry.fiscal_year.is_closed:
                raise ValidationError("Impossible de valider sur un exercice clôturé")
            
            # Marquage comme validé
            entry.is_validated = True
            entry.validation_date = timezone.now()
            entry.validated_by = user
            entry.save()
            
            # Invalidation cache balances
            EcritureService._invalidate_balance_cache(
                entry.company, 
                entry.lines.all()
            )
            
            return entry
    
    @staticmethod
    def _validate_business_rules(entry: JournalEntry):
        """Validation des règles métier SYSCOHADA"""
        lines = entry.lines.all()
        
        for line in lines:
            account = line.account
            
            # Règles spécifiques par classe de compte
            if account.account_class == '1':  # Capitaux
                EcritureService._validate_capital_account_rules(line)
            elif account.account_class == '4':  # Tiers
                EcritureService._validate_third_party_rules(line)
            elif account.account_class == '5':  # Trésorerie
                EcritureService._validate_treasury_rules(line)
    
    @staticmethod
    def _validate_capital_account_rules(line: JournalEntryLine):
        """Validation des règles sur comptes de capitaux"""
        # Exemple : vérification cohérence sens/nature
        account = line.account
        if account.normal_balance == 'CREDIT' and line.debit_amount > line.credit_amount:
            # Alert pour transaction inhabituelle mais pas blocant
            pass
    
    @staticmethod
    def _validate_third_party_rules(line: JournalEntryLine):
        """Validation des règles sur comptes de tiers"""
        # Pour les comptes clients/fournisseurs, tiers souvent obligatoire
        account = line.account
        if account.code.startswith(('401', '411')) and not hasattr(line, 'third_party'):
            # Info: recommandation d'avoir un tiers mais pas obligatoire
            pass
    
    @staticmethod
    def _validate_treasury_rules(line: JournalEntryLine):
        """Validation des règles sur comptes de trésorerie"""
        # Vérification solde suffisant pour débits caisse/banque
        account = line.account
        if account.code.startswith(('52', '57')) and line.debit_amount > 0:
            # Calcul du solde avant cette écriture
            current_balance = PlanComptableService.get_account_balance(
                account, 
                line.entry.fiscal_year,
                line.entry.entry_date
            )
            if current_balance + line.debit_amount - line.credit_amount < 0:
                # Warning mais pas bloquant - à gérer selon politique entreprise
                pass
    
    @staticmethod
    def update_entry(
        entry: JournalEntry, 
        entry_data: Dict[str, Any], 
        lines_data: List[Dict[str, Any]],
        user=None
    ) -> JournalEntry:
        """
        Met à jour une écriture comptable
        Possible uniquement si non validée
        """
        if entry.is_validated:
            raise ValidationError("Impossible de modifier une écriture validée")
        
        with transaction.atomic():
            # Sauvegarde des anciennes lignes pour invalidation cache
            old_lines = list(entry.lines.all())
            
            # Validation des nouvelles données
            EcritureService._validate_entry_data(entry_data, lines_data, entry.company)
            
            # Mise à jour en-tête
            for field, value in entry_data.items():
                if hasattr(entry, field) and field not in ['id', 'piece_number']:
                    setattr(entry, field, value)
            
            # Suppression anciennes lignes
            entry.lines.all().delete()
            
            # Création nouvelles lignes
            new_lines = []
            for line_number, line_data in enumerate(lines_data, 1):
                line = EcritureService._create_entry_line(
                    entry, line_data, line_number
                )
                new_lines.append(line)
            
            # Insertion batch
            JournalEntryLine.objects.bulk_create(new_lines)
            
            # Recalcul totaux
            entry.calculate_totals()
            entry.save()
            
            # Invalidation cache (anciennes + nouvelles lignes)
            all_lines = old_lines + new_lines
            EcritureService._invalidate_balance_cache(entry.company, all_lines)
            
            return entry
    
    @staticmethod
    def delete_entry(entry: JournalEntry, user=None) -> bool:
        """
        Supprime une écriture comptable
        Possible uniquement si non validée
        """
        if entry.is_validated:
            raise ValidationError("Impossible de supprimer une écriture validée")
        
        with transaction.atomic():
            # Sauvegarde des lignes pour invalidation cache
            lines = list(entry.lines.all())
            
            # Suppression
            entry.delete()
            
            # Invalidation cache
            EcritureService._invalidate_balance_cache(entry.company, lines)
            
            return True
    
    @staticmethod
    def duplicate_entry(
        entry: JournalEntry, 
        new_date: date, 
        new_description: str = None
    ) -> JournalEntry:
        """Duplique une écriture avec nouvelle date"""
        lines_data = []
        for line in entry.lines.all():
            lines_data.append({
                'account_code': line.account.code,
                'debit_amount': line.debit_amount,
                'credit_amount': line.credit_amount,
                'label': line.label,
                'currency': line.currency,
                'currency_amount': line.currency_amount,
                'exchange_rate': line.exchange_rate,
            })
        
        entry_data = {
            'entry_date': new_date,
            'description': new_description or f"Copie de {entry.description}",
            'reference': entry.reference,
            'source_document': entry.source_document,
        }
        
        return EcritureService.create_journal_entry(
            company=entry.company,
            journal=entry.journal,
            fiscal_year=entry.fiscal_year,
            entry_data=entry_data,
            lines_data=lines_data
        )
    
    @staticmethod
    def get_account_ledger(
        account: ChartOfAccounts,
        fiscal_year: FiscalYear,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        include_unvalidated: bool = False
    ) -> Dict[str, Any]:
        """
        Génère le grand livre d'un compte avec performance optimisée
        """
        # Clé de cache
        cache_key = f"ledger_{account.id}_{fiscal_year.id}_{date_from}_{date_to}_{include_unvalidated}"
        
        # Vérification cache (10 minutes)
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        # Construction requête optimisée
        query = Q(
            account=account,
            entry__fiscal_year=fiscal_year
        )
        
        if not include_unvalidated:
            query &= Q(entry__is_validated=True)
        
        if date_from:
            query &= Q(entry__entry_date__gte=date_from)
        
        if date_to:
            query &= Q(entry__entry_date__lte=date_to)
        
        # Requête avec prefetch pour performance
        lines = JournalEntryLine.objects.filter(query).select_related(
            'entry', 'entry__journal'
        ).order_by('entry__entry_date', 'entry__piece_number', 'line_number')
        
        # Calcul solde initial
        initial_balance = Decimal('0')
        if date_from:
            initial_query = Q(
                account=account,
                entry__fiscal_year=fiscal_year,
                entry__entry_date__lt=date_from
            )
            if not include_unvalidated:
                initial_query &= Q(entry__is_validated=True)
            
            initial_agg = JournalEntryLine.objects.filter(initial_query).aggregate(
                total_debit=Sum('debit_amount') or Decimal('0'),
                total_credit=Sum('credit_amount') or Decimal('0')
            )
            initial_balance = initial_agg['total_debit'] - initial_agg['total_credit']
        
        # Construction du grand livre
        ledger_lines = []
        running_balance = initial_balance
        
        for line in lines:
            movement = line.debit_amount - line.credit_amount
            running_balance += movement
            
            ledger_lines.append({
                'date': line.entry.entry_date.isoformat(),
                'piece_number': line.entry.piece_number,
                'journal_code': line.entry.journal.code,
                'description': line.label,
                'reference': line.entry.reference,
                'debit': float(line.debit_amount),
                'credit': float(line.credit_amount),
                'balance': float(running_balance),
                'is_validated': line.entry.is_validated,
                'reconciliation_code': line.reconciliation_code,
                'currency': line.currency,
                'currency_amount': float(line.currency_amount) if line.currency_amount else None,
            })
        
        result = {
            'account': {
                'code': account.code,
                'name': account.name,
                'normal_balance': account.normal_balance,
            },
            'period': {
                'fiscal_year': fiscal_year.name,
                'date_from': date_from.isoformat() if date_from else None,
                'date_to': date_to.isoformat() if date_to else None,
            },
            'initial_balance': float(initial_balance),
            'final_balance': float(running_balance),
            'total_debit': float(sum(l['debit'] for l in ledger_lines)),
            'total_credit': float(sum(l['credit'] for l in ledger_lines)),
            'lines_count': len(ledger_lines),
            'lines': ledger_lines,
        }
        
        # Mise en cache (10 minutes)
        cache.set(cache_key, result, 600)
        
        return result
    
    @staticmethod
    def get_trial_balance(
        company: Company,
        fiscal_year: FiscalYear,
        as_of_date: Optional[date] = None,
        include_zero_balances: bool = False
    ) -> Dict[str, Any]:
        """
        Génère la balance comptable avec performance ultra-optimisée
        Requête SQL optimisée pour gros volumes
        """
        # Clé de cache unique
        cache_key = f"trial_balance_{company.id}_{fiscal_year.id}_{as_of_date}_{include_zero_balances}"
        
        # Vérification cache (15 minutes)
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        # Requête SQL optimisée directe pour performance maximale
        sql = """
        WITH account_totals AS (
            SELECT 
                ca.id as account_id,
                ca.code,
                ca.name,
                ca.account_class,
                ca.normal_balance,
                COALESCE(SUM(jel.debit_amount), 0) as total_debit,
                COALESCE(SUM(jel.credit_amount), 0) as total_credit
            FROM accounting_chartofaccounts ca
            LEFT JOIN accounting_journalentryline jel 
                ON ca.id = jel.account_id
                AND jel.entry_id IN (
                    SELECT je.id 
                    FROM accounting_journalentry je 
                    WHERE je.company_id = %s 
                    AND je.fiscal_year_id = %s
                    AND je.is_validated = true
                    {date_filter}
                )
            WHERE ca.company_id = %s 
            AND ca.is_active = true
            GROUP BY ca.id, ca.code, ca.name, ca.account_class, ca.normal_balance
        )
        SELECT 
            code,
            name,
            account_class,
            normal_balance,
            total_debit,
            total_credit,
            CASE 
                WHEN normal_balance = 'DEBIT' THEN total_debit - total_credit
                ELSE total_credit - total_debit
            END as balance
        FROM account_totals
        {balance_filter}
        ORDER BY code
        """
        
        # Construction des filtres conditionnels
        date_filter = ""
        if as_of_date:
            date_filter = "AND je.entry_date <= %s"
        
        balance_filter = ""
        if not include_zero_balances:
            balance_filter = "HAVING (total_debit - total_credit) != 0"
        
        final_sql = sql.format(date_filter=date_filter, balance_filter=balance_filter)
        
        # Paramètres de la requête
        params = [company.id, fiscal_year.id, company.id]
        if as_of_date:
            params.insert(2, as_of_date)
        
        # Exécution requête optimisée
        with connection.cursor() as cursor:
            cursor.execute(final_sql, params)
            columns = [col[0] for col in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        # Calcul des totaux
        total_debit = sum(Decimal(str(row['total_debit'])) for row in results)
        total_credit = sum(Decimal(str(row['total_credit'])) for row in results)
        
        # Formatage du résultat
        balance_data = {
            'company': company.name,
            'fiscal_year': fiscal_year.name,
            'as_of_date': as_of_date.isoformat() if as_of_date else None,
            'generated_at': timezone.now().isoformat(),
            'total_accounts': len(results),
            'total_debit': float(total_debit),
            'total_credit': float(total_credit),
            'is_balanced': total_debit == total_credit,
            'accounts': [
                {
                    'code': row['code'],
                    'name': row['name'],
                    'class': row['account_class'],
                    'normal_balance': row['normal_balance'],
                    'debit': float(row['total_debit']),
                    'credit': float(row['total_credit']),
                    'balance': float(row['balance']),
                    'balance_formatted': f"{row['balance']:,.0f}",
                }
                for row in results
            ]
        }
        
        # Mise en cache (15 minutes)
        cache.set(cache_key, balance_data, 900)
        
        return balance_data
    
    @staticmethod
    def _invalidate_balance_cache(company: Company, lines: List[JournalEntryLine]):
        """Invalide le cache des balances affectées"""
        # Pattern des clés de cache à invalider
        cache_patterns = [
            f"balance_{company.id}_*",
            f"trial_balance_{company.id}_*",
            f"ledger_*",
        ]
        
        # Invalidation spécifique par compte
        for line in lines:
            cache.delete_many([
                f"balance_{line.account.id}_*",
                f"ledger_{line.account.id}_*",
            ])
    
    @staticmethod
    def get_entry_templates(company: Company, journal: Optional[Journal] = None) -> List[Dict]:
        """
        Récupère les modèles d'écriture pour saisie rapide
        """
        # Templates courants pour démarrage
        templates = [
            {
                'name': 'Vente avec TVA',
                'description': 'Vente de marchandises avec TVA 19.25%',
                'lines': [
                    {'account_code': '411', 'debit_amount': 1192.5, 'label': 'Client'},
                    {'account_code': '701', 'credit_amount': 1000, 'label': 'Ventes'},
                    {'account_code': '443', 'credit_amount': 192.5, 'label': 'TVA collectée'},
                ]
            },
            {
                'name': 'Achat avec TVA',
                'description': 'Achat de marchandises avec TVA déductible',
                'lines': [
                    {'account_code': '601', 'debit_amount': 1000, 'label': 'Achats'},
                    {'account_code': '445', 'debit_amount': 192.5, 'label': 'TVA déductible'},
                    {'account_code': '401', 'credit_amount': 1192.5, 'label': 'Fournisseur'},
                ]
            },
            {
                'name': 'Paiement fournisseur',
                'description': 'Règlement fournisseur par banque',
                'lines': [
                    {'account_code': '401', 'debit_amount': 1000, 'label': 'Fournisseur'},
                    {'account_code': '521', 'credit_amount': 1000, 'label': 'Banque'},
                ]
            },
            {
                'name': 'Encaissement client',
                'description': 'Encaissement client par banque',
                'lines': [
                    {'account_code': '521', 'debit_amount': 1000, 'label': 'Banque'},
                    {'account_code': '411', 'credit_amount': 1000, 'label': 'Client'},
                ]
            },
        ]
        
        return templates
    
    @staticmethod
    def get_performance_metrics(company: Company, fiscal_year: FiscalYear) -> Dict[str, Any]:
        """
        Métriques de performance du moteur comptable
        """
        with connection.cursor() as cursor:
            # Statistiques d'utilisation
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_entries,
                    COUNT(CASE WHEN is_validated THEN 1 END) as validated_entries,
                    COUNT(DISTINCT journal_id) as journals_used,
                    SUM(total_debit) as total_amount,
                    AVG(total_debit) as avg_entry_amount,
                    MIN(entry_date) as first_entry_date,
                    MAX(entry_date) as last_entry_date
                FROM accounting_journalentry
                WHERE company_id = %s AND fiscal_year_id = %s
            """, [company.id, fiscal_year.id])
            
            stats = dict(zip(
                ['total_entries', 'validated_entries', 'journals_used', 
                 'total_amount', 'avg_entry_amount', 'first_entry_date', 'last_entry_date'],
                cursor.fetchone()
            ))
            
            # Répartition par journal
            cursor.execute("""
                SELECT j.code, j.name, COUNT(*) as entry_count
                FROM accounting_journalentry je
                JOIN accounting_journal j ON je.journal_id = j.id
                WHERE je.company_id = %s AND je.fiscal_year_id = %s
                GROUP BY j.code, j.name
                ORDER BY entry_count DESC
            """, [company.id, fiscal_year.id])
            
            journals = [
                dict(zip(['code', 'name', 'entry_count'], row))
                for row in cursor.fetchall()
            ]
            
            return {
                'statistics': stats,
                'journals_usage': journals,
                'validation_rate': (
                    (stats['validated_entries'] / stats['total_entries'] * 100)
                    if stats['total_entries'] > 0 else 0
                )
            }