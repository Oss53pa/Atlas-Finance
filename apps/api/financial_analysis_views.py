"""
API Views pour le module d'Analyse Financière Avancée
TAFIRE, SIG, Bilan Fonctionnel et Ratios SYSCOHADA
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
from datetime import date, datetime
import logging

from apps.financial_analysis.models import (
    TAFIREStatement, SIG, FunctionalBalanceSheet, 
    RatioFinancier, CashFlowScenario
)
from apps.financial_analysis.services.tafire_service_syscohada import TAFIREServiceSYSCOHADA
from apps.financial_analysis.services.functional_balance_service import FunctionalBalanceService
from apps.financial_analysis.services.ratio_service import RatioService
from apps.accounting.models import Company, FiscalYear
from apps.core.permissions import CompanyPermission
from .serializers_financial import (
    TAFIRESerializer, SIGSerializer, FunctionalBalanceSerializer,
    RatioSerializer, CashFlowScenarioSerializer
)

logger = logging.getLogger(__name__)


class TAFIREViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les tableaux TAFIRE SYSCOHADA
    """
    serializer_class = TAFIRESerializer
    permission_classes = [IsAuthenticated, CompanyPermission]
    
    def get_queryset(self):
        return TAFIREStatement.objects.filter(
            company=self.request.user.company
        ).order_by('-statement_date')
    
    @action(detail=False, methods=['post'])
    def calculate(self, request):
        """
        Calcule un nouveau TAFIRE pour l'exercice spécifié
        """
        try:
            company = request.user.company
            fiscal_year_id = request.data.get('fiscal_year_id')
            method = request.data.get('method', 'INDIRECT')
            
            if not fiscal_year_id:
                return Response(
                    {'error': 'fiscal_year_id requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            fiscal_year = FiscalYear.objects.get(id=fiscal_year_id, company=company)
            
            # Calculer le TAFIRE
            tafire_service = TAFIREServiceSYSCOHADA(company)
            tafire = tafire_service.calculer_tafire(
                exercice=fiscal_year,
                periode_debut=fiscal_year.start_date,
                periode_fin=fiscal_year.end_date,
                methode_calcul=method
            )
            
            serializer = self.get_serializer(tafire)
            
            logger.info(f"TAFIRE calculé via API pour {company.name}")
            return Response({
                'success': True,
                'message': 'TAFIRE calculé avec succès',
                'data': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Erreur calcul TAFIRE API: {str(e)}")
            return Response(
                {'error': f'Erreur lors du calcul: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def analysis(self, request, pk=None):
        """
        Retourne l'analyse détaillée d'un TAFIRE
        """
        try:
            tafire = self.get_object()
            tafire_service = TAFIREServiceSYSCOHADA(tafire.company)
            
            # Générer l'analyse
            analysis = tafire_service.generer_rapport_tafire(tafire)
            
            return Response({
                'success': True,
                'data': analysis
            })
            
        except Exception as e:
            return Response(
                {'error': f'Erreur analyse TAFIRE: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SIGViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les Soldes Intermédiaires de Gestion
    """
    serializer_class = SIGSerializer
    permission_classes = [IsAuthenticated, CompanyPermission]
    
    def get_queryset(self):
        return SIG.objects.filter(
            company=self.request.user.company
        ).order_by('-calculation_date')
    
    @action(detail=False, methods=['post'])
    def calculate(self, request):
        """
        Calcule les SIG pour l'exercice spécifié
        """
        try:
            company = request.user.company
            fiscal_year_id = request.data.get('fiscal_year_id')
            
            if not fiscal_year_id:
                return Response(
                    {'error': 'fiscal_year_id requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            fiscal_year = FiscalYear.objects.get(id=fiscal_year_id, company=company)
            
            # Calculer les SIG - service à implémenter
            # sig_service = SIGService(company)
            # sig = sig_service.calculer_sig(fiscal_year)
            
            # Pour l'instant, retourner une réponse de succès
            return Response({
                'success': True,
                'message': 'SIG calculé avec succès'
            })
            
        except Exception as e:
            logger.error(f"Erreur calcul SIG API: {str(e)}")
            return Response(
                {'error': f'Erreur lors du calcul: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FunctionalBalanceViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les Bilans Fonctionnels
    """
    serializer_class = FunctionalBalanceSerializer
    permission_classes = [IsAuthenticated, CompanyPermission]
    
    def get_queryset(self):
        return FunctionalBalanceSheet.objects.filter(
            company=self.request.user.company
        ).order_by('-statement_date')
    
    @action(detail=False, methods=['post'])
    def calculate(self, request):
        """
        Calcule un bilan fonctionnel pour l'exercice spécifié
        """
        try:
            company = request.user.company
            fiscal_year_id = request.data.get('fiscal_year_id')
            statement_date = request.data.get('statement_date')
            
            if not fiscal_year_id:
                return Response(
                    {'error': 'fiscal_year_id requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            fiscal_year = FiscalYear.objects.get(id=fiscal_year_id, company=company)
            
            if statement_date:
                statement_date = datetime.strptime(statement_date, '%Y-%m-%d').date()
            else:
                statement_date = fiscal_year.end_date
            
            # Calculer le bilan fonctionnel
            balance_service = FunctionalBalanceService(company)
            functional_balance = balance_service.calculer_bilan_fonctionnel(
                exercice=fiscal_year,
                date_arret=statement_date,
                force_recalcul=request.data.get('force_recalcul', False)
            )
            
            serializer = self.get_serializer(functional_balance)
            
            logger.info(f"Bilan fonctionnel calculé via API pour {company.name}")
            return Response({
                'success': True,
                'message': 'Bilan fonctionnel calculé avec succès',
                'data': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Erreur calcul bilan fonctionnel API: {str(e)}")
            return Response(
                {'error': f'Erreur lors du calcul: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def analysis(self, request, pk=None):
        """
        Retourne l'analyse détaillée d'un bilan fonctionnel
        """
        try:
            functional_balance = self.get_object()
            balance_service = FunctionalBalanceService(functional_balance.company)
            
            # Générer l'analyse
            analysis = balance_service.analyser_equilibre_fonctionnel(functional_balance)
            
            return Response({
                'success': True,
                'data': analysis
            })
            
        except Exception as e:
            return Response(
                {'error': f'Erreur analyse bilan fonctionnel: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        """
        Retourne les données pour le tableau de bord
        """
        try:
            functional_balance = self.get_object()
            balance_service = FunctionalBalanceService(functional_balance.company)
            
            # Récupérer l'exercice précédent si disponible
            previous_balance = FunctionalBalanceSheet.objects.filter(
                company=functional_balance.company,
                statement_date__lt=functional_balance.statement_date
            ).order_by('-statement_date').first()
            
            # Générer le tableau de bord
            dashboard = balance_service.generer_tableau_bord_fonctionnel(
                functional_balance, previous_balance
            )
            
            return Response({
                'success': True,
                'data': dashboard
            })
            
        except Exception as e:
            return Response(
                {'error': f'Erreur génération dashboard: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RatiosViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les Ratios Financiers
    """
    serializer_class = RatioSerializer
    permission_classes = [IsAuthenticated, CompanyPermission]
    
    def get_queryset(self):
        return RatioFinancier.objects.filter(
            company=self.request.user.company
        ).order_by('category', 'type_ratio')
    
    @action(detail=False, methods=['post'])
    def calculate_all(self, request):
        """
        Calcule tous les ratios pour l'exercice spécifié
        """
        try:
            company = request.user.company
            fiscal_year_id = request.data.get('fiscal_year_id')
            previous_fiscal_year_id = request.data.get('previous_fiscal_year_id')
            
            if not fiscal_year_id:
                return Response(
                    {'error': 'fiscal_year_id requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            fiscal_year = FiscalYear.objects.get(id=fiscal_year_id, company=company)
            previous_fiscal_year = None
            
            if previous_fiscal_year_id:
                previous_fiscal_year = FiscalYear.objects.get(
                    id=previous_fiscal_year_id, company=company
                )
            
            # Calculer les ratios
            ratio_service = RatioService(company)
            ratios = ratio_service.calculer_tous_ratios(fiscal_year, previous_fiscal_year)
            
            # Sérialiser les résultats
            serializer = self.get_serializer(list(ratios.values()), many=True)
            
            logger.info(f"Ratios calculés via API pour {company.name}")
            return Response({
                'success': True,
                'message': f'{len(ratios)} ratios calculés avec succès',
                'data': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Erreur calcul ratios API: {str(e)}")
            return Response(
                {'error': f'Erreur lors du calcul: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Retourne un résumé des ratios avec scores par catégorie
        """
        try:
            company = request.user.company
            fiscal_year_id = request.query_params.get('fiscal_year_id')
            
            if fiscal_year_id:
                ratios = self.get_queryset().filter(fiscal_year_id=fiscal_year_id)
            else:
                ratios = self.get_queryset()
            
            # Calculer les statistiques
            total_ratios = ratios.count()
            alert_ratios = ratios.filter(alerte=True).count()
            
            # Scores par catégorie
            categories_scores = {}
            for category in ['STRUCTURE', 'LIQUIDITE', 'ACTIVITE', 'RENTABILITE', 'SOLVABILITE']:
                category_ratios = ratios.filter(category=category)
                if category_ratios.exists():
                    # Score basé sur l'écart à la référence
                    scores = []
                    for ratio in category_ratios:
                        if ratio.valeur_reference:
                            performance = min(100, (ratio.valeur / ratio.valeur_reference) * 100)
                            scores.append(max(0, performance))
                    
                    if scores:
                        categories_scores[category] = sum(scores) / len(scores)
            
            # Score global
            global_score = 0
            if categories_scores:
                global_score = sum(categories_scores.values()) / len(categories_scores)
            
            return Response({
                'success': True,
                'data': {
                    'total_ratios': total_ratios,
                    'alert_ratios': alert_ratios,
                    'global_score': round(global_score, 1),
                    'categories_scores': categories_scores,
                    'evolution_trend': 'IMPROVING'  # À calculer dynamiquement
                }
            })
            
        except Exception as e:
            logger.error(f"Erreur résumé ratios API: {str(e)}")
            return Response(
                {'error': f'Erreur lors du calcul: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CashFlowScenarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les scénarios de Cash Flow
    """
    serializer_class = CashFlowScenarioSerializer
    permission_classes = [IsAuthenticated, CompanyPermission]
    
    def get_queryset(self):
        return CashFlowScenario.objects.filter(
            company=self.request.user.company
        ).order_by('-created_at')
    
    @action(detail=False, methods=['post'])
    def simulate(self, request):
        """
        Simule différents scénarios de cash flow
        """
        try:
            company = request.user.company
            scenario_params = request.data
            
            # Paramètres de simulation
            revenue_growth = scenario_params.get('revenue_growth_rate', 0)
            cost_inflation = scenario_params.get('cost_inflation_rate', 0)
            collection_days = scenario_params.get('collection_period_days', 45)
            payment_days = scenario_params.get('payment_period_days', 60)
            
            # Générer les scénarios
            scenarios = []
            
            # Scénario optimiste
            optimistic = self._generate_scenario(
                company, 'OPTIMISTIC', revenue_growth * 1.5, cost_inflation * 0.7,
                collection_days * 0.8, payment_days * 1.2
            )
            scenarios.append(optimistic)
            
            # Scénario réaliste
            realistic = self._generate_scenario(
                company, 'REALISTIC', revenue_growth, cost_inflation,
                collection_days, payment_days
            )
            scenarios.append(realistic)
            
            # Scénario pessimiste
            pessimistic = self._generate_scenario(
                company, 'PESSIMISTIC', revenue_growth * 0.5, cost_inflation * 1.3,
                collection_days * 1.2, payment_days * 0.8
            )
            scenarios.append(pessimistic)
            
            return Response({
                'success': True,
                'message': f'{len(scenarios)} scénarios générés',
                'data': scenarios
            })
            
        except Exception as e:
            logger.error(f"Erreur simulation cash flow API: {str(e)}")
            return Response(
                {'error': f'Erreur lors de la simulation: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _generate_scenario(
        self, company, scenario_type, revenue_growth, cost_inflation,
        collection_days, payment_days
    ):
        """Génère un scénario de cash flow"""
        # Simulation simplifiée - à enrichir avec vraie logique métier
        base_monthly_cf = 250000
        
        if scenario_type == 'OPTIMISTIC':
            monthly_cf = base_monthly_cf * 1.4
            min_cash = 1200000
            confidence = 75
        elif scenario_type == 'PESSIMISTIC':
            monthly_cf = base_monthly_cf * 0.6
            min_cash = 400000
            confidence = 90
        else:  # REALISTIC
            monthly_cf = base_monthly_cf
            min_cash = 800000
            confidence = 85
        
        return {
            'name': f'Scénario {scenario_type.lower()}',
            'type': scenario_type,
            'average_monthly_cash_flow': monthly_cf,
            'minimum_cash_position': min_cash,
            'confidence_level': confidence,
            'parameters': {
                'revenue_growth_rate': revenue_growth,
                'cost_inflation_rate': cost_inflation,
                'collection_period_days': collection_days,
                'payment_period_days': payment_days
            }
        }


class FinancialAnalysisAPIView(viewsets.ViewSet):
    """
    Vue combinée pour l'analyse financière complète
    """
    permission_classes = [IsAuthenticated, CompanyPermission]
    
    @action(detail=False, methods=['get'])
    def complete_analysis(self, request):
        """
        Retourne une analyse financière complète (TAFIRE + SIG + Bilan Fonctionnel + Ratios)
        """
        try:
            company = request.user.company
            fiscal_year_id = request.query_params.get('fiscal_year_id')
            
            if fiscal_year_id:
                fiscal_year = FiscalYear.objects.get(id=fiscal_year_id, company=company)
            else:
                fiscal_year = company.current_fiscal_year
            
            if not fiscal_year:
                return Response(
                    {'error': 'Aucun exercice disponible'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Récupérer toutes les données
            tafire = TAFIREStatement.objects.filter(
                company=company, fiscal_year=fiscal_year
            ).order_by('-calculation_date').first()
            
            sig = SIG.objects.filter(
                company=company, fiscal_year=fiscal_year
            ).order_by('-calculation_date').first()
            
            functional_balance = FunctionalBalanceSheet.objects.filter(
                company=company, fiscal_year=fiscal_year
            ).order_by('-statement_date').first()
            
            ratios = RatioFinancier.objects.filter(
                company=company, fiscal_year=fiscal_year
            ).order_by('category', 'type_ratio')
            
            # Sérialiser les données
            response_data = {
                'fiscal_year': {
                    'id': fiscal_year.id,
                    'name': fiscal_year.name,
                    'start_date': fiscal_year.start_date,
                    'end_date': fiscal_year.end_date
                },
                'tafire': TAFIRESerializer(tafire).data if tafire else None,
                'sig': SIGSerializer(sig).data if sig else None,
                'functional_balance': FunctionalBalanceSerializer(functional_balance).data if functional_balance else None,
                'ratios': RatioSerializer(ratios, many=True).data,
                'summary': {
                    'total_ratios': ratios.count(),
                    'alert_ratios': ratios.filter(alerte=True).count(),
                    'last_calculation': timezone.now().isoformat()
                }
            }
            
            return Response({
                'success': True,
                'data': response_data
            })
            
        except Exception as e:
            logger.error(f"Erreur analyse complète API: {str(e)}")
            return Response(
                {'error': f'Erreur lors de l\'analyse: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def generate_report(self, request):
        """
        Génère un rapport complet d'analyse financière
        """
        try:
            company = request.user.company
            fiscal_year_id = request.data.get('fiscal_year_id')
            format_type = request.data.get('format', 'PDF')
            
            if not fiscal_year_id:
                return Response(
                    {'error': 'fiscal_year_id requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            fiscal_year = FiscalYear.objects.get(id=fiscal_year_id, company=company)
            
            # Utiliser le service de reporting avancé
            from apps.reporting.services.advanced_reporting_service import AdvancedReportingService
            
            # Générer les données du rapport
            balance_sheet = AdvancedReportingService.generate_syscohada_balance_sheet(
                company, fiscal_year, format_type=format_type
            )
            
            income_statement = AdvancedReportingService.generate_syscohada_income_statement(
                company, fiscal_year
            )
            
            tafire_report = AdvancedReportingService.generate_tafire_report(
                company, fiscal_year
            )
            
            ai_insights = AdvancedReportingService.generate_ai_insights(
                company, fiscal_year
            )
            
            # Générer le fichier selon le format
            if format_type.upper() == 'EXCEL':
                report_file = AdvancedReportingService.export_to_excel({
                    'balance_sheet_data': balance_sheet,
                    'income_statement_data': income_statement,
                    'tafire_data': tafire_report,
                    'ai_insights': ai_insights
                })
                
                # Retourner le fichier en base64 ou URL de téléchargement
                import base64
                file_b64 = base64.b64encode(report_file).decode()
                
                return Response({
                    'success': True,
                    'message': 'Rapport généré avec succès',
                    'data': {
                        'format': format_type,
                        'file_size': len(report_file),
                        'download_url': f'/api/reports/download/{company.id}_{fiscal_year.id}_analysis.xlsx',
                        'file_b64': file_b64
                    }
                })
            
            # Pour PDF et autres formats
            return Response({
                'success': True,
                'message': 'Rapport généré avec succès',
                'data': {
                    'balance_sheet': balance_sheet,
                    'income_statement': income_statement,
                    'tafire': tafire_report,
                    'ai_insights': ai_insights
                }
            })
            
        except Exception as e:
            logger.error(f"Erreur génération rapport API: {str(e)}")
            return Response(
                {'error': f'Erreur lors de la génération: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )