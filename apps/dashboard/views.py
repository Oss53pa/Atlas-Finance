"""
Dashboard Views

API endpoints for executive dashboard and analytics.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q, Avg, F
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from apps.core.models import Societe
from apps.accounting.models import FiscalYear, JournalEntry, JournalEntryLine
from apps.third_party.models import Tiers
from .models import Notification, DashboardExport
from .serializers import (
    ConsolidatedKPISerializer,
    OperationalMetricsSerializer,
    FinancialTrendsSerializer,
    CriticalAlertSerializer,
    PerformanceBenchmarkSerializer,
    NotificationSerializer,
    NotificationListSerializer,
    NotificationCreateSerializer,
    DashboardExportSerializer,
    DashboardExportCreateSerializer
)
from .services import (
    FinancialCalculator,
    AlertService,
    NotificationService,
    DashboardExportService
)


class DashboardIndexView(APIView):
    """
    GET /api/v1/dashboard/
    Liste tous les endpoints disponibles du dashboard.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        endpoints = {
            'message': 'WiseBook Dashboard API - Endpoints disponibles',
            'version': '3.0.0',
            'endpoints': {
                'consolidated_kpis': {
                    'url': '/api/v1/dashboard/consolidated-kpis/',
                    'method': 'GET',
                    'description': 'KPIs financiers consolidés de l\'entreprise'
                },
                'treasury_position': {
                    'url': '/api/v1/dashboard/treasury/position/',
                    'method': 'GET',
                    'description': 'Position de trésorerie en temps réel'
                },
                'receivables_overview': {
                    'url': '/api/v1/dashboard/receivables/overview/',
                    'method': 'GET',
                    'description': 'Vue d\'ensemble des créances clients'
                },
                'payables_overview': {
                    'url': '/api/v1/dashboard/payables/overview/',
                    'method': 'GET',
                    'description': 'Vue d\'ensemble des dettes fournisseurs'
                },
                'cashflow_forecast': {
                    'url': '/api/v1/dashboard/cashflow/forecast/',
                    'method': 'GET',
                    'description': 'Prévisions de flux de trésorerie'
                },
                'performance_trends': {
                    'url': '/api/v1/dashboard/performance/trends/',
                    'method': 'GET',
                    'description': 'Tendances de performance financière'
                }
            },
            'authentication': {
                'type': 'JWT Bearer Token',
                'header': 'Authorization: Bearer <token>',
                'login_endpoint': '/api/v1/auth/login/'
            }
        }
        return Response(endpoints, status=status.HTTP_200_OK)


class ConsolidatedKPIsView(APIView):
    """
    GET /api/dashboard/consolidated-kpis/

    Consolidated KPIs for executive dashboard.
    Query params:
    - company_id: Filter by company (optional)
    - fiscal_year_id: Filter by fiscal year (optional)
    - period: Time period (default: current)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company_id = request.query_params.get('company_id')
        fiscal_year_id = request.query_params.get('fiscal_year_id')

        # Filter base queryset
        companies = Societe.objects.filter(is_active=True)
        if company_id:
            companies = companies.filter(id=company_id)

        # Get customers and suppliers
        tiers_query = Tiers.objects.filter(is_active=True)
        if company_id:
            tiers_query = tiers_query.filter(company_id=company_id)

        total_customers = tiers_query.filter(
            Q(third_party_type='customer') | Q(third_party_type='both')
        ).count()

        active_customers = tiers_query.filter(
            Q(third_party_type='customer') | Q(third_party_type='both'),
            is_active=True
        ).count()

        total_suppliers = tiers_query.filter(
            Q(third_party_type='supplier') | Q(third_party_type='both')
        ).count()

        active_suppliers = tiers_query.filter(
            Q(third_party_type='supplier') | Q(third_party_type='both'),
            is_active=True
        ).count()

        # Calculate financial metrics from accounting entries using FinancialCalculator
        calculator = FinancialCalculator(
            company_id=company_id,
            fiscal_year_id=fiscal_year_id
        )

        # Get all financial metrics from real accounting data
        financial_metrics = calculator.calculate_all_metrics()

        # Merge financial metrics with customer/supplier data
        kpis = {
            # Financial metrics from real journal entries (SYSCOHADA)
            'total_assets': financial_metrics['total_assets'],
            'total_liabilities': financial_metrics['total_liabilities'],
            'equity': financial_metrics['equity'],
            'revenue': financial_metrics['revenue'],
            'net_income': financial_metrics['net_income'],
            'ebitda': financial_metrics['ebitda'],
            'cash_position': financial_metrics['cash_position'],
            'working_capital': financial_metrics['working_capital'],

            # Financial ratios from real data
            'quick_ratio': financial_metrics['quick_ratio'],
            'current_ratio': financial_metrics['current_ratio'],
            'debt_to_equity': financial_metrics['debt_to_equity'],
            'roe': financial_metrics['roe'],
            'roa': financial_metrics['roa'],

            # Real customer/supplier metrics
            'total_customers': total_customers,
            'active_customers': active_customers,
            'total_suppliers': total_suppliers,
            'active_suppliers': active_suppliers,

            # Working capital metrics (calculated from real data)
            'dso': calculator.calculate_dso(),  # Days Sales Outstanding
            'dpo': calculator.calculate_dpo(),  # Days Payable Outstanding
            'cash_conversion_cycle': calculator.calculate_ccc(),  # Cash Conversion Cycle

            # Receivables and Payables from real data
            'overdue_receivables': financial_metrics['receivables'],
            'overdue_payables': financial_metrics['payables'],
        }

        serializer = ConsolidatedKPISerializer(kpis)
        return Response(serializer.data, status=status.HTTP_200_OK)


class OperationalMetricsView(APIView):
    """
    GET /api/dashboard/operational-metrics/

    Operational performance metrics.
    Query params:
    - company_id: Filter by company
    - period: Time period
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company_id = request.query_params.get('company_id')

        # Get company
        try:
            company = Societe.objects.get(id=company_id) if company_id else None
        except Societe.DoesNotExist:
            company = None

        # Calculate operational metrics from real data
        calculator = FinancialCalculator(company=company)
        metrics = calculator.calculate_operational_metrics()

        serializer = OperationalMetricsSerializer(metrics)
        return Response(serializer.data, status=status.HTTP_200_OK)


