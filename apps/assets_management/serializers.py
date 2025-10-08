"""
Serializers pour le module de gestion des actifs
"""
from rest_framework import serializers
from .models import Asset, AssetComponent, AssetCategory, AssetDocument, AssetDepreciation
from .models import AssetMovement, AssetIoTSensor, AssetMaintenanceRecord, AssetInventory
from .models import AssetPerformanceMetrics, WiseFMIntegration, MaintenanceServiceContract
from .models import PriceListSummaryItem, MaintenanceHistory, AssetAttachment, AssetNote


class AssetComponentSerializer(serializers.ModelSerializer):
    """
    Serializer pour les composants d'actifs
    """
    asset_number = serializers.CharField(source='asset.asset_number', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)

    class Meta:
        model = AssetComponent
        fields = [
            'id',
            'asset',
            'asset_number',
            'asset_name',
            'code',
            'name',
            'description',
            'etat',
            'categorie',
            'date_installation',
            'localisation',
            'serial_number',
            'manufacturer',
            'model',
            'expected_lifetime_years',
            'last_maintenance_date',
            'next_maintenance_date',
            'purchase_cost',
            'replacement_cost',
            'is_critical',
            'notes',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_code(self, value):
        """
        Validation du code unique par actif
        """
        if self.instance:
            # Mise à jour
            if AssetComponent.objects.filter(
                asset=self.instance.asset,
                code=value
            ).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError(
                    "Un composant avec ce code existe déjà pour cet actif."
                )
        elif 'asset' in self.initial_data:
            # Création
            if AssetComponent.objects.filter(
                asset=self.initial_data['asset'],
                code=value
            ).exists():
                raise serializers.ValidationError(
                    "Un composant avec ce code existe déjà pour cet actif."
                )
        return value


class AssetCategorySerializer(serializers.ModelSerializer):
    """
    Serializer pour les catégories d'actifs
    """
    class Meta:
        model = AssetCategory
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class AssetDocumentSerializer(serializers.ModelSerializer):
    """
    Serializer pour les documents d'actifs
    """
    class Meta:
        model = AssetDocument
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class AssetDepreciationSerializer(serializers.ModelSerializer):
    """
    Serializer pour les amortissements d'actifs
    """
    class Meta:
        model = AssetDepreciation
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class AssetMovementSerializer(serializers.ModelSerializer):
    """
    Serializer pour les mouvements d'actifs
    """
    class Meta:
        model = AssetMovement
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class AssetIoTSensorSerializer(serializers.ModelSerializer):
    """
    Serializer pour les capteurs IoT
    """
    class Meta:
        model = AssetIoTSensor
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class AssetMaintenanceRecordSerializer(serializers.ModelSerializer):
    """
    Serializer pour les enregistrements de maintenance
    """
    class Meta:
        model = AssetMaintenanceRecord
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class AssetInventorySerializer(serializers.ModelSerializer):
    """
    Serializer pour les inventaires d'actifs
    """
    class Meta:
        model = AssetInventory
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class AssetPerformanceMetricsSerializer(serializers.ModelSerializer):
    """
    Serializer pour les métriques de performance
    """
    class Meta:
        model = AssetPerformanceMetrics
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class AssetSerializer(serializers.ModelSerializer):
    """
    Serializer principal pour les actifs avec composants imbriqués
    """
    components = AssetComponentSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    responsible_person_name = serializers.CharField(source='responsible_person.get_full_name', read_only=True)

    class Meta:
        model = Asset
        fields = '__all__'
        read_only_fields = ['id', 'total_cost', 'created_at', 'updated_at']

    def create(self, validated_data):
        """
        Création d'un nouvel actif
        """
        validated_data['total_cost'] = validated_data.get('acquisition_cost', 0) + validated_data.get('installation_cost', 0)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """
        Mise à jour d'un actif
        """
        validated_data['total_cost'] = validated_data.get('acquisition_cost', instance.acquisition_cost) + validated_data.get('installation_cost', instance.installation_cost)
        return super().update(instance, validated_data)


class PriceListSummaryItemSerializer(serializers.ModelSerializer):
    """
    Serializer pour les lignes de tarification
    """
    class Meta:
        model = PriceListSummaryItem
        fields = ['id', 'year', 'item_description', 'amount']
        read_only_fields = ['id']


class MaintenanceServiceContractSerializer(serializers.ModelSerializer):
    """
    Serializer pour les contrats de maintenance
    """
    price_list_items = PriceListSummaryItemSerializer(many=True, read_only=True)
    asset_number = serializers.CharField(source='asset.asset_number', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = MaintenanceServiceContract
        fields = [
            'id', 'asset', 'asset_number', 'asset_name',
            # Basic contract information
            'contract_name', 'vendor', 'edtci', 'parent_site_reference',
            'contract_type', 'contract_object', 'vendor_number', 'gla_m2', 'code_contract',
            # Contracted parties - Structure
            'structure_name', 'legal_signatory', 'structure_edtci',
            'structure_address', 'structure_phone_number', 'structure_email_address', 'structure_id_reg',
            # Contracted parties - Vendor
            'vendor_name', 'vendor_address', 'vendor_phone_number',
            'vendor_email_address', 'vendor_id_reg',
            # Creation info
            'created_by', 'created_by_name', 'creation_date',
            # Price & payment
            'contract_obligation', 'tax_rate', 'payment_term', 'payment_method',
            'total_amount_excl_vat', 'price_list_items',
            # Contract dates
            'contract_start_date', 'contract_end_date', 'contract_duration',
            'commencement_date', 'contract_expiry_date',
            # Status
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'creation_date', 'contract_duration']

    def create(self, validated_data):
        # Calculate total from price list items if provided
        return super().create(validated_data)


class MaintenanceHistorySerializer(serializers.ModelSerializer):
    """
    Serializer pour l'historique de maintenance
    """
    asset_number = serializers.CharField(source='asset.asset_number', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    contract_code = serializers.CharField(source='contract.code_contract', read_only=True)

    class Meta:
        model = MaintenanceHistory
        fields = [
            'id', 'asset', 'asset_number', 'asset_name',
            'contract', 'contract_code',
            # Intervention details
            'intervention_date', 'intervention_type', 'description',
            # Technician
            'technician_name', 'technician_company',
            # Duration and cost
            'duration_hours', 'labor_cost', 'parts_cost', 'total_cost',
            # Results
            'issues_found', 'actions_taken', 'recommendations',
            # Next maintenance
            'next_maintenance_date',
            # Documents
            'work_order_number', 'report_file',
            # Metadata
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_cost']


class AssetAttachmentSerializer(serializers.ModelSerializer):
    """
    Serializer pour les pièces jointes
    """
    asset_number = serializers.CharField(source='asset.asset_number', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = AssetAttachment
        fields = [
            'id', 'asset', 'asset_number',
            # File info
            'file_name', 'file', 'file_url', 'file_size', 'file_type',
            # Metadata
            'attachment_type', 'category', 'title', 'description',
            # Version control
            'version', 'is_latest_version', 'previous_version',
            # Validity
            'valid_from', 'valid_until', 'is_expired',
            # Security
            'is_confidential', 'access_level',
            # Tags
            'tags', 'keywords',
            # Upload info
            'uploaded_by', 'uploaded_by_name', 'upload_date',
            # Reference
            'external_reference', 'source',
            # Timestamps
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'upload_date', 'file_size']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class AssetNoteSerializer(serializers.ModelSerializer):
    """
    Serializer pour les notes
    """
    asset_number = serializers.CharField(source='asset.asset_number', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    action_assigned_to_name = serializers.CharField(source='action_assigned_to.get_full_name', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    replies = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = AssetNote
        fields = [
            'id', 'asset', 'asset_number',
            # Content
            'note_type', 'subject', 'content',
            # Classification
            'priority', 'visibility',
            # Related
            'related_contract', 'related_maintenance', 'related_component',
            # Follow-up
            'requires_action', 'action_due_date', 'action_assigned_to',
            'action_assigned_to_name', 'action_completed', 'action_completed_date',
            'is_overdue',
            # Validity
            'is_active', 'valid_from', 'valid_until',
            # Notifications
            'send_notification', 'notification_recipients',
            'notification_sent', 'notification_sent_date',
            # Tags
            'tags',
            # Author
            'created_by', 'created_by_name', 'last_modified_by',
            # Thread
            'parent_note', 'replies',
            # Attachments
            'has_attachments', 'attachment_count',
            # Timestamps
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'is_overdue',
            'notification_sent', 'notification_sent_date'
        ]

    def create(self, validated_data):
        # Set created_by from request user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Set last_modified_by from request user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['last_modified_by'] = request.user
        return super().update(instance, validated_data)


class WiseFMIntegrationSerializer(serializers.ModelSerializer):
    """
    Serializer pour l'intégration Wise FM
    """
    class Meta:
        model = WiseFMIntegration
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'api_key': {'write_only': True},
            'client_secret': {'write_only': True}
        }