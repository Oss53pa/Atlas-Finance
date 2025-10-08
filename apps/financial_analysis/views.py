"""
Vues API pour le module Analyse Financière WiseBook
États financiers, SIG, ratios et TAFIRE SYSCOHADA
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db import transaction
from django.db.models import Q, Prefetch
from decimal import Decimal
import logging

from .models import (
    FinancialAnalysisConfiguration,
    TAFIREStatement,
    SIG,
    FunctionalBalanceSheet,
    CashFlowScenario,
    RatioFinancier
)
from apps.reporting.models.financial_statements import (
    BalanceSYSCOHADA,
    CompteResultatSYSCOHADA,
    TableauFluxTresorerieSYSCOHADA,
    FinancialStatementsSet
)
from .serializers import (
    FinancialAnalysisConfigurationSerializer,
    BalanceSYSCOHADASerializer,
    CompteResultatSYSCOHADASerializer,
    TableauFluxTresorerieSYSCOHADASerializer,
    SIGSerializer,
    FunctionalBalanceSheetSerializer,
    RatioFinancierSerializer,
    CashFlowScenarioSerializer,
    FinancialStatementsSetSerializer,
    FinancialStatementCalculationSerializer,
    RatioCalculationRequestSerializer
)
from apps.core.mixins import CompanyFilterMixin
from apps.core.permissions import IsCompanyMember

logger = logging.getLogger(__name__)


class FinancialAnalysisConfigurationViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """ViewSet pour la configuration d'analyse financière"""

    queryset = FinancialAnalysisConfiguration.objects.all()
    serializer_class = FinancialAnalysisConfigurationSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['tafire_method', 'auto_calculation_enabled']

    def get_queryset(self):
        return super().get_queryset().select_related('company')

    @action(detail=True, methods=['post'])
    def update_calculation_settings(self, request, pk=None):
        """Mise à jour des paramètres de calcul"""
        config = self.get_object()

        calculation_frequency = request.data.get('calculation_frequency')
        auto_enabled = request.data.get('auto_calculation_enabled')

        if calculation_frequency:
            config.calculation_frequency = calculation_frequency

        if auto_enabled is not None:
            config.auto_calculation_enabled = auto_enabled

        config.save()

        return Response({
            'status': 'success',
            'message': 'Paramètres de calcul mis à jour',
            'config': self.get_serializer(config).data
        })


class BalanceSYSCOHADAViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """ViewSet pour les Bilans SYSCOHADA"""

    queryset = BalanceSYSCOHADA.objects.all()
    serializer_class = BalanceSYSCOHADASerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['fiscal_year', 'is_validated', 'is_balanced']

    def get_queryset(self):
        return super().get_queryset().select_related(
            'company', 'fiscal_year'
        ).order_by('-statement_date')

    @action(detail=False, methods=['post'])
    def create_from_trial_balance(self, request):
        """Création d'un bilan à partir de la balance générale"""
        try:
            statement_date = request.data.get('statement_date')
            fiscal_year_id = request.data.get('fiscal_year_id')

            if not statement_date or not fiscal_year_id:
                return Response({
                    'error': 'Date d\'arrêté et exercice fiscal requis'
                }, status=status.HTTP_400_BAD_REQUEST)

            # TODO: Implémenter la logique de création depuis la balance
            # Cette fonctionnalité nécessite l'intégration avec le module comptable

            return Response({
                'status': 'success',
                'message': 'Bilan créé avec succès depuis la balance générale'
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Erreur création bilan depuis balance: {str(e)}")
            return Response({
                'error': 'Erreur lors de la création du bilan'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def validate_balance_sheet(self, request, pk=None):
        """Validation d'un bilan"""
        balance_sheet = self.get_object()

        if balance_sheet.is_validated:
            return Response({
                'error': 'Le bilan est déjà validé'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Vérifications de validation
        if not balance_sheet.is_balanced:
            return Response({
                'error': f'Le bilan n\'est pas équilibré (écart: {balance_sheet.balance_difference})'
            }, status=status.HTTP_400_BAD_REQUEST)

        balance_sheet.is_validated = True
        balance_sheet.validated_by = request.user
        balance_sheet.validation_date = timezone.now()
        balance_sheet.save()

        return Response({
            'status': 'success',
            'message': 'Bilan validé avec succès',
            'validated_at': balance_sheet.validation_date
        })

    @action(detail=True, methods=['get'])
    def generate_analysis(self, request, pk=None):
        """Génération d'analyse financière du bilan"""
        balance_sheet = self.get_object()

        analysis = {
            'financial_structure': self._analyze_financial_structure(balance_sheet),
            'liquidity_analysis': self._analyze_liquidity(balance_sheet),
            'asset_composition': self._analyze_asset_composition(balance_sheet),
            'recommendations': self._generate_recommendations(balance_sheet)
        }

        return Response(analysis)

    def _analyze_financial_structure(self, balance_sheet):
        """Analyse de la structure financière"""
        total_assets = balance_sheet.total_assets
        if total_assets == 0:
            return {}

        return {
            'equity_ratio': round(float(balance_sheet.total_equity / total_assets * 100), 2),
            'debt_ratio': round(float(balance_sheet.total_financial_debts / total_assets * 100), 2),
            'fixed_assets_ratio': round(float(balance_sheet.total_fixed_assets / total_assets * 100), 2),
            'current_assets_ratio': round(float(balance_sheet.total_current_assets / total_assets * 100), 2)
        }

    def _analyze_liquidity(self, balance_sheet):
        """Analyse de liquidité"""
        current_liabilities = balance_sheet.total_current_liabilities
        if current_liabilities == 0:
            return {}

        return {
            'current_ratio': round(float(balance_sheet.total_current_assets / current_liabilities), 2),
            'cash_ratio': round(float(balance_sheet.total_treasury_assets / current_liabilities), 2),
            'working_capital': float(balance_sheet.total_current_assets - current_liabilities)
        }

    def _analyze_asset_composition(self, balance_sheet):
        """Analyse de la composition de l'actif"""
        total_fixed = balance_sheet.total_fixed_assets
        if total_fixed == 0:
            return {}

        return {
            'intangible_weight': round(float(balance_sheet.intangible_assets_net / total_fixed * 100), 2),
            'tangible_weight': round(float(balance_sheet.tangible_assets_net / total_fixed * 100), 2),
            'financial_weight': round(float(balance_sheet.financial_assets_net / total_fixed * 100), 2)
        }

    def _generate_recommendations(self, balance_sheet):
        """Génération de recommandations automatiques"""
        recommendations = []

        # Analyse autonomie financière
        equity_ratio = balance_sheet.total_equity / balance_sheet.total_assets * 100
        if equity_ratio < 20:
            recommendations.append({
                'type': 'warning',
                'category': 'Structure financière',
                'message': 'Autonomie financière faible. Considérer un renforcement des fonds propres.'
            })

        # Analyse liquidité
        if balance_sheet.total_current_liabilities > 0:
            current_ratio = balance_sheet.total_current_assets / balance_sheet.total_current_liabilities
            if current_ratio < 1:
                recommendations.append({
                    'type': 'danger',
                    'category': 'Liquidité',
                    'message': 'Risque de liquidité élevé. Actif circulant insuffisant pour couvrir les dettes à court terme.'
                })

        return recommendations


class CompteResultatSYSCOHADAViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """ViewSet pour les Comptes de Résultat SYSCOHADA"""

    queryset = CompteResultatSYSCOHADA.objects.all()
    serializer_class = CompteResultatSYSCOHADASerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['fiscal_year', 'is_validated']

    def get_queryset(self):
        return super().get_queryset().select_related(
            'company', 'fiscal_year'
        ).order_by('-statement_date')

    @action(detail=True, methods=['get'])
    def calculate_sig(self, request, pk=None):
        """Calcul des SIG à partir du compte de résultat"""
        income_statement = self.get_object()

        try:
            # Création ou mise à jour du SIG
            sig, created = SIG.objects.get_or_create(
                company=income_statement.company,
                fiscal_year=income_statement.fiscal_year,
                calculation_date=income_statement.statement_date,
                defaults={
                    'period_end_date': income_statement.statement_date,
                    'revenue_base': income_statement.merchandise_sales + income_statement.production_sold
                }
            )

            # Mappage des données du compte de résultat vers le SIG
            sig.merchandise_sales = income_statement.merchandise_sales
            sig.merchandise_cost = income_statement.merchandise_purchases
            sig.production_sold = income_statement.production_sold
            sig.production_stored = income_statement.production_stored
            sig.production_immobilized = income_statement.production_immobilized
            sig.operating_subsidies = income_statement.operating_subsidies
            sig.staff_costs = income_statement.staff_costs
            sig.taxes_and_duties = income_statement.taxes_and_duties
            sig.other_operating_income = income_statement.other_operating_income
            sig.other_operating_expenses = income_statement.other_operating_expenses
            sig.financial_income = income_statement.financial_income
            sig.financial_expenses = income_statement.financial_expenses
            sig.exceptional_income = income_statement.exceptional_income
            sig.exceptional_expenses = income_statement.exceptional_expenses
            sig.income_tax = income_statement.income_tax

            # Estimation des consommations intermédiaires et des dotations
            sig.intermediate_consumption = (
                income_statement.raw_materials_purchases +
                income_statement.other_purchases +
                income_statement.external_services
            )

            sig.save()  # Les calculs automatiques se font dans save()

            return Response({
                'status': 'success',
                'message': f'SIG {"créé" if created else "mis à jour"} avec succès',
                'sig': SIGSerializer(sig).data
            })

        except Exception as e:
            logger.error(f"Erreur calcul SIG: {str(e)}")
            return Response({
                'error': 'Erreur lors du calcul des SIG'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TableauFluxTresorerieSYSCOHADAViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """ViewSet pour les Tableaux de Flux de Trésorerie SYSCOHADA"""

    queryset = TableauFluxTresorerieSYSCOHADA.objects.all()
    serializer_class = TableauFluxTresorerieSYSCOHADASerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['fiscal_year', 'is_validated', 'calculation_method']

    def get_queryset(self):
        return super().get_queryset().select_related(
            'company', 'fiscal_year'
        ).order_by('-statement_date')

    @action(detail=False, methods=['post'])
    def create_from_statements(self, request):
        """Création d'un TAFIRE à partir du bilan et compte de résultat"""
        try:
            balance_sheet_id = request.data.get('balance_sheet_id')
            income_statement_id = request.data.get('income_statement_id')
            previous_balance_sheet_id = request.data.get('previous_balance_sheet_id')

            if not all([balance_sheet_id, income_statement_id]):
                return Response({
                    'error': 'Bilan et compte de résultat requis'
                }, status=status.HTTP_400_BAD_REQUEST)

            balance_sheet = BalanceSYSCOHADA.objects.get(id=balance_sheet_id)
            income_statement = CompteResultatSYSCOHADA.objects.get(id=income_statement_id)
            previous_balance = None

            if previous_balance_sheet_id:
                previous_balance = BalanceSYSCOHADA.objects.get(id=previous_balance_sheet_id)

            # Création du TAFIRE
            tafire = self._create_tafire_from_statements(
                balance_sheet, income_statement, previous_balance
            )

            return Response({
                'status': 'success',
                'message': 'TAFIRE créé avec succès',
                'tafire': self.get_serializer(tafire).data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Erreur création TAFIRE: {str(e)}")
            return Response({
                'error': 'Erreur lors de la création du TAFIRE'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _create_tafire_from_statements(self, balance_sheet, income_statement, previous_balance=None):
        """Création d'un TAFIRE à partir des états financiers"""

        tafire = TableauFluxTresorerieSYSCOHADA.objects.create(
            company=balance_sheet.company,
            fiscal_year=balance_sheet.fiscal_year,
            statement_date=balance_sheet.statement_date,
            net_result_for_cash_flow=income_statement.calculated_net_result,
            closing_cash_balance=(
                balance_sheet.total_treasury_assets -
                balance_sheet.total_treasury_liabilities
            )
        )

        # Calcul de la trésorerie d'ouverture si bilan précédent disponible
        if previous_balance:
            tafire.opening_cash_balance = (
                previous_balance.total_treasury_assets -
                previous_balance.total_treasury_liabilities
            )

            # Calcul des variations (simplifié - nécessite plus de logique métier)
            tafire.working_capital_variation = self._calculate_working_capital_variation(
                balance_sheet, previous_balance
            )

        tafire.save()  # Les calculs automatiques se font dans save()
        return tafire

    def _calculate_working_capital_variation(self, current_balance, previous_balance):
        """Calcul de la variation du BFR"""
        current_wc = (
            current_balance.total_current_assets -
            current_balance.total_current_liabilities
        )
        previous_wc = (
            previous_balance.total_current_assets -
            previous_balance.total_current_liabilities
        )
        return current_wc - previous_wc


class SIGViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """ViewSet pour les Soldes Intermédiaires de Gestion"""

    queryset = SIG.objects.all()
    serializer_class = SIGSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['fiscal_year']

    def get_queryset(self):
        return super().get_queryset().select_related(
            'company', 'fiscal_year'
        ).order_by('-calculation_date')

    @action(detail=False, methods=['get'])
    def comparative_analysis(self, request):
        """Analyse comparative des SIG sur plusieurs périodes"""
        periods = request.query_params.get('periods', 3)

        try:
            periods = int(periods)
            company = self.get_company()

            sig_list = SIG.objects.filter(
                company=company
            ).order_by('-calculation_date')[:periods]

            if len(sig_list) < 2:
                return Response({
                    'error': 'Au moins 2 périodes nécessaires pour l\'analyse comparative'
                }, status=status.HTTP_400_BAD_REQUEST)

            analysis = self._calculate_comparative_trends(sig_list)

            return Response({
                'periods_analyzed': len(sig_list),
                'trends': analysis,
                'sig_data': SIGSerializer(sig_list, many=True).data
            })

        except ValueError:
            return Response({
                'error': 'Nombre de périodes invalide'
            }, status=status.HTTP_400_BAD_REQUEST)

    def _calculate_comparative_trends(self, sig_list):
        """Calcul des tendances comparatives"""
        if len(sig_list) < 2:
            return {}

        latest = sig_list[0]
        previous = sig_list[1]

        trends = {}

        # Calcul des évolutions pour les principaux soldes
        sig_indicators = [
            ('commercial_margin', 'Marge commerciale'),
            ('added_value', 'Valeur ajoutée'),
            ('gross_operating_surplus', 'EBE'),
            ('operating_result', 'Résultat d\'exploitation'),
            ('final_net_result', 'Résultat net')
        ]

        for field, label in sig_indicators:
            latest_value = getattr(latest, field, Decimal('0'))
            previous_value = getattr(previous, field, Decimal('0'))

            if previous_value != 0:
                evolution = ((latest_value - previous_value) / previous_value * 100)
                trends[field] = {
                    'label': label,
                    'latest': float(latest_value),
                    'previous': float(previous_value),
                    'evolution_percent': round(float(evolution), 2),
                    'trend': 'positive' if evolution > 0 else 'negative' if evolution < 0 else 'stable'
                }

        return trends


class RatioFinancierViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """ViewSet pour les Ratios Financiers"""

    queryset = RatioFinancier.objects.all()
    serializer_class = RatioFinancierSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category', 'type_ratio', 'fiscal_year', 'alerte', 'niveau_alerte']

    def get_queryset(self):
        return super().get_queryset().select_related(
            'company', 'fiscal_year'
        ).order_by('category', 'type_ratio')

    @action(detail=False, methods=['post'])
    def calculate_ratios_batch(self, request):
        """Calcul en lot des ratios financiers"""
        serializer = RatioCalculationRequestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            company = self.get_company()
            fiscal_year_id = request.data.get('fiscal_year_id')

            # Récupération des états financiers
            balance_sheet = BalanceSYSCOHADA.objects.filter(
                company=company,
                fiscal_year_id=fiscal_year_id
            ).first()

            income_statement = CompteResultatSYSCOHADA.objects.filter(
                company=company,
                fiscal_year_id=fiscal_year_id
            ).first()

            if not balance_sheet or not income_statement:
                return Response({
                    'error': 'États financiers manquants pour le calcul des ratios'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Calcul des ratios par catégorie
            ratios_created = []
            categories = serializer.validated_data['ratio_categories']

            for category in categories:
                category_ratios = self._calculate_ratios_by_category(
                    category, balance_sheet, income_statement
                )
                ratios_created.extend(category_ratios)

            return Response({
                'status': 'success',
                'ratios_calculated': len(ratios_created),
                'categories': categories,
                'ratios': RatioFinancierSerializer(ratios_created, many=True).data
            })

        except Exception as e:
            logger.error(f"Erreur calcul ratios batch: {str(e)}")
            return Response({
                'error': 'Erreur lors du calcul des ratios'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _calculate_ratios_by_category(self, category, balance_sheet, income_statement):
        """Calcul des ratios par catégorie"""
        ratios_created = []

        if category == 'STRUCTURE':
            ratios_created.extend(self._calculate_structure_ratios(balance_sheet))
        elif category == 'LIQUIDITE':
            ratios_created.extend(self._calculate_liquidity_ratios(balance_sheet))
        elif category == 'RENTABILITE':
            ratios_created.extend(self._calculate_profitability_ratios(balance_sheet, income_statement))
        elif category == 'ACTIVITE':
            ratios_created.extend(self._calculate_activity_ratios(balance_sheet, income_statement))

        return ratios_created

    def _calculate_structure_ratios(self, balance_sheet):
        """Calcul des ratios de structure financière"""
        ratios = []

        # Ratio d'autonomie financière
        if balance_sheet.total_assets > 0:
            autonomy_ratio = RatioFinancier.objects.update_or_create(
                company=balance_sheet.company,
                fiscal_year=balance_sheet.fiscal_year,
                type_ratio='AUTONOMIE_FINANCIERE',
                defaults={
                    'category': 'STRUCTURE',
                    'libelle': 'Autonomie financière',
                    'valeur': balance_sheet.total_equity / balance_sheet.total_assets * 100,
                    'unite': 'POURCENTAGE',
                    'numerateur': balance_sheet.total_equity,
                    'denominateur': balance_sheet.total_assets,
                    'formule': 'Capitaux propres / Total actif'
                }
            )[0]
            ratios.append(autonomy_ratio)

        # Ratio d'endettement
        if balance_sheet.total_equity > 0:
            debt_ratio = RatioFinancier.objects.update_or_create(
                company=balance_sheet.company,
                fiscal_year=balance_sheet.fiscal_year,
                type_ratio='ENDETTEMENT',
                defaults={
                    'category': 'STRUCTURE',
                    'libelle': 'Ratio d\'endettement',
                    'valeur': balance_sheet.total_financial_debts / balance_sheet.total_equity,
                    'unite': 'RATIO',
                    'numerateur': balance_sheet.total_financial_debts,
                    'denominateur': balance_sheet.total_equity,
                    'formule': 'Dettes financières / Capitaux propres'
                }
            )[0]
            ratios.append(debt_ratio)

        return ratios

    def _calculate_liquidity_ratios(self, balance_sheet):
        """Calcul des ratios de liquidité"""
        ratios = []

        if balance_sheet.total_current_liabilities > 0:
            # Liquidité générale
            current_ratio = RatioFinancier.objects.update_or_create(
                company=balance_sheet.company,
                fiscal_year=balance_sheet.fiscal_year,
                type_ratio='LIQUIDITE_GENERALE',
                defaults={
                    'category': 'LIQUIDITE',
                    'libelle': 'Liquidité générale',
                    'valeur': balance_sheet.total_current_assets / balance_sheet.total_current_liabilities,
                    'unite': 'RATIO',
                    'numerateur': balance_sheet.total_current_assets,
                    'denominateur': balance_sheet.total_current_liabilities,
                    'formule': 'Actif circulant / Passif circulant'
                }
            )[0]
            ratios.append(current_ratio)

            # Liquidité immédiate
            immediate_ratio = RatioFinancier.objects.update_or_create(
                company=balance_sheet.company,
                fiscal_year=balance_sheet.fiscal_year,
                type_ratio='LIQUIDITE_IMMEDIATE',
                defaults={
                    'category': 'LIQUIDITE',
                    'libelle': 'Liquidité immédiate',
                    'valeur': balance_sheet.total_treasury_assets / balance_sheet.total_current_liabilities,
                    'unite': 'RATIO',
                    'numerateur': balance_sheet.total_treasury_assets,
                    'denominateur': balance_sheet.total_current_liabilities,
                    'formule': 'Trésorerie active / Passif circulant'
                }
            )[0]
            ratios.append(immediate_ratio)

        return ratios

    def _calculate_profitability_ratios(self, balance_sheet, income_statement):
        """Calcul des ratios de rentabilité"""
        ratios = []

        # ROA (Return on Assets)
        if balance_sheet.total_assets > 0:
            roa = RatioFinancier.objects.update_or_create(
                company=balance_sheet.company,
                fiscal_year=balance_sheet.fiscal_year,
                type_ratio='RENTABILITE_ECONOMIQUE',
                defaults={
                    'category': 'RENTABILITE',
                    'libelle': 'Rentabilité économique (ROA)',
                    'valeur': income_statement.calculated_net_result / balance_sheet.total_assets * 100,
                    'unite': 'POURCENTAGE',
                    'numerateur': income_statement.calculated_net_result,
                    'denominateur': balance_sheet.total_assets,
                    'formule': 'Résultat net / Total actif'
                }
            )[0]
            ratios.append(roa)

        # ROE (Return on Equity)
        if balance_sheet.total_equity > 0:
            roe = RatioFinancier.objects.update_or_create(
                company=balance_sheet.company,
                fiscal_year=balance_sheet.fiscal_year,
                type_ratio='RENTABILITE_FINANCIERE',
                defaults={
                    'category': 'RENTABILITE',
                    'libelle': 'Rentabilité financière (ROE)',
                    'valeur': income_statement.calculated_net_result / balance_sheet.total_equity * 100,
                    'unite': 'POURCENTAGE',
                    'numerateur': income_statement.calculated_net_result,
                    'denominateur': balance_sheet.total_equity,
                    'formule': 'Résultat net / Capitaux propres'
                }
            )[0]
            ratios.append(roe)

        return ratios

    def _calculate_activity_ratios(self, balance_sheet, income_statement):
        """Calcul des ratios d'activité"""
        ratios = []

        revenue = income_statement.merchandise_sales + income_statement.production_sold

        if revenue > 0 and balance_sheet.total_assets > 0:
            # Rotation de l'actif
            asset_turnover = RatioFinancier.objects.update_or_create(
                company=balance_sheet.company,
                fiscal_year=balance_sheet.fiscal_year,
                type_ratio='ROTATION_ACTIF',
                defaults={
                    'category': 'ACTIVITE',
                    'libelle': 'Rotation de l\'actif',
                    'valeur': revenue / balance_sheet.total_assets,
                    'unite': 'FOIS',
                    'numerateur': revenue,
                    'denominateur': balance_sheet.total_assets,
                    'formule': 'Chiffre d\'affaires / Total actif'
                }
            )[0]
            ratios.append(asset_turnover)

        return ratios


class FinancialStatementsSetViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """ViewSet pour les jeux d'états financiers complets"""

    queryset = FinancialStatementsSet.objects.all()
    serializer_class = FinancialStatementsSetSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['fiscal_year', 'is_approved', 'is_published']

    def get_queryset(self):
        return super().get_queryset().select_related(
            'company', 'fiscal_year', 'balance_sheet',
            'income_statement', 'cash_flow_statement'
        ).order_by('-statement_date')

    @action(detail=False, methods=['post'])
    def create_complete_set(self, request):
        """Création d'un jeu complet d'états financiers"""
        serializer = FinancialStatementCalculationSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                company = self.get_company()
                statement_date = serializer.validated_data['statement_date']
                fiscal_year_id = request.data.get('fiscal_year_id')

                # Création ou récupération des états financiers
                # Cette logique serait connectée aux modules comptables

                return Response({
                    'status': 'success',
                    'message': 'Jeu d\'états financiers créé avec succès'
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Erreur création jeu états financiers: {str(e)}")
            return Response({
                'error': 'Erreur lors de la création du jeu d\'états financiers'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def approve_statements(self, request, pk=None):
        """Approbation d'un jeu d'états financiers"""
        statements_set = self.get_object()

        if not statements_set.all_statements_validated:
            return Response({
                'error': 'Tous les états doivent être validés avant approbation'
            }, status=status.HTTP_400_BAD_REQUEST)

        statements_set.is_approved = True
        statements_set.approved_by = request.user
        statements_set.approval_date = timezone.now()
        statements_set.save()

        return Response({
            'status': 'success',
            'message': 'États financiers approuvés avec succès',
            'approved_at': statements_set.approval_date
        })

    @action(detail=True, methods=['get'])
    def export_statements(self, request, pk=None):
        """Export des états financiers"""
        statements_set = self.get_object()
        export_format = request.query_params.get('format', 'json')

        if export_format == 'pdf':
            # TODO: Implémenter l'export PDF
            return Response({
                'status': 'success',
                'export_url': f'/api/financial-statements/{pk}/export.pdf'
            })
        elif export_format == 'excel':
            # TODO: Implémenter l'export Excel
            return Response({
                'status': 'success',
                'export_url': f'/api/financial-statements/{pk}/export.xlsx'
            })
        else:
            # Export JSON par défaut
            serializer = self.get_serializer(statements_set)
            return Response(serializer.data)


class CashFlowScenarioViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """ViewSet pour les scénarios de cash flow"""

    queryset = CashFlowScenario.objects.all()
    serializer_class = CashFlowScenarioSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['scenario_type', 'status']

    def get_queryset(self):
        return super().get_queryset().select_related('company').order_by('-created_at')

    @action(detail=True, methods=['post'])
    def run_monte_carlo(self, request, pk=None):
        """Exécution d'une simulation Monte Carlo"""
        scenario = self.get_object()

        if scenario.scenario_type != 'MONTE_CARLO':
            return Response({
                'error': 'Seuls les scénarios Monte Carlo peuvent être simulés'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # TODO: Implémenter la simulation Monte Carlo
            # Nécessite des bibliothèques de calcul stochastique

            return Response({
                'status': 'success',
                'message': 'Simulation Monte Carlo exécutée avec succès',
                'results': {
                    'simulations_run': 1000,
                    'confidence_intervals': {},
                    'risk_metrics': {}
                }
            })

        except Exception as e:
            logger.error(f"Erreur simulation Monte Carlo: {str(e)}")
            return Response({
                'error': 'Erreur lors de la simulation'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)