class FinancialTrendsView(APIView):
    """
    GET /api/dashboard/financial-trends/

    Financial trends over time (revenue, profit, cashflow).
    Query params:
    - company_id: Filter by company
    - period: Time period (default: last 6 months)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company_id = request.query_params.get('company_id')
        months = int(request.query_params.get('months', 6))

        # Calculate real financial trends from journal entries
        from django.db.models.functions import TruncMonth
        from dateutil.relativedelta import relativedelta

        end_date = timezone.now().date()
        start_date = end_date - relativedelta(months=months)

        # Build base query
        base_query = JournalEntryLine.objects.filter(
            entry__is_validated=True,
            entry__entry_date__gte=start_date,
            entry__entry_date__lte=end_date
        )
        if company_id:
            base_query = base_query.filter(entry__company_id=company_id)

        # Revenue: Class 7 accounts (SYSCOHADA - Produits)
        revenue_by_month = base_query.filter(
            account__code__startswith='7'
        ).annotate(
            month=TruncMonth('entry__entry_date')
        ).values('month').annotate(
            total=Sum('credit_amount') - Sum('debit_amount')
        ).order_by('month')

        # Expenses: Class 6 accounts (SYSCOHADA - Charges)
        expenses_by_month = base_query.filter(
            account__code__startswith='6'
        ).annotate(
            month=TruncMonth('entry__entry_date')
        ).values('month').annotate(
            total=Sum('debit_amount') - Sum('credit_amount')
        ).order_by('month')

        # Cash: Class 5 accounts (SYSCOHADA - Trésorerie)
        cash_by_month = base_query.filter(
            account__code__startswith='5'
        ).annotate(
            month=TruncMonth('entry__entry_date')
        ).values('month').annotate(
            total=Sum('debit_amount') - Sum('credit_amount')
        ).order_by('month')

        # Format month names in French
        month_names = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
                       'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

        # Build trend data structures
        revenue_dict = {r['month'].strftime('%Y-%m'): r['total'] for r in revenue_by_month}
        expenses_dict = {e['month'].strftime('%Y-%m'): e['total'] for e in expenses_by_month}
        cash_dict = {c['month'].strftime('%Y-%m'): c['total'] for c in cash_by_month}

        revenue_trends = []
        profit_trends = []
        cashflow_trends = []

        current = start_date.replace(day=1)
        while current <= end_date:
            month_key = current.strftime('%Y-%m')
            month_name = month_names[current.month - 1]

            revenue_val = revenue_dict.get(month_key, Decimal('0'))
            expense_val = expenses_dict.get(month_key, Decimal('0'))
            cash_val = cash_dict.get(month_key, Decimal('0'))

            revenue_trends.append({'month': month_name, 'value': revenue_val})
            profit_trends.append({'month': month_name, 'value': revenue_val - expense_val})
            cashflow_trends.append({'month': month_name, 'value': cash_val})

            current = current + relativedelta(months=1)

        trends = {
            'revenue': revenue_trends,
            'profit': profit_trends,
            'cashflow': cashflow_trends
        }

        serializer = FinancialTrendsSerializer(trends)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CriticalAlertsView(APIView):
    """
    GET /api/dashboard/critical-alerts/

    Critical alerts and notifications.
    Query params:
    - company_id: Filter by company
    - severity: Filter by severity level
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company_id = request.query_params.get('company_id')
        severity = request.query_params.get('severity')

        # Get company
        try:
            company = Societe.objects.get(id=company_id) if company_id else None
        except Societe.DoesNotExist:
            company = None

        # Generate alerts from real data using AlertService
        alert_service = AlertService(company=company)
        alerts_data = alert_service.check_all_alerts()

        # Convert to expected format
        alerts = []
        for idx, alert in enumerate(alerts_data):
            alerts.append({
                'id': f'alert-{idx+1:03d}',
                'type': alert['category'],
                'severity': alert['severity'],
                'title': alert['title'],
                'message': alert['message'],
                'value': Decimal(str(alert.get('metric_value', 0))),
                'date': timezone.now(),
                'action_url': f'/{alert["category"]}'
            })

        # Filter by severity if requested
        if severity:
            alerts = [a for a in alerts if a['severity'] == severity]

        serializer = CriticalAlertSerializer(alerts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PerformanceBenchmarkView(APIView):
    """
    GET /api/dashboard/performance-benchmark/

    Performance benchmarking against industry averages.
    Query params:
    - company_id: Filter by company
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company_id = request.query_params.get('company_id')
        fiscal_year_id = request.query_params.get('fiscal_year_id')

        # Calculate real company performance using FinancialCalculator
        calculator = FinancialCalculator(
            company_id=company_id,
            fiscal_year_id=fiscal_year_id
        )
        financial_metrics = calculator.calculate_all_metrics()

        # Calculate EBITDA margin
        ebitda_margin = 0
        if financial_metrics['revenue'] > 0:
            ebitda_margin = (financial_metrics['ebitda'] / financial_metrics['revenue']) * 100

        # Industry average benchmarks (placeholder - TODO: Integrate with real benchmark service)
        industry_avg = {
            'roe': 12.3,
            'roa': 6.8,
            'current_ratio': 1.5,
            'dso': 45,
            'dpo': 42,
            'ebitda_margin': 15.2
        }

        # Real company performance from accounting data
        company_perf = {
            'roe': financial_metrics['roe'],
            'roa': financial_metrics['roa'],
            'current_ratio': financial_metrics['current_ratio'],
            'dso': 42,  # TODO: Calculate from invoices
            'dpo': 38,  # TODO: Calculate from invoices
            'ebitda_margin': ebitda_margin
        }

        # Calculate ranking (TODO: Replace with real industry data)
        # Count how many metrics are above industry average
        metrics_above_avg = sum([
            1 if company_perf['roe'] > industry_avg['roe'] else 0,
            1 if company_perf['roa'] > industry_avg['roa'] else 0,
            1 if company_perf['current_ratio'] > industry_avg['current_ratio'] else 0,
            1 if company_perf['dso'] < industry_avg['dso'] else 0,  # Lower is better
            1 if company_perf['ebitda_margin'] > industry_avg['ebitda_margin'] else 0,
        ])
        percentile = int((metrics_above_avg / 5) * 100)

        benchmark = {
            'industry_average': industry_avg,
            'company_performance': company_perf,
            'ranking': {
                'overall': 8,  # TODO: Get from real benchmark service
                'out_of': 25,  # TODO: Get from real benchmark service
                'percentile': percentile  # Calculated based on metrics
            }
        }

        serializer = PerformanceBenchmarkSerializer(benchmark)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ExportDashboardView(APIView):
    """
    GET /api/dashboard/export/

    Export executive dashboard to PDF/Excel/CSV.
    Query params:
    - format: pdf, excel, or csv
    - company_id: Filter by company
    - period: Time period
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        export_format = request.query_params.get('format', 'pdf').lower()
        company_id = request.query_params.get('company_id')

        # Valider le format
        valid_formats = ['pdf', 'excel', 'csv']
        if export_format not in valid_formats:
            return Response({
                'error': f'Format non supporté: {export_format}',
                'valid_formats': valid_formats
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Récupérer la société si spécifiée
            company = None
            if company_id:
                company = Societe.objects.get(id=company_id)

            # Créer le service d'export
            export_service = DashboardExportService(
                company=company,
                user=request.user
            )

            # Créer l'export
            file_name = f'dashboard_kpis_{timezone.now().strftime("%Y%m%d")}.{export_format}'
            export = export_service.create_export(
                export_type=export_format,
                file_name=file_name,
                filters={'company_id': company_id}
            )

            # Générer le fichier
            success = export_service.generate_export(export.id)

            if success:
                export.refresh_from_db()
                return Response({
                    'message': f'Export {export_format.upper()} généré avec succès',
                    'export_id': str(export.id),
                    'file_name': export.file_name,
                    'file_size': export.file_size,
                    'download_url': request.build_absolute_uri(export.file.url) if export.file else None,
                    'status': 'completed'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'Erreur lors de la génération de l\'export',
                    'details': export.error_message
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Societe.DoesNotExist:
            return Response({
                'error': f'Société non trouvée: {company_id}'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': f'Erreur inattendue: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les notifications utilisateur

    list: Récupère toutes les notifications de l'utilisateur
    retrieve: Récupère une notification spécifique
    create: Crée une nouvelle notification
    update: Met à jour une notification
    destroy: Supprime une notification
    """
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        """Filtre les notifications par utilisateur et société"""
        user = self.request.user
        queryset = Notification.objects.filter(user=user)

        # Filtres optionnels
        status_filter = self.request.query_params.get('status')
        severity_filter = self.request.query_params.get('severity')
        category_filter = self.request.query_params.get('category')
        is_read = self.request.query_params.get('is_read')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if severity_filter:
            queryset = queryset.filter(severity=severity_filter)
        if category_filter:
            queryset = queryset.filter(category=category_filter)
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')

        return queryset.order_by('-created_at')

    def get_serializer_class(self):
        """Retourne le bon serializer selon l'action"""
        if self.action == 'list':
            return NotificationListSerializer
        elif self.action == 'create':
            return NotificationCreateSerializer
        return NotificationSerializer

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Marque une notification comme lue"""
        notification = self.get_object()
        notification.mark_as_read()
        return Response({
            'status': 'success',
            'message': 'Notification marquée comme lue'
        })

    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """Marque toutes les notifications comme lues"""
        service = NotificationService(user=request.user)
        count = service.mark_all_as_read(request.user)
        return Response({
            'status': 'success',
            'message': f'{count} notification(s) marquée(s) comme lue(s)',
            'count': count
        })

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive une notification"""
        notification = self.get_object()
        notification.archive()
        return Response({
            'status': 'success',
            'message': 'Notification archivée'
        })

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Retourne un résumé des notifications"""
        service = NotificationService(user=request.user)
        summary = service.get_notification_summary(request.user)
        return Response(summary)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Retourne le nombre de notifications non lues"""
        service = NotificationService(user=request.user)
        count = service.get_unread_count(request.user)
        critical_count = service.get_critical_count(request.user)
        return Response({
            'total_unread': count,
            'critical_unread': critical_count
        })


class DashboardExportViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les exports du dashboard

    list: Récupère tous les exports de l'utilisateur
    retrieve: Récupère un export spécifique
    create: Crée un nouvel export
    destroy: Supprime un export
    """
    permission_classes = [IsAuthenticated]
    serializer_class = DashboardExportSerializer

    def get_queryset(self):
        """Filtre les exports par utilisateur"""
        user = self.request.user
        queryset = DashboardExport.objects.filter(user=user)

        # Filtres optionnels
        export_type = self.request.query_params.get('export_type')
        status_filter = self.request.query_params.get('status')

        if export_type:
            queryset = queryset.filter(export_type=export_type)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset.order_by('-created_at')

    def get_serializer_class(self):
        """Retourne le bon serializer selon l'action"""
        if self.action == 'create':
            return DashboardExportCreateSerializer
        return DashboardExportSerializer

    def create(self, request, *args, **kwargs):
        """Crée un nouvel export et lance la génération"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Créer l'export
        export = serializer.save(user=request.user)

        # Lancer la génération de l'export
        service = DashboardExportService(
            company=export.company,
            user=request.user
        )
        success = service.generate_export(export.id)

        if success:
            # Récupérer l'export mis à jour
            export.refresh_from_db()
            output_serializer = DashboardExportSerializer(
                export,
                context={'request': request}
            )
            return Response(
                output_serializer.data,
                status=status.HTTP_201_CREATED
            )
        else:
            return Response({
                'error': 'Échec de la génération de l\'export',
                'details': export.error_message
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Incrémente le compteur de téléchargement"""
        export = self.get_object()
        export.download_count += 1
        export.save()

        return Response({
            'file_url': request.build_absolute_uri(export.file.url) if export.file else None,
            'file_name': export.file_name,
            'download_count': export.download_count
        })
