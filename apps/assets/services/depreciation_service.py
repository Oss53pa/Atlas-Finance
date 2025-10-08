"""
Service de calcul d'amortissements SYSCOHADA
Gestion multi-méthodes et simulations selon EXF-IM-002
"""
from typing import List, Dict, Optional, Any
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal, ROUND_HALF_UP
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
import logging

from ..models import Immobilisation, LigneAmortissement, CategorieImmobilisation
from apps.accounting.models import JournalEntry, Journal
from apps.accounting.services.ecriture_service import EcritureService


logger = logging.getLogger(__name__)


class DepreciationService:
    """
    Service de calcul d'amortissements SYSCOHADA
    Méthodes conformes aux normes OHADA avec simulations avancées
    """
    
    # Coefficients dégressifs selon durée (SYSCOHADA)
    DEGRESSIVE_COEFFICIENTS = {
        3: Decimal('1.25'),   # 3-4 ans
        4: Decimal('1.25'),
        5: Decimal('1.75'),   # 5-6 ans  
        6: Decimal('1.75'),
        7: Decimal('2.25'),   # 7 ans et +
        8: Decimal('2.25'),
        9: Decimal('2.25'),
        10: Decimal('2.25'),
    }
    
    @staticmethod
    def calculate_depreciation_schedule(
        asset: Immobilisation,
        start_date: date,
        method: str = None,
        fiscal_year_end: str = '12-31'
    ) -> List[Dict[str, Any]]:
        """
        Calcule l'échéancier complet d'amortissement
        Support des 4 méthodes SYSCOHADA
        """
        method = method or asset.methode_amortissement
        
        if not asset.amortissable:
            return []
        
        # Validation paramètres
        if not asset.duree_amortissement or asset.duree_amortissement <= 0:
            raise ValidationError("Durée d'amortissement invalide")
        
        # Base d'amortissement
        base = asset.base_amortissement or (asset.valeur_brute - asset.valeur_residuelle)
        
        if base <= 0:
            raise ValidationError("Base d'amortissement invalide")
        
        # Calcul selon la méthode
        if method == 'LINEAIRE':
            return DepreciationService._calculate_linear_schedule(
                asset, base, start_date, fiscal_year_end
            )
        elif method == 'DEGRESSIF':
            return DepreciationService._calculate_degressive_schedule(
                asset, base, start_date, fiscal_year_end
            )
        elif method == 'PROGRESSIF':
            return DepreciationService._calculate_progressive_schedule(
                asset, base, start_date, fiscal_year_end
            )
        elif method == 'UNITE_OEUVRE':
            return DepreciationService._calculate_unit_of_work_schedule(
                asset, base, start_date, fiscal_year_end
            )
        else:
            raise ValidationError(f"Méthode d'amortissement non supportée: {method}")
    
    @staticmethod
    def _calculate_linear_schedule(
        asset: Immobilisation,
        base: Decimal,
        start_date: date,
        fiscal_year_end: str
    ) -> List[Dict[str, Any]]:
        """
        Calcul amortissement linéaire
        Répartition égale sur toute la durée
        """
        schedule = []
        duration_months = asset.duree_amortissement
        monthly_amount = (base / duration_months).quantize(Decimal('0.01'), ROUND_HALF_UP)
        
        current_date = start_date
        cumulative_depreciation = Decimal('0')
        remaining_base = base
        
        for month in range(duration_months):
            # Calcul période
            period_start = current_date
            period_end = current_date + relativedelta(months=1) - timedelta(days=1)
            
            # Montant du mois (ajustement dernier mois)
            if month == duration_months - 1:
                # Dernier mois : solde restant pour éviter écarts d'arrondi
                monthly_depreciation = remaining_base
            else:
                monthly_depreciation = monthly_amount
            
            cumulative_depreciation += monthly_depreciation
            remaining_base -= monthly_depreciation
            net_value = base - cumulative_depreciation
            
            schedule.append({
                'period': current_date.strftime('%Y-%m'),
                'period_start': period_start,
                'period_end': period_end,
                'depreciation_base': base,
                'monthly_rate': (monthly_depreciation / base * 100).quantize(Decimal('0.01')),
                'monthly_amount': monthly_depreciation,
                'cumulative_depreciation': cumulative_depreciation,
                'net_book_value': max(Decimal('0'), net_value),
                'method': 'LINEAIRE',
                'fiscal_year': DepreciationService._get_fiscal_year(current_date, fiscal_year_end),
            })
            
            current_date += relativedelta(months=1)
        
        return schedule
    
    @staticmethod
    def _calculate_degressive_schedule(
        asset: Immobilisation,
        base: Decimal,
        start_date: date,
        fiscal_year_end: str
    ) -> List[Dict[str, Any]]:
        """
        Calcul amortissement dégressif SYSCOHADA
        Avec bascule automatique vers linéaire
        """
        schedule = []
        duration_years = asset.duree_amortissement / 12
        
        # Coefficient dégressif selon durée
        coefficient = DepreciationService.DEGRESSIVE_COEFFICIENTS.get(
            int(duration_years), Decimal('1.75')
        )
        
        # Taux dégressif = (100 / durée) × coefficient
        degressive_rate = (Decimal('100') / Decimal(str(duration_years)) * coefficient).quantize(Decimal('0.01'))
        
        current_date = start_date
        remaining_base = base
        cumulative_depreciation = Decimal('0')
        switched_to_linear = False
        
        for month in range(asset.duree_amortissement):
            period_start = current_date
            period_end = current_date + relativedelta(months=1) - timedelta(days=1)
            
            # Calcul amortissement dégressif mensuel
            annual_depreciation = remaining_base * degressive_rate / 100
            monthly_depreciation = annual_depreciation / 12
            
            # Vérification bascule vers linéaire
            remaining_months = asset.duree_amortissement - month
            if remaining_months > 0:
                linear_monthly = (remaining_base - asset.valeur_residuelle) / remaining_months
                
                if not switched_to_linear and linear_monthly > monthly_depreciation:
                    switched_to_linear = True
                    monthly_depreciation = linear_monthly
            
            # Ajustement dernier mois
            if month == asset.duree_amortissement - 1:
                monthly_depreciation = remaining_base - asset.valeur_residuelle
            
            cumulative_depreciation += monthly_depreciation
            remaining_base -= monthly_depreciation
            net_value = base - cumulative_depreciation
            
            schedule.append({
                'period': current_date.strftime('%Y-%m'),
                'period_start': period_start,
                'period_end': period_end,
                'depreciation_base': remaining_base + monthly_depreciation,
                'monthly_rate': (monthly_depreciation / base * 100).quantize(Decimal('0.01')),
                'monthly_amount': monthly_depreciation,
                'cumulative_depreciation': cumulative_depreciation,
                'net_book_value': max(asset.valeur_residuelle, net_value),
                'method': 'LINÉAIRE' if switched_to_linear else 'DÉGRESSIF',
                'degressive_rate': degressive_rate,
                'coefficient': coefficient,
                'fiscal_year': DepreciationService._get_fiscal_year(current_date, fiscal_year_end),
            })
            
            current_date += relativedelta(months=1)
        
        return schedule
    
    @staticmethod
    def _calculate_progressive_schedule(
        asset: Immobilisation,
        base: Decimal,
        start_date: date,
        fiscal_year_end: str
    ) -> List[Dict[str, Any]]:
        """
        Calcul amortissement progressif
        Montants croissants dans le temps
        """
        schedule = []
        duration_months = asset.duree_amortissement
        
        # Progression géométrique simple (facteur 1.1 par année)
        annual_factor = Decimal('1.1')
        
        # Calcul des coefficients annuels
        total_coefficients = Decimal('0')
        annual_coefficients = []
        
        for year in range(int(duration_months / 12) + 1):
            coefficient = annual_factor ** year
            annual_coefficients.append(coefficient)
            total_coefficients += coefficient
        
        # Répartition base selon coefficients
        current_date = start_date
        cumulative_depreciation = Decimal('0')
        
        for month in range(duration_months):
            year_index = month // 12
            month_in_year = month % 12
            
            if year_index < len(annual_coefficients):
                annual_coefficient = annual_coefficients[year_index]
                annual_amount = (base * annual_coefficient / total_coefficients).quantize(Decimal('0.01'))
                monthly_depreciation = annual_amount / 12
            else:
                monthly_depreciation = Decimal('0')
            
            cumulative_depreciation += monthly_depreciation
            net_value = base - cumulative_depreciation
            
            schedule.append({
                'period': current_date.strftime('%Y-%m'),
                'period_start': current_date,
                'period_end': current_date + relativedelta(months=1) - timedelta(days=1),
                'depreciation_base': base,
                'monthly_rate': (monthly_depreciation / base * 100).quantize(Decimal('0.01')),
                'monthly_amount': monthly_depreciation,
                'cumulative_depreciation': cumulative_depreciation,
                'net_book_value': max(asset.valeur_residuelle, net_value),
                'method': 'PROGRESSIF',
                'annual_coefficient': annual_coefficient if year_index < len(annual_coefficients) else Decimal('0'),
                'fiscal_year': DepreciationService._get_fiscal_year(current_date, fiscal_year_end),
            })
            
            current_date += relativedelta(months=1)
        
        return schedule
    
    @staticmethod
    def _calculate_unit_of_work_schedule(
        asset: Immobilisation,
        base: Decimal,
        start_date: date,
        fiscal_year_end: str
    ) -> List[Dict[str, Any]]:
        """
        Calcul amortissement aux unités d'œuvre
        Basé sur l'utilisation réelle
        """
        # Pour cette méthode, il faut des données d'utilisation
        # Implémentation simplifiée - nécessiterait suivi usage réel
        
        schedule = []
        duration_months = asset.duree_amortissement
        
        # Estimation usage uniforme (à remplacer par vraies données)
        estimated_monthly_usage = Decimal('100')  # Unités par mois
        total_estimated_units = estimated_monthly_usage * duration_months
        unit_cost = base / total_estimated_units if total_estimated_units > 0 else Decimal('0')
        
        current_date = start_date
        cumulative_depreciation = Decimal('0')
        
        for month in range(duration_months):
            # Usage estimé du mois (à remplacer par vraies données)
            monthly_usage = estimated_monthly_usage
            monthly_depreciation = (unit_cost * monthly_usage).quantize(Decimal('0.01'))
            
            cumulative_depreciation += monthly_depreciation
            net_value = base - cumulative_depreciation
            
            schedule.append({
                'period': current_date.strftime('%Y-%m'),
                'period_start': current_date,
                'period_end': current_date + relativedelta(months=1) - timedelta(days=1),
                'depreciation_base': base,
                'monthly_usage': monthly_usage,
                'unit_cost': unit_cost,
                'monthly_amount': monthly_depreciation,
                'cumulative_depreciation': cumulative_depreciation,
                'net_book_value': max(asset.valeur_residuelle, net_value),
                'method': 'UNITÉ_OEUVRE',
                'fiscal_year': DepreciationService._get_fiscal_year(current_date, fiscal_year_end),
            })
            
            current_date += relativedelta(months=1)
        
        return schedule
    
    @staticmethod
    def generate_monthly_depreciation_entries(
        company,
        calculation_date: date,
        asset_filter: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Génère les écritures d'amortissement mensuelles automatiques
        Performance optimisée pour traitement masse
        """
        start_time = timezone.now()
        
        with transaction.atomic():
            # Sélection des immobilisations à amortir
            assets_query = Immobilisation.objects.filter(
                societe=company,
                amortissable=True,
                statut='EN_SERVICE',
                date_mise_en_service__lte=calculation_date
            )
            
            if asset_filter:
                if asset_filter.get('category_ids'):
                    assets_query = assets_query.filter(
                        categorie__id__in=asset_filter['category_ids']
                    )
                if asset_filter.get('site'):
                    assets_query = assets_query.filter(site=asset_filter['site'])
            
            assets_to_depreciate = assets_query.select_related('categorie')
            
            # Statistiques de traitement
            results = {
                'assets_processed': 0,
                'entries_created': 0,
                'total_depreciation_amount': Decimal('0'),
                'errors': [],
                'processing_time_ms': 0,
            }
            
            # Regroupement par catégorie pour optimisation
            category_groups = {}
            
            for asset in assets_to_depreciate:
                category_id = asset.categorie.id
                if category_id not in category_groups:
                    category_groups[category_id] = {
                        'category': asset.categorie,
                        'assets': [],
                        'total_amount': Decimal('0'),
                    }
                
                # Calcul amortissement mensuel
                try:
                    monthly_depreciation = DepreciationService._calculate_monthly_depreciation(
                        asset, calculation_date
                    )
                    
                    if monthly_depreciation > 0:
                        category_groups[category_id]['assets'].append({
                            'asset': asset,
                            'amount': monthly_depreciation
                        })
                        category_groups[category_id]['total_amount'] += monthly_depreciation
                        results['assets_processed'] += 1
                        results['total_depreciation_amount'] += monthly_depreciation
                    
                except Exception as e:
                    results['errors'].append({
                        'asset_number': asset.numero,
                        'error': str(e)
                    })
            
            # Génération des écritures par catégorie
            journal = DepreciationService._get_depreciation_journal(company)
            
            for category_data in category_groups.values():
                if category_data['total_amount'] > 0:
                    try:
                        entry = DepreciationService._create_depreciation_entry(
                            company, journal, calculation_date, category_data
                        )
                        
                        if entry:
                            results['entries_created'] += 1
                            
                            # Création des lignes d'amortissement
                            for asset_data in category_data['assets']:
                                DepreciationService._create_depreciation_line(
                                    asset_data['asset'], calculation_date, 
                                    asset_data['amount'], entry
                                )
                        
                    except Exception as e:
                        results['errors'].append({
                            'category': category_data['category'].libelle,
                            'error': str(e)
                        })
            
            results['processing_time_ms'] = int(
                (timezone.now() - start_time).total_seconds() * 1000
            )
            
            logger.info(
                f"Amortissements calculés: {results['assets_processed']} immobilisations, "
                f"{results['entries_created']} écritures, "
                f"{results['total_depreciation_amount']:,.0f} XAF"
            )
            
            return results
    
    @staticmethod
    def _calculate_monthly_depreciation(asset: Immobilisation, calc_date: date) -> Decimal:
        """
        Calcule l'amortissement mensuel d'une immobilisation
        """
        if not asset.date_mise_en_service or calc_date < asset.date_mise_en_service:
            return Decimal('0')
        
        # Vérification si déjà complètement amorti
        if asset.date_fin_amortissement and calc_date > asset.date_fin_amortissement:
            return Decimal('0')
        
        # Base d'amortissement
        base = asset.base_amortissement or (asset.valeur_brute - asset.valeur_residuelle)
        
        if asset.methode_amortissement == 'LINEAIRE':
            # Amortissement linéaire mensuel
            return (base / asset.duree_amortissement).quantize(Decimal('0.01'))
        
        elif asset.methode_amortissement == 'DEGRESSIF':
            # Calcul dégressif avec bascule linéaire
            return DepreciationService._calculate_degressive_monthly(asset, base, calc_date)
        
        return Decimal('0')
    
    @staticmethod
    def _calculate_degressive_monthly(
        asset: Immobilisation,
        base: Decimal,
        calc_date: date
    ) -> Decimal:
        """
        Calcul mensuel dégressif avec gestion bascule linéaire
        """
        # Mois écoulés depuis mise en service
        months_elapsed = DepreciationService._months_between(
            asset.date_mise_en_service, calc_date
        )
        
        # Cumul amortissement déjà pratiqué
        cumul_existing = LigneAmortissement.objects.filter(
            immobilisation=asset,
            statut='REALISE',
            date_fin__lt=calc_date
        ).aggregate(
            total=models.Sum('montant_amortissement')
        )['total'] or Decimal('0')
        
        remaining_base = base - cumul_existing
        remaining_months = asset.duree_amortissement - months_elapsed
        
        if remaining_months <= 0:
            return Decimal('0')
        
        # Calcul dégressif
        duration_years = asset.duree_amortissement / 12
        coefficient = DepreciationService.DEGRESSIVE_COEFFICIENTS.get(
            int(duration_years), Decimal('1.75')
        )
        degressive_rate = Decimal('100') / Decimal(str(duration_years)) * coefficient / 100
        annual_degressive = remaining_base * degressive_rate
        monthly_degressive = annual_degressive / 12
        
        # Calcul linéaire pour comparaison
        monthly_linear = remaining_base / remaining_months
        
        # Bascule si linéaire > dégressif
        if monthly_linear > monthly_degressive:
            return monthly_linear.quantize(Decimal('0.01'))
        
        return monthly_degressive.quantize(Decimal('0.01'))
    
    @staticmethod
    def _months_between(start_date: date, end_date: date) -> int:
        """Calcule le nombre de mois entre deux dates"""
        return (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month)
    
    @staticmethod
    def _get_depreciation_journal(company) -> Journal:
        """Récupère le journal des amortissements"""
        return Journal.objects.get_or_create(
            company=company,
            code='AMORT',
            defaults={
                'name': 'Journal des Amortissements',
                'journal_type': 'OD',
            }
        )[0]
    
    @staticmethod
    def _create_depreciation_entry(
        company,
        journal: Journal,
        calc_date: date,
        category_data: Dict
    ) -> Optional[JournalEntry]:
        """
        Crée l'écriture d'amortissement pour une catégorie
        """
        category = category_data['category']
        total_amount = category_data['total_amount']
        
        # Données écriture
        entry_data = {
            'entry_date': calc_date,
            'description': f"Amortissements {category.libelle} - {calc_date.strftime('%m/%Y')}",
            'reference': f"AMORT-{calc_date.strftime('%Y%m')}-{category.code}",
        }
        
        # Lignes d'écriture SYSCOHADA
        lines_data = [
            {
                'account_code': category.compte_dotation.code,  # 68x - Dotations
                'label': f"Dotation amortissement {category.libelle}",
                'debit_amount': float(total_amount),
                'credit_amount': 0,
            },
            {
                'account_code': category.compte_amortissement.code,  # 28x - Amortissements
                'label': f"Amortissement {category.libelle}",
                'debit_amount': 0,
                'credit_amount': float(total_amount),
            }
        ]
        
        try:
            return EcritureService.create_journal_entry(
                company=company,
                journal=journal,
                fiscal_year=company.current_fiscal_year,
                entry_data=entry_data,
                lines_data=lines_data,
                auto_validate=True
            )
        except Exception as e:
            logger.error(f"Erreur création écriture amortissement: {e}")
            return None
    
    @staticmethod
    def _create_depreciation_line(
        asset: Immobilisation,
        calc_date: date,
        amount: Decimal,
        journal_entry: JournalEntry
    ):
        """
        Crée la ligne d'amortissement pour suivi détaillé
        """
        period = calc_date.strftime('%Y-%m')
        
        # Calcul cumul
        previous_cumul = LigneAmortissement.objects.filter(
            immobilisation=asset,
            statut='REALISE',
            date_fin__lt=calc_date
        ).aggregate(
            total=models.Sum('montant_amortissement')
        )['total'] or Decimal('0')
        
        new_cumul = previous_cumul + amount
        net_value = asset.valeur_brute - new_cumul
        
        # Création ligne
        LigneAmortissement.objects.create(
            immobilisation=asset,
            exercice=calc_date.year,
            periode=period,
            date_debut=calc_date.replace(day=1),
            date_fin=calc_date,
            base_amortissement=asset.valeur_brute - asset.valeur_residuelle,
            taux_applique=asset.taux_amortissement,
            montant_amortissement=amount,
            cumul_amortissement=new_cumul,
            valeur_nette_fin=max(asset.valeur_residuelle, net_value),
            statut='REALISE',
            ecriture_comptable=journal_entry
        )
        
        # Mise à jour immobilisation
        asset.valeur_nette_comptable = net_value
        asset.save(update_fields=['valeur_nette_comptable'])
    
    @staticmethod
    def _get_fiscal_year(calc_date: date, fiscal_year_end: str) -> int:
        """Détermine l'exercice fiscal d'une date"""
        month_end, day_end = map(int, fiscal_year_end.split('-'))
        
        if calc_date.month > month_end or (calc_date.month == month_end and calc_date.day > day_end):
            return calc_date.year + 1
        
        return calc_date.year
    
    @staticmethod
    def simulate_depreciation_methods(
        asset: Immobilisation,
        methods: List[str] = None
    ) -> Dict[str, Any]:
        """
        Simulation comparative des méthodes d'amortissement
        Pour aide à la décision
        """
        if not methods:
            methods = ['LINEAIRE', 'DEGRESSIF', 'PROGRESSIF']
        
        simulations = {}
        base = asset.valeur_brute - asset.valeur_residuelle
        start_date = asset.date_mise_en_service or asset.date_acquisition
        
        for method in methods:
            try:
                schedule = DepreciationService.calculate_depreciation_schedule(
                    asset, start_date, method
                )
                
                # Analyse de la simulation
                analysis = {
                    'total_depreciation': sum(line['monthly_amount'] for line in schedule),
                    'first_year_depreciation': sum(
                        line['monthly_amount'] for line in schedule 
                        if line['fiscal_year'] == start_date.year
                    ),
                    'average_annual': sum(line['monthly_amount'] for line in schedule) / (len(schedule) / 12),
                    'net_value_after_5_years': next(
                        (line['net_book_value'] for line in schedule 
                         if DepreciationService._months_between(start_date, line['period_start']) >= 60),
                        base
                    ),
                    'schedule_detail': schedule[:24],  # 2 premières années pour preview
                }
                
                simulations[method] = analysis
                
            except Exception as e:
                simulations[method] = {'error': str(e)}
        
        # Comparaison et recommandation
        recommendation = DepreciationService._recommend_best_method(simulations, asset)
        
        return {
            'asset_info': {
                'numero': asset.numero,
                'libelle': asset.libelle,
                'valeur_brute': float(asset.valeur_brute),
                'duree_mois': asset.duree_amortissement,
            },
            'simulations': simulations,
            'recommendation': recommendation,
            'generated_at': timezone.now().isoformat(),
        }
    
    @staticmethod
    def _recommend_best_method(simulations: Dict, asset: Immobilisation) -> Dict[str, str]:
        """
        Recommande la meilleure méthode selon critères fiscaux et financiers
        """
        # Logique de recommandation simplifiée
        asset_category = asset.categorie.type_immobilisation
        
        if asset_category == 'INCORPORELLE':
            return {
                'method': 'LINEAIRE',
                'reason': 'Méthode standard pour les immobilisations incorporelles'
            }
        
        # Pour corporelles, comparaison avantages fiscaux
        if 'DEGRESSIF' in simulations and 'LINEAIRE' in simulations:
            degressive_first_year = simulations['DEGRESSIF'].get('first_year_depreciation', 0)
            linear_first_year = simulations['LINEAIRE'].get('first_year_depreciation', 0)
            
            if degressive_first_year > linear_first_year * 1.2:  # +20% avantage
                return {
                    'method': 'DEGRESSIF',
                    'reason': 'Avantage fiscal significatif première année'
                }
        
        return {
            'method': 'LINEAIRE',
            'reason': 'Méthode simple et régulière'
        }
    
    @staticmethod
    def get_depreciation_dashboard_data(company) -> Dict[str, Any]:
        """
        Données pour dashboard immobilisations
        """
        from django.db.models import Sum, Count, Avg
        
        # Statistiques globales
        stats = Immobilisation.objects.filter(societe=company).aggregate(
            total_count=Count('id'),
            total_gross_value=Sum('valeur_acquisition') or Decimal('0'),
            total_net_value=Sum('valeur_nette_comptable') or Decimal('0'),
            avg_age_months=Avg('age_en_mois') or 0,
        )
        
        stats['total_depreciation'] = stats['total_gross_value'] - stats['total_net_value']
        stats['depreciation_rate'] = (
            (stats['total_depreciation'] / stats['total_gross_value'] * 100)
            if stats['total_gross_value'] > 0 else 0
        )
        
        # Répartition par catégorie
        by_category = Immobilisation.objects.filter(
            societe=company
        ).values(
            'categorie__libelle', 'categorie__type_immobilisation'
        ).annotate(
            count=Count('id'),
            gross_value=Sum('valeur_acquisition'),
            net_value=Sum('valeur_nette_comptable')
        ).order_by('-gross_value')
        
        # Amortissements du mois
        current_month = date.today().strftime('%Y-%m')
        monthly_depreciation = LigneAmortissement.objects.filter(
            immobilisation__societe=company,
            periode=current_month,
            statut='REALISE'
        ).aggregate(
            total=Sum('montant_amortissement')
        )['total'] or Decimal('0')
        
        # Alertes
        alerts = []
        
        # Immobilisations sans amortissement
        no_depreciation = Immobilisation.objects.filter(
            societe=company,
            amortissable=True,
            statut='EN_SERVICE',
            lignes_amortissement__isnull=True
        ).count()
        
        if no_depreciation > 0:
            alerts.append({
                'type': 'NO_DEPRECIATION',
                'count': no_depreciation,
                'message': f"{no_depreciation} immobilisations sans amortissement calculé"
            })
        
        # Inventaire en retard
        last_inventory = InventaireImmobilisation.objects.filter(
            societe=company,
            statut='CLOTURE'
        ).order_by('-date_inventaire').first()
        
        if not last_inventory or (date.today() - last_inventory.date_inventaire).days > 365:
            alerts.append({
                'type': 'INVENTORY_OVERDUE',
                'message': 'Inventaire physique requis (> 12 mois)'
            })
        
        return {
            'global_stats': {
                'total_assets': stats['total_count'],
                'total_gross_value': float(stats['total_gross_value']),
                'total_net_value': float(stats['total_net_value']),
                'total_depreciation': float(stats['total_depreciation']),
                'depreciation_rate': float(stats['depreciation_rate']),
                'average_age_years': float(stats['avg_age_months'] / 12),
            },
            'by_category': [
                {
                    'category': item['categorie__libelle'],
                    'type': item['categorie__type_immobilisation'],
                    'count': item['count'],
                    'gross_value': float(item['gross_value'] or 0),
                    'net_value': float(item['net_value'] or 0),
                    'depreciation_rate': float(
                        ((item['gross_value'] or 0) - (item['net_value'] or 0)) / 
                        max(item['gross_value'] or 1, 1) * 100
                    )
                }
                for item in by_category
            ],
            'monthly_depreciation': float(monthly_depreciation),
            'alerts': alerts,
            'generated_at': timezone.now().isoformat(),
        }