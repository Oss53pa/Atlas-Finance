"""
Dashboard Serializers

Serializers for dashboard API responses and models.
"""
from rest_framework import serializers
from .models import Notification, DashboardExport


class ConsolidatedKPISerializer(serializers.Serializer):
    """Consolidated KPIs for executive dashboard"""
    # Financial metrics
    total_assets = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_liabilities = serializers.DecimalField(max_digits=15, decimal_places=2)
    equity = serializers.DecimalField(max_digits=15, decimal_places=2)
    revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    net_income = serializers.DecimalField(max_digits=15, decimal_places=2)
    ebitda = serializers.DecimalField(max_digits=15, decimal_places=2)

    # Cash & liquidity
    cash_position = serializers.DecimalField(max_digits=15, decimal_places=2)
    working_capital = serializers.DecimalField(max_digits=15, decimal_places=2)

    # Financial ratios
    quick_ratio = serializers.FloatField()
    current_ratio = serializers.FloatField()
    debt_to_equity = serializers.FloatField()
    roe = serializers.FloatField()  # Return on Equity
    roa = serializers.FloatField()  # Return on Assets

    # Customer/Supplier metrics
    total_customers = serializers.IntegerField()
    active_customers = serializers.IntegerField()
    total_suppliers = serializers.IntegerField()
    active_suppliers = serializers.IntegerField()

    # Working capital metrics
    dso = serializers.IntegerField()  # Days Sales Outstanding
    dpo = serializers.IntegerField()  # Days Payable Outstanding
    cash_conversion_cycle = serializers.IntegerField()

    # Overdue amounts
    overdue_receivables = serializers.DecimalField(max_digits=15, decimal_places=2)
    overdue_payables = serializers.DecimalField(max_digits=15, decimal_places=2)


class OperationalMetricsSerializer(serializers.Serializer):
    """Operational performance metrics"""
    order_fulfillment_rate = serializers.FloatField()
    inventory_turnover = serializers.FloatField()
    productivity_rate = serializers.FloatField()
    customer_satisfaction = serializers.FloatField()
    employee_productivity = serializers.FloatField()
    system_uptime = serializers.FloatField()


class TrendDataPointSerializer(serializers.Serializer):
    """Single data point for trend charts"""
    month = serializers.CharField()
    value = serializers.DecimalField(max_digits=15, decimal_places=2)


class FinancialTrendsSerializer(serializers.Serializer):
    """Financial trends over time"""
    revenue = TrendDataPointSerializer(many=True)
    profit = TrendDataPointSerializer(many=True)
    cashflow = TrendDataPointSerializer(many=True)


class CriticalAlertSerializer(serializers.Serializer):
    """Critical alert/notification"""
    id = serializers.CharField()
    type = serializers.ChoiceField(choices=[
        'treasury', 'customer', 'supplier', 'accounting', 'compliance', 'system'
    ])
    severity = serializers.ChoiceField(choices=['low', 'medium', 'high', 'critical'])
    title = serializers.CharField()
    message = serializers.CharField()
    value = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)
    date = serializers.DateTimeField()
    action_url = serializers.CharField(required=False, allow_null=True)


class PerformanceBenchmarkSerializer(serializers.Serializer):
    """Performance benchmarking data"""
    industry_average = serializers.DictField()
    company_performance = serializers.DictField()
    ranking = serializers.DictField()


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer pour les notifications"""

    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)

    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'user_name', 'company', 'company_name',
            'title', 'message', 'severity', 'severity_display',
            'category', 'category_display', 'notification_type', 'notification_type_display',
            'status', 'status_display', 'is_read', 'read_at',
            'is_archived', 'archived_at', 'metadata', 'action_url',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'read_at', 'archived_at']


class NotificationCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de notifications"""

    class Meta:
        model = Notification
        fields = [
            'user', 'company', 'title', 'message', 'severity',
            'category', 'notification_type', 'metadata', 'action_url'
        ]

    def create(self, validated_data):
        """Crée une nouvelle notification"""
        return Notification.objects.create(**validated_data)


class NotificationListSerializer(serializers.ModelSerializer):
    """Serializer léger pour la liste des notifications"""

    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'severity', 'severity_display',
            'category', 'category_display', 'status', 'is_read',
            'created_at'
        ]


class DashboardExportSerializer(serializers.ModelSerializer):
    """Serializer pour les exports"""

    export_type_display = serializers.CharField(source='get_export_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)

    file_url = serializers.SerializerMethodField()
    file_size_formatted = serializers.SerializerMethodField()

    class Meta:
        model = DashboardExport
        fields = [
            'id', 'user', 'user_name', 'company', 'company_name',
            'export_type', 'export_type_display', 'file', 'file_url',
            'file_name', 'file_size', 'file_size_formatted',
            'status', 'status_display', 'error_message',
            'filters', 'download_count', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'file', 'file_size', 'status', 'error_message',
            'download_count', 'created_at', 'updated_at'
        ]

    def get_file_url(self, obj):
        """Retourne l'URL du fichier si disponible"""
        if obj.file and obj.status == 'completed':
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

    def get_file_size_formatted(self, obj):
        """Retourne la taille du fichier formatée"""
        if not obj.file_size:
            return None

        size = obj.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"


class DashboardExportCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création d'exports"""

    class Meta:
        model = DashboardExport
        fields = [
            'user', 'company', 'export_type', 'file_name', 'filters'
        ]

    def create(self, validated_data):
        """Crée un nouvel export avec status 'pending'"""
        validated_data['status'] = 'pending'
        return DashboardExport.objects.create(**validated_data)
