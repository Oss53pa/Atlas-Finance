"""
Vues API REST pour Module Budget WiseBook
Gestion budgétaire intelligente avec IA
Conforme au cahier des charges complet
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q, Count, Sum, Avg, F
from django.utils import timezone
from django.http import HttpResponse, JsonResponse
from django.core.exceptions import ValidationError
import pandas as pd
from datetime import date, timedelta
from decimal import Decimal

from apps.core.mixins import CompanyFilterMixin
from apps.core.permissions import IsCompanyMember
from .models import (
    BudgetPlan, BudgetLine, BudgetDepartment, BudgetComparison,
    BudgetForecast, BudgetAlert, BudgetTemplate, BudgetAnalytics,
    BudgetWorkflow, BudgetReport, BudgetImportLog
)
from .services import (
    BudgetPredictionService, BudgetAnalyticsService, BudgetAlertService,
    BudgetImportService
)


class BudgetPlanViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """
    ViewSet principal pour plans budgétaires
    Conforme architecture système selon cahier des charges
    """

    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    def get_queryset(self):
        return BudgetPlan.objects.filter(company=self.get_company()).select_related(
            'fiscal_year', 'created_by'
        ).prefetch_related('budget_lines')

    def perform_create(self, serializer):
        """Création avec initialisation automatique"""
        budget_plan = serializer.save(
            company=self.get_company(),
            created_by=self.request.user
        )

        # Initialisation des départements et comptes par défaut
        self._initialize_budget_structure(budget_plan)

    def _initialize_budget_structure(self, budget_plan: BudgetPlan):
        """Initialisation automatique de la structure budgétaire"""
        # Création des départements par défaut
        default_departments = [
            {'code': 'COMM', 'name': 'Commercial'},
            {'code': 'PROD', 'name': 'Production'},
            {'code': 'ADMIN', 'name': 'Administration'},
            {'code': 'RD', 'name': 'R&D'},
            {'code': 'MARK', 'name': 'Marketing'},
        ]

        for dept_data in default_departments:
            dept, created = BudgetDepartment.objects.get_or_create(
                company=self.get_company(),
                code=dept_data['code'],
                defaults={'name': dept_data['name']}
            )

    @action(detail=True, methods=['post'])
    def generer_previsions_ia(self, request, pk=None):
        """
        Génération de prévisions avec IA
        Conforme Module de Planification Budgétaire Prédictive
        """
        budget_plan = self.get_object()

        prediction_service = BudgetPredictionService(
            self.get_company(),
            budget_plan.fiscal_year.year
        )

        # Paramètres de prédiction
        account_codes = request.data.get('account_codes', [])
        department_ids = request.data.get('department_ids', [])
        months_ahead = request.data.get('months_ahead', 12)

        resultats_predictions = []

        # Génération pour chaque combinaison compte/département
        for account_code in account_codes:
            for department_id in department_ids:
                try:
                    prediction = prediction_service.predire_budget_ia(
                        account_code,
                        department_id,
                        months_ahead
                    )

                    if 'erreur' not in prediction:
                        resultats_predictions.append({
                            'account_code': account_code,
                            'department_id': department_id,
                            'prediction': prediction
                        })

                        # Sauvegarde en base
                        self._save_prediction_to_db(
                            budget_plan,
                            account_code,
                            department_id,
                            prediction
                        )

                except Exception as e:
                    resultats_predictions.append({
                        'account_code': account_code,
                        'department_id': department_id,
                        'erreur': str(e)
                    })

        return Response({
            'budget_plan_id': str(budget_plan.id),
            'predictions_generees': len(resultats_predictions),
            'resultats': resultats_predictions,
            'generated_at': timezone.now()
        })

    def _save_prediction_to_db(self, budget_plan, account_code, department_id, prediction):
        """Sauvegarde des prédictions en base"""
        try:
            account = self.get_company().chart_of_accounts.get(code=account_code)
            department = BudgetDepartment.objects.get(
                id=department_id,
                company=self.get_company()
            )

            # Création/mise à jour BudgetForecast
            forecast, created = BudgetForecast.objects.get_or_create(
                budget_line__budget_plan=budget_plan,
                budget_line__account=account,
                budget_line__department=department,
                defaults={
                    'model_type': prediction['model_used'],
                    'predicted_values': prediction['predictions'],
                    'overall_confidence': Decimal(str(prediction['confidence_score'])),
                    'seasonality_type': 'DETECTED' if prediction['seasonality']['detected'] else 'NONE',
                    'generated_by': self.request.user
                }
            )

        except Exception as e:
            print(f"Erreur sauvegarde prédiction: {e}")

    @action(detail=True, methods=['get'])
    def dashboard_executive(self, request, pk=None):
        """
        Dashboard executive avec KPIs
        Conforme Vue d'ensemble executive avec KPIs clés
        """
        budget_plan = self.get_object()

        analytics_service = BudgetAnalyticsService(self.get_company())
        dashboard_data = analytics_service.generer_dashboard_executive(
            budget_plan.fiscal_year.year
        )

        return Response(dashboard_data)

    @action(detail=True, methods=['post'])
    def analyser_variances(self, request, pk=None):
        """
        Analyse détaillée des variances
        Drill-down des écarts selon cahier des charges
        """
        budget_plan = self.get_object()

        # Filtres
        department_id = request.data.get('department_id')
        account_code = request.data.get('account_code')
        seuil_variance = request.data.get('seuil_variance', 5.0)

        # Construction de la requête
        queryset = budget_plan.budget_lines.all()

        if department_id:
            queryset = queryset.filter(department_id=department_id)

        if account_code:
            queryset = queryset.filter(account__code__startswith=account_code)

        # Calcul des variances significatives
        variances_significatives = []

        for line in queryset:
            if abs(line.variance_percent) >= seuil_variance:
                # Analyse détaillée de la variance
                variance_analysis = self._analyze_variance_detail(line)

                variances_significatives.append({
                    'ligne_budgetaire': {
                        'id': str(line.id),
                        'department': line.department.name,
                        'account': {
                            'code': line.account.code,
                            'name': line.account.name
                        },
                        'mois': line.month
                    },
                    'montants': {
                        'budget': float(line.budget_revised),
                        'reel': float(line.actual),
                        'ecart_montant': float(line.variance_amount),
                        'ecart_pourcentage': float(line.variance_percent)
                    },
                    'analyse': variance_analysis
                })

        return Response({
            'budget_plan': str(budget_plan.id),
            'periode_analyse': f"{budget_plan.fiscal_year.year}",
            'seuil_variance': seuil_variance,
            'nombre_variances': len(variances_significatives),
            'variances': variances_significatives,
            'analyse_le': timezone.now()
        })

    def _analyze_variance_detail(self, budget_line: BudgetLine) -> Dict[str, Any]:
        """Analyse détaillée d'une variance"""

        # Classification de la variance
        variance_percent = abs(budget_line.variance_percent)

        if variance_percent > 20:
            severity = 'CRITIQUE'
            color = 'red'
        elif variance_percent > 10:
            severity = 'IMPORTANTE'
            color = 'orange'
        else:
            severity = 'MODEREE'
            color = 'yellow'

        # Comparaison historique
        historical_comparison = self._get_historical_variance_pattern(budget_line)

        # Causes probables
        probable_causes = self._suggest_variance_causes(budget_line)

        return {
            'severity': severity,
            'color_indicator': color,
            'historical_pattern': historical_comparison,
            'probable_causes': probable_causes,
            'recommendations': self._generate_variance_recommendations(budget_line)
        }

    def _get_historical_variance_pattern(self, budget_line: BudgetLine) -> Dict[str, Any]:
        """Pattern historique des variances pour ce compte/département"""

        # Recherche des 6 derniers mois même compte/département
        similar_lines = BudgetLine.objects.filter(
            department=budget_line.department,
            account=budget_line.account,
            fiscal_year__in=[budget_line.fiscal_year - 1, budget_line.fiscal_year]
        ).exclude(id=budget_line.id).order_by('-fiscal_year', '-month')[:6]

        if not similar_lines.exists():
            return {'pattern': 'NOUVEAU', 'confiance': 'FAIBLE'}

        # Calcul des variances historiques
        variances_hist = [float(line.variance_percent) for line in similar_lines]
        variance_moyenne = sum(variances_hist) / len(variances_hist)
        variance_actuelle = float(budget_line.variance_percent)

        # Classification du pattern
        if abs(variance_actuelle - variance_moyenne) < 5:
            pattern = 'NORMAL'
        elif abs(variance_actuelle) > abs(variance_moyenne) * 1.5:
            pattern = 'ANORMAL'
        else:
            pattern = 'ATYPIQUE'

        return {
            'pattern': pattern,
            'variance_moyenne_hist': round(variance_moyenne, 1),
            'variance_actuelle': round(variance_actuelle, 1),
            'nb_mois_analyse': len(variances_hist),
            'confiance': 'HAUTE' if len(variances_hist) >= 6 else 'MOYENNE'
        }

    def _suggest_variance_causes(self, budget_line: BudgetLine) -> List[str]:
        """Suggestions automatiques des causes de variance"""
        causes = []

        # Analyse selon type de compte
        account_code = budget_line.account.code

        if account_code.startswith('60'):  # Achats
            if budget_line.variance_percent > 0:
                causes.extend([
                    "Augmentation des prix fournisseurs",
                    "Hausse des volumes d'achat",
                    "Inflation matières premières"
                ])
            else:
                causes.extend([
                    "Négociation tarifaire favorable",
                    "Baisse de l'activité",
                    "Report de commandes"
                ])

        elif account_code.startswith('61'):  # Services extérieurs
            if budget_line.variance_percent > 0:
                causes.extend([
                    "Prestations supplémentaires non budgétées",
                    "Augmentation tarifs prestataires",
                    "Besoins techniques imprévus"
                ])

        elif account_code.startswith('64'):  # Personnel
            if budget_line.variance_percent > 0:
                causes.extend([
                    "Recrutements non planifiés",
                    "Heures supplémentaires",
                    "Augmentations salariales"
                ])

        # Causes génériques
        if abs(budget_line.variance_percent) > 15:
            causes.append("Variance importante - Analyse approfondie recommandée")

        return causes[:5]  # Limiter à 5 suggestions

    def _generate_variance_recommendations(self, budget_line: BudgetLine) -> List[str]:
        """Recommandations automatiques pour traiter la variance"""
        recommendations = []

        variance = budget_line.variance_percent

        if variance > 10:  # Dépassement
            recommendations.extend([
                "Analyser les causes du dépassement avec le responsable",
                "Réviser les prévisions pour les mois suivants",
                "Mettre en place des mesures correctives",
                "Renforcer les contrôles d'engagement"
            ])

        elif variance < -10:  # Sous-consommation
            recommendations.extend([
                "Vérifier si les objectifs sont réalisables",
                "Réallouer le budget disponible",
                "Accélérer les projets prévus",
                "Réviser les prévisions à la baisse"
            ])

        else:  # Variance normale
            recommendations.append("Variance dans les limites acceptables - Maintenir le suivi")

        return recommendations


class BudgetLineViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """
    ViewSet pour lignes budgétaires
    Saisie détaillée selon grille matricielle du cahier des charges
    """

    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    def get_queryset(self):
        return BudgetLine.objects.filter(
            budget_plan__company=self.get_company()
        ).select_related(
            'budget_plan', 'department', 'account', 'created_by'
        )

    @action(detail=False, methods=['post'])
    def saisie_matricielle(self, request):
        """
        Saisie budgétaire matricielle
        Conforme Interface de Saisie Matricielle du cahier des charges
        """
        budget_plan_id = request.data.get('budget_plan_id')
        department_id = request.data.get('department_id')
        month = request.data.get('month')
        budget_data = request.data.get('budget_data', [])

        if not all([budget_plan_id, department_id, month]):
            return Response(
                {'erreur': 'budget_plan_id, department_id et month requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            budget_plan = BudgetPlan.objects.get(
                id=budget_plan_id,
                company=self.get_company()
            )
            department = BudgetDepartment.objects.get(
                id=department_id,
                company=self.get_company()
            )

            lignes_creees = []
            lignes_modifiees = []

            # Traitement ligne par ligne
            for line_data in budget_data:
                account_code = line_data.get('account_code')
                budget_amount = Decimal(str(line_data.get('budget_amount', 0)))

                try:
                    account = self.get_company().chart_of_accounts.get(code=account_code)

                    # Création ou mise à jour
                    budget_line, created = BudgetLine.objects.update_or_create(
                        budget_plan=budget_plan,
                        department=department,
                        account=account,
                        month=month,
                        defaults={
                            'fiscal_year': budget_plan.fiscal_year.year,
                            'budget_initial': budget_amount,
                            'budget_revised': budget_amount,
                            'category': self._determine_category(account_code),
                            'entry_method': 'MANUAL',
                            'comments': line_data.get('comments', ''),
                            'created_by': request.user,
                            'last_modified_by': request.user,
                        }
                    )

                    if created:
                        lignes_creees.append(str(budget_line.id))
                    else:
                        lignes_modifiees.append(str(budget_line.id))

                except Exception as e:
                    print(f"Erreur ligne {account_code}: {e}")

            return Response({
                'budget_plan_id': str(budget_plan.id),
                'department': department.name,
                'month': month,
                'lignes_creees': len(lignes_creees),
                'lignes_modifiees': len(lignes_modifiees),
                'total_lignes': len(budget_data),
                'timestamp': timezone.now()
            })

        except Exception as e:
            return Response(
                {'erreur': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _determine_category(self, account_code: str) -> str:
        """Détermine automatiquement la catégorie selon le compte"""
        if account_code.startswith('7'):
            return 'REVENUE'
        elif account_code.startswith('6'):
            return 'CHARGES'
        elif account_code.startswith('2'):
            return 'INVESTMENT'
        else:
            return 'CHARGES'

    @action(detail=False, methods=['get'])
    def grille_saisie(self, request):
        """
        Récupération de la grille de saisie
        Structure pour interface matricielle
        """
        budget_plan_id = request.query_params.get('budget_plan_id')
        department_id = request.query_params.get('department_id')

        if not budget_plan_id or not department_id:
            return Response(
                {'erreur': 'budget_plan_id et department_id requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Récupération des lignes existantes
            budget_lines = self.get_queryset().filter(
                budget_plan_id=budget_plan_id,
                department_id=department_id
            ).order_by('account__code', 'month')

            # Structure de la grille
            grille_data = {}

            for line in budget_lines:
                account_code = line.account.code
                if account_code not in grille_data:
                    grille_data[account_code] = {
                        'account_code': account_code,
                        'account_name': line.account.name,
                        'category': line.category,
                        'mois': {}
                    }

                grille_data[account_code]['mois'][line.month] = {
                    'id': str(line.id),
                    'budget_initial': float(line.budget_initial),
                    'budget_revised': float(line.budget_revised),
                    'actual': float(line.actual),
                    'committed': float(line.committed),
                    'available': float(line.available),
                    'variance_percent': float(line.variance_percent),
                    'comments': line.comments,
                    'last_modified': line.updated_at
                }

            return Response({
                'grille_data': list(grille_data.values()),
                'department_info': {
                    'id': department_id,
                    'code': BudgetDepartment.objects.get(id=department_id).code,
                    'name': BudgetDepartment.objects.get(id=department_id).name
                },
                'budget_plan_info': {
                    'id': budget_plan_id,
                    'name': BudgetPlan.objects.get(id=budget_plan_id).name
                }
            })

        except Exception as e:
            return Response(
                {'erreur': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BudgetDashboardViewSet(CompanyFilterMixin, viewsets.ViewSet):
    """
    ViewSet pour dashboards et analyses
    Tableaux de bord interactifs selon cahier des charges
    """

    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    @action(detail=False, methods=['get'])
    def stats_principales(self, request):
        """
        Statistiques principales pour dashboard
        KPIs temps réel selon cahier des charges
        """
        fiscal_year = int(request.query_params.get('fiscal_year', date.today().year))

        # Service analytics
        analytics_service = BudgetAnalyticsService(self.get_company())
        dashboard_data = analytics_service.generer_dashboard_executive(fiscal_year)

        return Response(dashboard_data)

    @action(detail=False, methods=['get'])
    def comparaison_ytd(self, request):
        """
        Comparaison YTD détaillée
        YTD Analysis selon cahier des charges
        """
        fiscal_year = int(request.query_params.get('fiscal_year', date.today().year))
        current_month = date.today().month

        # YTD année courante
        ytd_current = BudgetLine.objects.filter(
            budget_plan__company=self.get_company(),
            fiscal_year=fiscal_year,
            month__lte=current_month
        ).aggregate(
            budget_ytd=Sum('budget_revised'),
            actual_ytd=Sum('actual'),
            committed_ytd=Sum('committed')
        )

        # YTD année précédente
        ytd_previous = BudgetLine.objects.filter(
            budget_plan__company=self.get_company(),
            fiscal_year=fiscal_year - 1,
            month__lte=current_month
        ).aggregate(
            actual_ytd=Sum('actual')
        )

        # Calculs
        budget_ytd = ytd_current['budget_ytd'] or 0
        actual_ytd = ytd_current['actual_ytd'] or 0
        committed_ytd = ytd_current['committed_ytd'] or 0
        previous_ytd = ytd_previous['actual_ytd'] or 0

        # Métriques calculées
        execution_rate = (actual_ytd / budget_ytd * 100) if budget_ytd > 0 else 0
        yoy_variance = ((actual_ytd - previous_ytd) / previous_ytd * 100) if previous_ytd > 0 else 0

        return Response({
            'periode': {
                'fiscal_year': fiscal_year,
                'mois_current': current_month,
                'pourcentage_annee': round(current_month / 12 * 100, 1)
            },
            'ytd_metrics': {
                'budget_ytd': float(budget_ytd),
                'actual_ytd': float(actual_ytd),
                'committed_ytd': float(committed_ytd),
                'available_ytd': float(budget_ytd - actual_ytd - committed_ytd),
                'execution_rate': round(execution_rate, 1),
                'variance_amount': float(actual_ytd - budget_ytd),
                'variance_percent': round((actual_ytd - budget_ytd) / budget_ytd * 100, 1) if budget_ytd > 0 else 0
            },
            'yoy_comparison': {
                'current_ytd': float(actual_ytd),
                'previous_ytd': float(previous_ytd),
                'variance_amount': float(actual_ytd - previous_ytd),
                'variance_percent': round(yoy_variance, 1)
            },
            'generated_at': timezone.now()
        })

    @action(detail=False, methods=['get'])
    def analyse_departements(self, request):
        """
        Analyse par département
        Performance départementale selon cahier des charges
        """
        fiscal_year = int(request.query_params.get('fiscal_year', date.today().year))

        # Agrégation par département
        dept_analysis = BudgetLine.objects.filter(
            budget_plan__company=self.get_company(),
            fiscal_year=fiscal_year
        ).values(
            'department__code',
            'department__name',
            'department__manager__first_name',
            'department__manager__last_name'
        ).annotate(
            budget_total=Sum('budget_revised'),
            actual_total=Sum('actual'),
            committed_total=Sum('committed'),
            nb_lignes=Count('id')
        )

        # Enrichissement avec calculs
        departments_data = []
        for dept in dept_analysis:
            budget = dept['budget_total'] or 0
            actual = dept['actual_total'] or 0
            committed = dept['committed_total'] or 0

            variance_amount = actual - budget
            variance_percent = (variance_amount / budget * 100) if budget > 0 else 0
            execution_rate = (actual / budget * 100) if budget > 0 else 0

            # Classification performance
            if execution_rate <= 95:
                performance = 'EXCELLENT'
                color = 'green'
            elif execution_rate <= 105:
                performance = 'BON'
                color = 'blue'
            elif execution_rate <= 115:
                performance = 'ATTENTION'
                color = 'orange'
            else:
                performance = 'CRITIQUE'
                color = 'red'

            departments_data.append({
                'department': {
                    'code': dept['department__code'],
                    'name': dept['department__name'],
                    'manager': f"{dept['department__manager__first_name'] or ''} {dept['department__manager__last_name'] or ''}".strip()
                },
                'budget': {
                    'budget_total': float(budget),
                    'actual_total': float(actual),
                    'committed_total': float(committed),
                    'available': float(budget - actual - committed),
                },
                'performance': {
                    'execution_rate': round(execution_rate, 1),
                    'variance_amount': float(variance_amount),
                    'variance_percent': round(variance_percent, 1),
                    'classification': performance,
                    'color_indicator': color
                },
                'statistiques': {
                    'nb_lignes_budget': dept['nb_lignes'],
                }
            })

        # Tri par variance décroissante (plus gros écarts en premier)
        departments_data.sort(key=lambda x: abs(x['performance']['variance_percent']), reverse=True)

        return Response({
            'fiscal_year': fiscal_year,
            'nombre_departements': len(departments_data),
            'departements': departments_data,
            'totaux_globaux': {
                'budget_total': sum(d['budget']['budget_total'] for d in departments_data),
                'actual_total': sum(d['budget']['actual_total'] for d in departments_data),
                'variance_globale': sum(d['performance']['variance_amount'] for d in departments_data),
            },
            'analyse_le': timezone.now()
        })


class BudgetAlertViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """
    ViewSet pour gestion des alertes
    Système d'alertes configurables selon cahier des charges
    """

    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    def get_queryset(self):
        return BudgetAlert.objects.filter(
            budget_line__budget_plan__company=self.get_company()
        ).select_related(
            'budget_line__department',
            'budget_line__account',
            'assigned_to'
        )

    @action(detail=False, methods=['post'])
    def evaluer_alertes_automatiques(self, request):
        """
        Évaluation automatique des alertes
        Conforme Système d'alertes multicritères
        """
        alert_service = BudgetAlertService(self.get_company())
        results = alert_service.evaluer_alertes_automatiques()

        return Response(results)

    @action(detail=False, methods=['get'])
    def dashboard_alertes(self, request):
        """Dashboard des alertes actives"""
        alertes_actives = self.get_queryset().filter(status='ACTIVE').order_by('-priority', '-created_at')

        # Regroupement par priorité
        alertes_par_priorite = {}
        for priority_level in [5, 4, 3, 2, 1]:
            alertes_priorite = alertes_actives.filter(priority=priority_level)
            alertes_par_priorite[priority_level] = {
                'count': alertes_priorite.count(),
                'alertes': [
                    {
                        'id': str(alerte.id),
                        'title': alerte.title,
                        'message': alerte.message,
                        'department': alerte.budget_line.department.name,
                        'account': alerte.budget_line.account.name,
                        'created_at': alerte.created_at,
                        'assigned_to': alerte.assigned_to.get_full_name() if alerte.assigned_to else None
                    }
                    for alerte in alertes_priorite[:5]  # Top 5 par priorité
                ]
            }

        return Response({
            'alertes_par_priorite': alertes_par_priorite,
            'total_alertes_actives': alertes_actives.count(),
            'derniere_evaluation': timezone.now()
        })

    @action(detail=True, methods=['post'])
    def accuser_reception(self, request, pk=None):
        """Accusé de réception d'une alerte"""
        alerte = self.get_object()

        alerte.status = 'ACKNOWLEDGED'
        alerte.acknowledged_by = request.user
        alerte.acknowledged_at = timezone.now()
        alerte.save()

        return Response({
            'message': 'Alerte accusée réception',
            'alerte_id': str(alerte.id)
        })


class BudgetImportViewSet(CompanyFilterMixin, viewsets.ViewSet):
    """
    ViewSet pour import/export budgétaire
    Import Excel/CSV avec validation selon cahier des charges
    """

    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]
    parser_classes = [MultiPartParser, FormParser]

    @action(detail=False, methods=['post'])
    def import_excel(self, request):
        """
        Import Excel intelligent
        Conforme Import en masse depuis Excel avec validation
        """
        fichier = request.FILES.get('fichier')
        budget_plan_id = request.data.get('budget_plan_id')

        if not fichier or not budget_plan_id:
            return Response(
                {'erreur': 'Fichier et budget_plan_id requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            budget_plan = BudgetPlan.objects.get(
                id=budget_plan_id,
                company=self.get_company()
            )

            import_service = BudgetImportService(self.get_company(), request.user)
            results = import_service.importer_excel_intelligent(
                fichier,
                budget_plan,
                request.data.get('mapping_config')
            )

            return Response(results)

        except BudgetPlan.DoesNotExist:
            return Response(
                {'erreur': 'Plan budgétaire non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'])
    def export_excel(self, request):
        """Export Excel avec formatage avancé"""
        budget_plan_id = request.data.get('budget_plan_id')
        include_charts = request.data.get('include_charts', True)
        include_analytics = request.data.get('include_analytics', True)

        # Logique d'export (à implémenter)
        return Response({
            'message': 'Export Excel en cours de développement',
            'config': {
                'budget_plan_id': budget_plan_id,
                'include_charts': include_charts,
                'include_analytics': include_analytics
            }
        })

    @action(detail=False, methods=['get'])
    def templates_disponibles(self, request):
        """Liste des templates de budget disponibles"""
        templates = BudgetTemplate.objects.filter(
            company=self.get_company(),
            is_public=True
        ).order_by('-usage_count', 'name')

        templates_data = []
        for template in templates:
            templates_data.append({
                'id': str(template.id),
                'name': template.name,
                'description': template.description,
                'type': template.template_type,
                'usage_count': template.usage_count,
                'created_by': template.created_by.get_full_name() if template.created_by else None,
                'departments_count': template.departments.count(),
                'accounts_count': len(template.account_codes)
            })

        return Response({
            'templates': templates_data,
            'total_templates': len(templates_data)
        })


class BudgetReportViewSet(CompanyFilterMixin, viewsets.ViewSet):
    """
    ViewSet pour reporting budgétaire
    Génération automatique selon cahier des charges
    """

    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    @action(detail=False, methods=['post'])
    def generer_rapport_mensuel(self, request):
        """
        Génération automatique rapport mensuel
        Conforme Rapport de contrôle de gestion complet
        """
        fiscal_year = request.data.get('fiscal_year', date.today().year)
        month = request.data.get('month', date.today().month)
        departments = request.data.get('departments', [])  # Liste IDs départements

        # Configuration du rapport
        report_config = {
            'fiscal_year': fiscal_year,
            'month': month,
            'departments': departments,
            'include_details': request.data.get('include_details', True),
            'include_charts': request.data.get('include_charts', True),
            'include_predictions': request.data.get('include_predictions', False),
        }

        # Génération asynchrone du rapport
        # En production, utiliser Celery pour traitement asynchrone
        rapport_data = self._generer_rapport_structure(report_config)

        return Response({
            'message': 'Rapport généré avec succès',
            'config': report_config,
            'rapport': rapport_data,
            'genere_le': timezone.now()
        })

    def _generer_rapport_structure(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Structure du rapport budgétaire"""

        fiscal_year = config['fiscal_year']
        month = config['month']

        # Section 1: Synthèse Executive
        synthese = self._generer_synthese_executive(fiscal_year, month)

        # Section 2: Analyse par Département
        analyse_dept = self._generer_analyse_departements(fiscal_year, month, config['departments'])

        # Section 3: Détail par Compte
        detail_comptes = self._generer_detail_comptes(fiscal_year, month)

        # Section 4: Projections
        projections = self._generer_projections(fiscal_year) if config['include_predictions'] else {}

        return {
            'synthese_executive': synthese,
            'analyse_departements': analyse_dept,
            'detail_comptes': detail_comptes,
            'projections': projections,
            'metadata': {
                'periode': f"{month}/{fiscal_year}",
                'genere_le': timezone.now(),
                'config': config
            }
        }

    def _generer_synthese_executive(self, fiscal_year: int, month: int) -> Dict[str, Any]:
        """Synthèse executive pour rapport"""
        analytics_service = BudgetAnalyticsService(self.get_company())
        dashboard_data = analytics_service.generer_dashboard_executive(fiscal_year)

        return {
            'kpis_principaux': dashboard_data['kpis_principaux'],
            'alertes_majeures': dashboard_data['alertes_critiques'][:3],
            'tendances_cles': dashboard_data['analyses_comparatives'],
            'recommandations': dashboard_data['recommandations_ia']
        }

    def _generer_analyse_departements(self, fiscal_year: int, month: int, dept_ids: List[str]) -> List[Dict]:
        """Analyse détaillée par département"""
        departments_data = []

        departments = BudgetDepartment.objects.filter(company=self.get_company())
        if dept_ids:
            departments = departments.filter(id__in=dept_ids)

        for dept in departments:
            # Données du département pour le mois
            dept_lines = BudgetLine.objects.filter(
                budget_plan__company=self.get_company(),
                fiscal_year=fiscal_year,
                month=month,
                department=dept
            )

            if dept_lines.exists():
                dept_summary = dept_lines.aggregate(
                    budget_total=Sum('budget_revised'),
                    actual_total=Sum('actual'),
                    nb_lignes=Count('id')
                )

                departments_data.append({
                    'department': {
                        'code': dept.code,
                        'name': dept.name,
                        'manager': dept.manager.get_full_name() if dept.manager else None
                    },
                    'performance': dept_summary,
                    'top_comptes': list(
                        dept_lines.order_by('-actual')[:5].values(
                            'account__code',
                            'account__name',
                            'actual',
                            'budget_revised'
                        )
                    )
                })

        return departments_data