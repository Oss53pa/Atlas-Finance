"""
Service de validation comptable avancé SYSCOHADA
Contrôles de cohérence et validation métier automatisée
"""
from typing import List, Dict, Optional, Any, Tuple
from django.core.exceptions import ValidationError
from django.db.models import Q, Sum, Count, F
from django.utils import timezone
from decimal import Decimal
from datetime import date, datetime
import re

from ..models import (
    Company, JournalEntry, JournalEntryLine, ChartOfAccounts, 
    Journal, FiscalYear
)


class ValidationService:
    """
    Système de validation comptable intelligent
    Conformité SYSCOHADA et détection d'anomalies avancée
    """
    
    # Règles de validation SYSCOHADA
    SYSCOHADA_RULES = {
        'account_code_pattern': r'^[1-9]\d{0,8}$',
        'max_account_length': 9,
        'required_classes': ['1', '2', '3', '4', '5', '6', '7'],
        'reconcilable_classes': ['4', '5'],  # Tiers et trésorerie
        'detail_account_min_length': 3,
    }
    
    # Montants limites par nature d'opération
    AMOUNT_THRESHOLDS = {
        'HIGH_AMOUNT': Decimal('10000000'),  # 10M XAF
        'UNUSUAL_PATTERN': Decimal('100000'),  # 100K XAF
        'CASH_LIMIT': Decimal('500000'),      # 500K XAF limite espèces
    }
    
    @staticmethod
    def validate_company_setup(company: Company) -> Dict[str, Any]:
        """
        Validation complète de la configuration d'entreprise
        Contrôles conformité SYSCOHADA
        """
        errors = []
        warnings = []
        recommendations = []
        
        # Validation données légales obligatoires
        if not company.rccm:
            errors.append("RCCM obligatoire pour entreprises OHADA")
        
        if not company.nif:
            warnings.append("NIF recommandé pour conformité fiscale")
        
        if not company.taxpayer_number:
            warnings.append("Numéro contribuable recommandé")
        
        # Validation configuration comptable
        if company.syscohada_system not in ['NORMAL', 'MINIMAL', 'ALLEGE']:
            errors.append("Système SYSCOHADA invalide")
        
        if company.account_length not in [6, 7, 8, 9]:
            errors.append("Longueur des comptes doit être entre 6 et 9 positions")
        
        # Vérification devise
        ohada_currencies = ['XAF', 'XOF']  # Francs CFA
        if company.currency not in ohada_currencies:
            warnings.append(f"Devise {company.currency} non OHADA - vérifier conformité")
        
        # Vérification plan comptable existant
        accounts_count = ChartOfAccounts.objects.filter(company=company).count()
        if accounts_count == 0:
            errors.append("Aucun plan comptable configuré")
        elif accounts_count < 20:
            warnings.append("Plan comptable semble incomplet")
        
        # Recommandations d'optimisation
        if not company.fiscal_years.exists():
            recommendations.append("Créer l'exercice comptable initial")
        
        if not company.journals.exists():
            recommendations.append("Configurer les journaux comptables standards")
        
        return {
            'is_valid': len(errors) == 0,
            'score': ValidationService._calculate_setup_score(company, errors, warnings),
            'errors': errors,
            'warnings': warnings,
            'recommendations': recommendations,
            'checks_performed': datetime.now().isoformat(),
        }
    
    @staticmethod
    def validate_chart_of_accounts(company: Company) -> Dict[str, Any]:
        """
        Validation complète du plan comptable SYSCOHADA
        Contrôles de cohérence et conformité
        """
        errors = []
        warnings = []
        stats = {}
        
        accounts = ChartOfAccounts.objects.filter(company=company)
        
        # Statistiques générales
        stats['total_accounts'] = accounts.count()
        stats['active_accounts'] = accounts.filter(is_active=True).count()
        
        # Vérification par classe obligatoire
        required_classes = ValidationService.SYSCOHADA_RULES['required_classes']
        for class_code in required_classes:
            class_accounts = accounts.filter(account_class=class_code)
            stats[f'class_{class_code}_count'] = class_accounts.count()
            
            if class_accounts.count() == 0:
                errors.append(f"Classe {class_code} manquante - obligatoire SYSCOHADA")
            elif class_accounts.count() < 3:
                warnings.append(f"Classe {class_code} semble incomplète")
        
        # Validation des codes comptes
        invalid_codes = []
        duplicate_codes = []
        
        for account in accounts:
            # Format du code
            if not re.match(ValidationService.SYSCOHADA_RULES['account_code_pattern'], account.code):
                invalid_codes.append(account.code)
            
            # Longueur maximale
            if len(account.code) > company.account_length:
                errors.append(f"Compte {account.code}: longueur > {company.account_length}")
            
            # Unicité
            duplicates = accounts.filter(code=account.code).count()
            if duplicates > 1 and account.code not in duplicate_codes:
                duplicate_codes.append(account.code)
        
        if invalid_codes:
            errors.extend([f"Code invalide: {code}" for code in invalid_codes])
        
        if duplicate_codes:
            errors.extend([f"Code dupliqué: {code}" for code in duplicate_codes])
        
        # Validation hiérarchie
        hierarchy_issues = ValidationService._validate_account_hierarchy(company)
        if hierarchy_issues:
            warnings.extend(hierarchy_issues)
        
        # Comptes obligatoires SYSCOHADA
        mandatory_accounts = ValidationService._get_mandatory_syscohada_accounts()
        missing_mandatory = []
        
        for code in mandatory_accounts:
            if not accounts.filter(code=code).exists():
                missing_mandatory.append(code)
        
        if missing_mandatory:
            warnings.extend([f"Compte obligatoire manquant: {code}" for code in missing_mandatory])
        
        return {
            'is_valid': len(errors) == 0,
            'conformity_score': ValidationService._calculate_conformity_score(stats, errors, warnings),
            'statistics': stats,
            'errors': errors,
            'warnings': warnings,
            'mandatory_missing': missing_mandatory,
            'validation_date': datetime.now().isoformat(),
        }
    
    @staticmethod
    def validate_journal_entry_batch(
        entries: List[JournalEntry],
        strict_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Validation en lot d'écritures comptables
        Performance optimisée pour gros volumes
        """
        validation_results = []
        global_errors = []
        global_warnings = []
        
        # Statistiques globales
        total_entries = len(entries)
        valid_count = 0
        warning_count = 0
        error_count = 0
        
        for entry in entries:
            try:
                entry_validation = ValidationService.validate_single_entry(entry, strict_mode)
                validation_results.append({
                    'entry_id': str(entry.id),
                    'piece_number': entry.piece_number,
                    'validation': entry_validation
                })
                
                if entry_validation['is_valid']:
                    valid_count += 1
                elif entry_validation.get('warnings'):
                    warning_count += 1
                else:
                    error_count += 1
                    
            except Exception as e:
                error_count += 1
                validation_results.append({
                    'entry_id': str(entry.id),
                    'piece_number': entry.piece_number,
                    'validation': {
                        'is_valid': False,
                        'errors': [str(e)],
                        'warnings': []
                    }
                })
        
        # Validation croisée des écritures
        cross_validation = ValidationService._cross_validate_entries(entries)
        if cross_validation['issues']:
            global_warnings.extend(cross_validation['issues'])
        
        return {
            'summary': {
                'total_entries': total_entries,
                'valid_entries': valid_count,
                'entries_with_warnings': warning_count,
                'entries_with_errors': error_count,
                'success_rate': (valid_count / total_entries * 100) if total_entries > 0 else 0,
            },
            'global_issues': {
                'errors': global_errors,
                'warnings': global_warnings,
            },
            'entries_details': validation_results,
            'validation_timestamp': datetime.now().isoformat(),
        }
    
    @staticmethod
    def validate_single_entry(
        entry: JournalEntry, 
        strict_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Validation approfondie d'une écriture comptable
        """
        errors = []
        warnings = []
        performance_metrics = {}
        
        # Chronométrage validation
        start_time = timezone.now()
        
        # 1. Validation équilibrage (obligatoire)
        if not entry.is_balanced:
            errors.append(f"Écriture non équilibrée: {entry.total_debit} vs {entry.total_credit}")
        
        # 2. Validation nombre de lignes minimum
        lines_count = entry.lines.count()
        if lines_count < 2:
            errors.append("Minimum 2 lignes obligatoire")
        
        # 3. Validation des lignes individuelles
        for line in entry.lines.all():
            line_validation = ValidationService._validate_entry_line(line, strict_mode)
            if line_validation['errors']:
                errors.extend([f"Ligne {line.line_number}: {err}" for err in line_validation['errors']])
            if line_validation['warnings']:
                warnings.extend([f"Ligne {line.line_number}: {warn}" for warn in line_validation['warnings']])
        
        # 4. Validation métier selon type de journal
        business_validation = ValidationService._validate_business_logic(entry)
        errors.extend(business_validation['errors'])
        warnings.extend(business_validation['warnings'])
        
        # 5. Détection d'anomalies et patterns suspects
        if strict_mode:
            anomaly_detection = ValidationService._detect_anomalies(entry)
            warnings.extend(anomaly_detection['anomalies'])
        
        # 6. Validation exercice et période
        fiscal_validation = ValidationService._validate_fiscal_period(entry)
        errors.extend(fiscal_validation['errors'])
        warnings.extend(fiscal_validation['warnings'])
        
        # Calcul temps de validation
        end_time = timezone.now()
        performance_metrics['validation_time_ms'] = int((end_time - start_time).total_seconds() * 1000)
        
        return {
            'is_valid': len(errors) == 0,
            'severity': 'ERROR' if errors else 'WARNING' if warnings else 'OK',
            'errors': errors,
            'warnings': warnings,
            'performance': performance_metrics,
            'validated_at': end_time.isoformat(),
        }
    
    @staticmethod
    def _validate_entry_line(
        line: JournalEntryLine, 
        strict_mode: bool = False
    ) -> Dict[str, Any]:
        """Validation d'une ligne d'écriture individuelle"""
        errors = []
        warnings = []
        
        # Validation compte
        account = line.account
        
        # 1. Compte autorise saisie directe
        if not account.allow_direct_entry:
            errors.append(f"Compte {account.code} n'autorise pas la saisie directe")
        
        # 2. Validation montants
        if line.debit_amount < 0 or line.credit_amount < 0:
            errors.append("Montants négatifs interdits")
        
        if line.debit_amount > 0 and line.credit_amount > 0:
            errors.append("Débit ET crédit sur même ligne interdit")
        
        if line.debit_amount == 0 and line.credit_amount == 0:
            errors.append("Montant obligatoire (débit OU crédit)")
        
        # 3. Validation sens selon nature du compte
        total_amount = line.debit_amount + line.credit_amount
        
        if account.normal_balance == 'DEBIT' and line.credit_amount > line.debit_amount:
            if strict_mode:
                warnings.append(f"Crédit inhabituel sur compte débiteur {account.code}")
        
        if account.normal_balance == 'CREDIT' and line.debit_amount > line.credit_amount:
            if strict_mode:
                warnings.append(f"Débit inhabituel sur compte créditeur {account.code}")
        
        # 4. Validation montants élevés
        if total_amount > ValidationService.AMOUNT_THRESHOLDS['HIGH_AMOUNT']:
            warnings.append(f"Montant très élevé: {total_amount:,.0f}")
        
        # 5. Validation espèces (limite légale)
        if (account.code.startswith('57') and 
            total_amount > ValidationService.AMOUNT_THRESHOLDS['CASH_LIMIT']):
            warnings.append(f"Montant espèces > limite légale: {total_amount:,.0f}")
        
        # 6. Validation tiers sur comptes collectifs
        if (account.code.startswith(('401', '411', '421')) and 
            hasattr(line, 'third_party') and not line.third_party):
            warnings.append(f"Tiers recommandé sur compte collectif {account.code}")
        
        # 7. Validation libellé
        if len(line.label.strip()) < 3:
            warnings.append("Libellé trop court (minimum 3 caractères)")
        
        return {
            'errors': errors,
            'warnings': warnings,
        }
    
    @staticmethod
    def _validate_business_logic(entry: JournalEntry) -> Dict[str, Any]:
        """Validation des règles métier selon le type de journal"""
        errors = []
        warnings = []
        
        journal_type = entry.journal.journal_type
        lines = entry.lines.all()
        
        # Règles spécifiques par type de journal
        if journal_type == 'VE':  # Ventes
            validation = ValidationService._validate_sales_entry(lines)
        elif journal_type == 'AC':  # Achats
            validation = ValidationService._validate_purchase_entry(lines)
        elif journal_type == 'BQ':  # Banque
            validation = ValidationService._validate_bank_entry(lines)
        elif journal_type == 'CA':  # Caisse
            validation = ValidationService._validate_cash_entry(lines)
        else:  # OD, autres
            validation = ValidationService._validate_general_entry(lines)
        
        errors.extend(validation.get('errors', []))
        warnings.extend(validation.get('warnings', []))
        
        # Validation TVA cohérente
        tva_validation = ValidationService._validate_vat_consistency(lines)
        warnings.extend(tva_validation.get('warnings', []))
        
        return {'errors': errors, 'warnings': warnings}
    
    @staticmethod
    def _validate_sales_entry(lines: List[JournalEntryLine]) -> Dict[str, Any]:
        """Validation spécifique écritures de vente"""
        warnings = []
        
        # Vérification présence compte client
        has_customer = any(line.account.code.startswith('41') for line in lines)
        if not has_customer:
            warnings.append("Pas de compte client détecté")
        
        # Vérification compte produit
        has_product = any(line.account.code.startswith('7') for line in lines)
        if not has_product:
            warnings.append("Pas de compte produit détecté")
        
        return {'warnings': warnings}
    
    @staticmethod
    def _validate_purchase_entry(lines: List[JournalEntryLine]) -> Dict[str, Any]:
        """Validation spécifique écritures d'achat"""
        warnings = []
        
        # Vérification présence compte fournisseur
        has_supplier = any(line.account.code.startswith('40') for line in lines)
        if not has_supplier:
            warnings.append("Pas de compte fournisseur détecté")
        
        # Vérification compte charge
        has_expense = any(line.account.code.startswith('6') for line in lines)
        if not has_expense:
            warnings.append("Pas de compte charge détecté")
        
        return {'warnings': warnings}
    
    @staticmethod
    def _validate_bank_entry(lines: List[JournalEntryLine]) -> Dict[str, Any]:
        """Validation spécifique écritures de banque"""
        warnings = []
        
        # Vérification présence compte banque
        bank_lines = [line for line in lines if line.account.code.startswith('52')]
        if not bank_lines:
            warnings.append("Pas de compte banque détecté dans journal BQ")
        elif len(bank_lines) > 1:
            warnings.append("Plusieurs comptes banque dans même écriture")
        
        return {'warnings': warnings}
    
    @staticmethod
    def _validate_cash_entry(lines: List[JournalEntryLine]) -> Dict[str, Any]:
        """Validation spécifique écritures de caisse"""
        warnings = []
        errors = []
        
        # Vérification présence compte caisse
        cash_lines = [line for line in lines if line.account.code.startswith('57')]
        if not cash_lines:
            errors.append("Pas de compte caisse détecté dans journal CA")
        
        # Vérification limite espèces
        for line in cash_lines:
            amount = line.debit_amount + line.credit_amount
            if amount > ValidationService.AMOUNT_THRESHOLDS['CASH_LIMIT']:
                warnings.append(f"Montant espèces élevé: {amount:,.0f}")
        
        return {'errors': errors, 'warnings': warnings}
    
    @staticmethod
    def _validate_general_entry(lines: List[JournalEntryLine]) -> Dict[str, Any]:
        """Validation écritures diverses"""
        warnings = []
        
        # Validation générique - cohérence des comptes utilisés
        classes_used = set(line.account.account_class for line in lines)
        
        # Alert si mix inhabituel de classes
        if '5' in classes_used and '6' in classes_used and '7' in classes_used:
            warnings.append("Mix inhabituel trésorerie + charges + produits")
        
        return {'warnings': warnings}
    
    @staticmethod
    def _validate_vat_consistency(lines: List[JournalEntryLine]) -> Dict[str, Any]:
        """Validation cohérence TVA"""
        warnings = []
        
        # Recherche lignes TVA
        tva_collectee = sum(
            line.credit_amount for line in lines 
            if line.account.code.startswith('443')
        )
        
        tva_deductible = sum(
            line.debit_amount for line in lines 
            if line.account.code.startswith('445')
        )
        
        # Calcul base HT
        ht_amount = 0
        for line in lines:
            if (line.account.code.startswith(('6', '7')) and 
                not line.account.code.startswith(('443', '445'))):
                ht_amount += line.debit_amount + line.credit_amount
        
        # Vérification taux TVA (19.25% standard CEMAC)
        if tva_collectee > 0:
            base_calculee = tva_collectee / Decimal('0.1925')
            if abs(base_calculee - ht_amount) > Decimal('1'):  # Tolérance 1 XAF
                warnings.append(f"TVA incohérente: base {ht_amount} vs calculée {base_calculee}")
        
        if tva_deductible > 0:
            base_calculee = tva_deductible / Decimal('0.1925')
            if abs(base_calculee - ht_amount) > Decimal('1'):
                warnings.append(f"TVA déductible incohérente: base {ht_amount} vs calculée {base_calculee}")
        
        return {'warnings': warnings}
    
    @staticmethod
    def _validate_fiscal_period(entry: JournalEntry) -> Dict[str, Any]:
        """Validation exercice et période comptable"""
        errors = []
        warnings = []
        
        # Validation exercice ouvert
        if entry.fiscal_year.is_closed:
            errors.append("Exercice comptable clôturé")
        
        # Validation cohérence date
        if not (entry.fiscal_year.start_date <= entry.entry_date <= entry.fiscal_year.end_date):
            errors.append("Date écriture hors exercice comptable")
        
        # Validation date future
        if entry.entry_date > date.today():
            warnings.append("Date écriture dans le futur")
        
        # Validation antériorité excessive
        days_old = (date.today() - entry.entry_date).days
        if days_old > 365:
            warnings.append(f"Écriture très ancienne: {days_old} jours")
        
        return {'errors': errors, 'warnings': warnings}
    
    @staticmethod
    def _detect_anomalies(entry: JournalEntry) -> Dict[str, Any]:
        """Détection d'anomalies avancée avec ML patterns"""
        anomalies = []
        
        # 1. Détection patterns inhabituels
        lines = entry.lines.all()
        
        # Montants ronds suspects
        round_amounts = [
            line for line in lines 
            if (line.debit_amount + line.credit_amount) % 1000 == 0
        ]
        
        if len(round_amounts) == len(lines) and len(lines) > 2:
            anomalies.append("Tous montants ronds - pattern inhabituel")
        
        # 2. Fréquence d'utilisation des comptes
        for line in lines:
            recent_usage = JournalEntryLine.objects.filter(
                account=line.account,
                entry__entry_date__gte=entry.entry_date - timezone.timedelta(days=90)
            ).count()
            
            if recent_usage == 0:
                anomalies.append(f"Compte {line.account.code} jamais utilisé récemment")
        
        # 3. Analyse des libellés
        if len(set(line.label for line in lines)) == 1:
            anomalies.append("Tous libellés identiques")
        
        # 4. Validation seuils inhabituels
        max_amount = max(
            line.debit_amount + line.credit_amount for line in lines
        )
        
        if max_amount > ValidationService.AMOUNT_THRESHOLDS['UNUSUAL_PATTERN']:
            # Comparaison avec historique du journal
            journal_avg = ValidationService._get_journal_average_amount(entry.journal)
            if journal_avg and max_amount > journal_avg * 10:
                anomalies.append(f"Montant inhabituel pour ce journal: {max_amount:,.0f}")
        
        return {'anomalies': anomalies}
    
    @staticmethod
    def _cross_validate_entries(entries: List[JournalEntry]) -> Dict[str, Any]:
        """Validation croisée entre écritures du lot"""
        issues = []
        
        # Détection doublons potentiels
        seen_signatures = {}
        
        for entry in entries:
            # Signature basée sur: date + montant total + premier compte
            first_account = entry.lines.first()
            signature = (
                entry.entry_date,
                entry.total_debit,
                first_account.account.code if first_account else None
            )
            
            if signature in seen_signatures:
                issues.append(
                    f"Doublon potentiel: {entry.piece_number} et {seen_signatures[signature]}"
                )
            else:
                seen_signatures[signature] = entry.piece_number
        
        return {'issues': issues}
    
    @staticmethod
    def _get_journal_average_amount(journal: Journal) -> Optional[Decimal]:
        """Calcule le montant moyen d'un journal sur 3 mois"""
        three_months_ago = date.today() - timezone.timedelta(days=90)
        
        avg_result = JournalEntry.objects.filter(
            journal=journal,
            entry_date__gte=three_months_ago,
            is_validated=True
        ).aggregate(
            avg_amount=Sum('total_debit') / Count('id')
        )
        
        return avg_result.get('avg_amount')
    
    @staticmethod
    def _validate_account_hierarchy(company: Company) -> List[str]:
        """Validation cohérence hiérarchie du plan comptable"""
        issues = []
        
        accounts = ChartOfAccounts.objects.filter(company=company)
        
        for account in accounts:
            if account.parent_account:
                parent = account.parent_account
                
                # Parent doit être préfixe de l'enfant
                if not account.code.startswith(parent.code):
                    issues.append(f"Hiérarchie incohérente: {account.code} sous {parent.code}")
                
                # Niveau hiérarchique cohérent
                if account.level != len(account.code):
                    issues.append(f"Niveau incohérent pour {account.code}")
        
        return issues
    
    @staticmethod
    def _get_mandatory_syscohada_accounts() -> List[str]:
        """Liste des comptes obligatoires SYSCOHADA"""
        return [
            '101',   # Capital social
            '110',   # Report à nouveau créditeur
            '120',   # Résultat (bénéfice)
            '401',   # Fournisseurs
            '411',   # Clients
            '443',   # TVA collectée
            '445',   # TVA déductible
            '521',   # Banque
            '571',   # Caisse
            '601',   # Achats
            '661',   # Salaires
            '701',   # Ventes
        ]
    
    @staticmethod
    def _calculate_setup_score(
        company: Company, 
        errors: List[str], 
        warnings: List[str]
    ) -> int:
        """Calcule un score de configuration sur 100"""
        base_score = 100
        
        # Pénalités
        base_score -= len(errors) * 15  # -15 points par erreur
        base_score -= len(warnings) * 5  # -5 points par warning
        
        # Bonus pour configuration avancée
        if company.syscohada_system == 'NORMAL':
            base_score += 10
        
        if company.account_length >= 8:
            base_score += 5
        
        return max(0, min(100, base_score))
    
    @staticmethod
    def _calculate_conformity_score(
        stats: Dict[str, Any], 
        errors: List[str], 
        warnings: List[str]
    ) -> int:
        """Calcule un score de conformité SYSCOHADA sur 100"""
        base_score = 100
        
        # Pénalités pour erreurs/warnings
        base_score -= len(errors) * 10
        base_score -= len(warnings) * 3
        
        # Bonus pour complétude
        total_classes = sum(1 for i in range(1, 8) if stats.get(f'class_{i}_count', 0) > 0)
        base_score += total_classes * 2  # +2 par classe présente
        
        # Bonus pour richesse du plan
        if stats.get('total_accounts', 0) > 100:
            base_score += 10
        
        return max(0, min(100, base_score))
    
    @staticmethod
    def generate_validation_report(
        company: Company, 
        fiscal_year: FiscalYear,
        include_recommendations: bool = True
    ) -> Dict[str, Any]:
        """
        Génère un rapport de validation complet
        Audit de conformité SYSCOHADA
        """
        report_start = timezone.now()
        
        # 1. Validation configuration entreprise
        company_validation = ValidationService.validate_company_setup(company)
        
        # 2. Validation plan comptable
        chart_validation = ValidationService.validate_chart_of_accounts(company)
        
        # 3. Validation écritures récentes (30 derniers jours)
        recent_entries = JournalEntry.objects.filter(
            company=company,
            fiscal_year=fiscal_year,
            entry_date__gte=date.today() - timezone.timedelta(days=30)
        )
        
        entries_validation = ValidationService.validate_journal_entry_batch(
            list(recent_entries), 
            strict_mode=True
        )
        
        # 4. Statistiques globales
        global_stats = ValidationService._calculate_global_statistics(company, fiscal_year)
        
        # 5. Recommandations d'amélioration
        recommendations = []
        if include_recommendations:
            recommendations = ValidationService._generate_recommendations(
                company_validation, chart_validation, entries_validation, global_stats
            )
        
        report_duration = (timezone.now() - report_start).total_seconds()
        
        return {
            'report_info': {
                'company': company.name,
                'fiscal_year': fiscal_year.name,
                'generated_at': timezone.now().isoformat(),
                'generation_time_seconds': report_duration,
            },
            'overall_score': (
                company_validation['score'] + 
                chart_validation['conformity_score'] + 
                entries_validation['summary']['success_rate']
            ) / 3,
            'company_setup': company_validation,
            'chart_of_accounts': chart_validation,
            'recent_entries': entries_validation,
            'global_statistics': global_stats,
            'recommendations': recommendations,
        }
    
    @staticmethod
    def _calculate_global_statistics(company: Company, fiscal_year: FiscalYear) -> Dict[str, Any]:
        """Calcule les statistiques globales de validation"""
        from django.db.models import Avg, Max, Min
        
        entries = JournalEntry.objects.filter(
            company=company,
            fiscal_year=fiscal_year
        )
        
        return {
            'entries_count': entries.count(),
            'validated_entries': entries.filter(is_validated=True).count(),
            'avg_lines_per_entry': entries.aggregate(
                avg=Avg('lines__count')
            )['avg'] or 0,
            'total_amount': entries.aggregate(
                total=Sum('total_debit')
            )['total'] or 0,
            'date_range': {
                'first_entry': entries.aggregate(Min('entry_date'))['entry_date__min'],
                'last_entry': entries.aggregate(Max('entry_date'))['entry_date__max'],
            }
        }
    
    @staticmethod
    def _generate_recommendations(
        company_val: Dict, 
        chart_val: Dict, 
        entries_val: Dict,
        global_stats: Dict
    ) -> List[Dict[str, str]]:
        """Génère des recommandations d'amélioration"""
        recommendations = []
        
        # Recommandations configuration
        if company_val['score'] < 90:
            recommendations.append({
                'category': 'CONFIGURATION',
                'priority': 'HIGH',
                'message': 'Compléter la configuration entreprise',
                'action': 'Renseigner RCCM, NIF et données légales'
            })
        
        # Recommandations plan comptable
        if chart_val['conformity_score'] < 85:
            recommendations.append({
                'category': 'PLAN_COMPTABLE',
                'priority': 'MEDIUM',
                'message': 'Enrichir le plan comptable',
                'action': 'Ajouter comptes de détail manquants'
            })
        
        # Recommandations écritures
        success_rate = entries_val['summary']['success_rate']
        if success_rate < 95:
            recommendations.append({
                'category': 'ECRITURES',
                'priority': 'HIGH',
                'message': 'Améliorer qualité des écritures',
                'action': 'Réviser écritures avec erreurs/warnings'
            })
        
        # Recommandations performance
        if global_stats['entries_count'] > 1000 and success_rate < 98:
            recommendations.append({
                'category': 'PERFORMANCE',
                'priority': 'LOW',
                'message': 'Optimiser processus de saisie',
                'action': 'Utiliser modèles d\'écritures et validation automatique'
            })
        
        return recommendations