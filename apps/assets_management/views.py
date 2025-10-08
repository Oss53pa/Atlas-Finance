"""
Views pour le module de gestion des actifs
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import Asset, AssetComponent, AssetCategory, AssetDocument, AssetDepreciation
from .models import AssetMovement, AssetIoTSensor, AssetMaintenanceRecord, AssetInventory
from .models import AssetPerformanceMetrics, WiseFMIntegration, MaintenanceServiceContract
from .models import PriceListSummaryItem, MaintenanceHistory, AssetAttachment, AssetNote
from .serializers import (
    AssetSerializer, AssetComponentSerializer, AssetCategorySerializer,
    AssetDocumentSerializer, AssetDepreciationSerializer, AssetMovementSerializer,
    AssetIoTSensorSerializer, AssetMaintenanceRecordSerializer, AssetInventorySerializer,
    AssetPerformanceMetricsSerializer, WiseFMIntegrationSerializer,
    MaintenanceServiceContractSerializer, PriceListSummaryItemSerializer,
    MaintenanceHistorySerializer, AssetAttachmentSerializer, AssetNoteSerializer
)


class AssetComponentViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des composants d'actifs
    """
    queryset = AssetComponent.objects.all()
    serializer_class = AssetComponentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['asset', 'etat', 'categorie', 'is_critical', 'is_active']
    search_fields = ['code', 'name', 'description', 'serial_number']
    ordering_fields = ['code', 'name', 'date_installation', 'created_at']
    ordering = ['asset', 'code']

    def get_queryset(self):
        """
        Filtrage personnalisé des composants
        """
        queryset = super().get_queryset()
        asset_id = self.request.query_params.get('asset_id', None)

        if asset_id:
            queryset = queryset.filter(asset_id=asset_id)

        # Filtrer par état
        etat = self.request.query_params.get('etat', None)
        if etat:
            queryset = queryset.filter(etat=etat)

        # Filtrer par catégorie
        categorie = self.request.query_params.get('categorie', None)
        if categorie:
            queryset = queryset.filter(categorie=categorie)

        # Composants critiques uniquement
        critical_only = self.request.query_params.get('critical_only', None)
        if critical_only and critical_only.lower() == 'true':
            queryset = queryset.filter(is_critical=True)

        # Composants actifs uniquement
        active_only = self.request.query_params.get('active_only', None)
        if active_only and active_only.lower() != 'false':
            queryset = queryset.filter(is_active=True)

        return queryset

    @action(detail=False, methods=['get'])
    def by_asset(self, request):
        """
        Récupérer tous les composants d'un actif spécifique
        """
        asset_id = request.query_params.get('asset_id')
        if not asset_id:
            return Response(
                {"error": "asset_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        components = self.get_queryset().filter(asset_id=asset_id)
        serializer = self.get_serializer(components, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def critical(self, request):
        """
        Récupérer tous les composants critiques
        """
        components = self.get_queryset().filter(is_critical=True)
        serializer = self.get_serializer(components, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def maintenance_due(self, request):
        """
        Récupérer les composants nécessitant une maintenance
        """
        from datetime import date
        components = self.get_queryset().filter(
            next_maintenance_date__lte=date.today()
        )
        serializer = self.get_serializer(components, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def replace(self, request, pk=None):
        """
        Remplacer un composant
        """
        component = self.get_object()
        component.etat = 'REMPLACE'
        component.is_active = False
        component.save()

        # Créer un nouveau composant avec les données fournies
        new_component_data = request.data
        new_component_data['asset'] = component.asset.id

        serializer = self.get_serializer(data=new_component_data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'old_component': AssetComponentSerializer(component).data,
                'new_component': serializer.data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AssetViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des actifs
    """
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['company', 'category', 'status', 'condition']
    search_fields = ['asset_number', 'name', 'description', 'serial_number']
    ordering_fields = ['asset_number', 'acquisition_date', 'created_at']
    ordering = ['asset_number']

    def get_queryset(self):
        """
        Filtrage personnalisé des actifs
        """
        queryset = super().get_queryset().prefetch_related('components')

        # Filtrer par statut
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filtrer par localisation
        building = self.request.query_params.get('building', None)
        if building:
            queryset = queryset.filter(building__icontains=building)

        return queryset

    @action(detail=True, methods=['get'])
    def components(self, request, pk=None):
        """
        Récupérer tous les composants d'un actif
        """
        asset = self.get_object()
        components = asset.components.filter(is_active=True)
        serializer = AssetComponentSerializer(components, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_component(self, request, pk=None):
        """
        Ajouter un composant à un actif
        """
        asset = self.get_object()
        component_data = request.data
        component_data['asset'] = asset.id

        serializer = AssetComponentSerializer(data=component_data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AssetCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les catégories d'actifs
    """
    queryset = AssetCategory.objects.all()
    serializer_class = AssetCategorySerializer
    permission_classes = [IsAuthenticated]


class AssetDocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les documents d'actifs
    """
    queryset = AssetDocument.objects.all()
    serializer_class = AssetDocumentSerializer
    permission_classes = [IsAuthenticated]


class AssetDepreciationViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les amortissements d'actifs
    """
    queryset = AssetDepreciation.objects.all()
    serializer_class = AssetDepreciationSerializer
    permission_classes = [IsAuthenticated]


class AssetMovementViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les mouvements d'actifs
    """
    queryset = AssetMovement.objects.all()
    serializer_class = AssetMovementSerializer
    permission_classes = [IsAuthenticated]


class AssetIoTSensorViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les capteurs IoT
    """
    queryset = AssetIoTSensor.objects.all()
    serializer_class = AssetIoTSensorSerializer
    permission_classes = [IsAuthenticated]


class AssetMaintenanceRecordViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les enregistrements de maintenance
    """
    queryset = AssetMaintenanceRecord.objects.all()
    serializer_class = AssetMaintenanceRecordSerializer
    permission_classes = [IsAuthenticated]


class AssetInventoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les inventaires d'actifs
    """
    queryset = AssetInventory.objects.all()
    serializer_class = AssetInventorySerializer
    permission_classes = [IsAuthenticated]


class AssetPerformanceMetricsViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les métriques de performance
    """
    queryset = AssetPerformanceMetrics.objects.all()
    serializer_class = AssetPerformanceMetricsSerializer
    permission_classes = [IsAuthenticated]


class MaintenanceServiceContractViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les contrats de maintenance
    """
    queryset = MaintenanceServiceContract.objects.all()
    serializer_class = MaintenanceServiceContractSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['asset', 'vendor', 'contract_type', 'is_active']
    search_fields = ['contract_name', 'code_contract', 'vendor', 'vendor_name']
    ordering_fields = ['contract_start_date', 'contract_end_date', 'created_at']
    ordering = ['-contract_start_date']

    def get_queryset(self):
        queryset = super().get_queryset().prefetch_related('price_list_items')

        # Filter by asset
        asset_id = self.request.query_params.get('asset_id', None)
        if asset_id:
            queryset = queryset.filter(asset_id=asset_id)

        # Filter active contracts only
        active_only = self.request.query_params.get('active_only', None)
        if active_only and active_only.lower() == 'true':
            from datetime import date
            queryset = queryset.filter(
                is_active=True,
                contract_start_date__lte=date.today(),
                contract_end_date__gte=date.today()
            )

        return queryset

    @action(detail=True, methods=['post'])
    def add_price_item(self, request, pk=None):
        """
        Ajouter une ligne tarifaire au contrat
        """
        contract = self.get_object()
        item_data = request.data
        item_data['contract'] = contract.id

        serializer = PriceListSummaryItemSerializer(data=item_data)
        if serializer.is_valid():
            serializer.save()
            # Update total amount
            total = sum(item.amount for item in contract.price_list_items.all())
            contract.total_amount_excl_vat = total
            contract.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """
        Contrats expirant dans les 90 prochains jours
        """
        from datetime import date, timedelta
        expiry_threshold = date.today() + timedelta(days=90)
        contracts = self.get_queryset().filter(
            contract_end_date__lte=expiry_threshold,
            contract_end_date__gte=date.today(),
            is_active=True
        )
        serializer = self.get_serializer(contracts, many=True)
        return Response(serializer.data)


class PriceListSummaryItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les lignes tarifaires
    """
    queryset = PriceListSummaryItem.objects.all()
    serializer_class = PriceListSummaryItemSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['contract', 'year']
    ordering = ['year', 'id']


class MaintenanceHistoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour l'historique de maintenance
    """
    queryset = MaintenanceHistory.objects.all()
    serializer_class = MaintenanceHistorySerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['asset', 'contract', 'intervention_type']
    search_fields = ['description', 'technician_name', 'work_order_number']
    ordering_fields = ['intervention_date', 'created_at']
    ordering = ['-intervention_date']

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by asset
        asset_id = self.request.query_params.get('asset_id', None)
        if asset_id:
            queryset = queryset.filter(asset_id=asset_id)

        # Filter by date range
        from_date = self.request.query_params.get('from_date', None)
        to_date = self.request.query_params.get('to_date', None)
        if from_date:
            queryset = queryset.filter(intervention_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(intervention_date__lte=to_date)

        return queryset

    @action(detail=False, methods=['get'])
    def by_asset(self, request):
        """
        Historique de maintenance pour un actif spécifique
        """
        asset_id = request.query_params.get('asset_id')
        if not asset_id:
            return Response(
                {"error": "asset_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        history = self.get_queryset().filter(asset_id=asset_id)
        serializer = self.get_serializer(history, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def upcoming_maintenance(self, request):
        """
        Maintenances à venir
        """
        from datetime import date
        history = self.get_queryset().filter(
            next_maintenance_date__gte=date.today()
        ).order_by('next_maintenance_date')
        serializer = self.get_serializer(history, many=True)
        return Response(serializer.data)


class AssetAttachmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les pièces jointes d'actifs
    """
    queryset = AssetAttachment.objects.all()
    serializer_class = AssetAttachmentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['asset', 'attachment_type', 'category', 'is_confidential', 'is_expired']
    search_fields = ['title', 'description', 'keywords', 'tags', 'file_name']
    ordering_fields = ['upload_date', 'created_at', 'title']
    ordering = ['-upload_date']

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by asset
        asset_id = self.request.query_params.get('asset_id', None)
        if asset_id:
            queryset = queryset.filter(asset_id=asset_id)

        # Filter latest versions only
        latest_only = self.request.query_params.get('latest_only', None)
        if latest_only and latest_only.lower() == 'true':
            queryset = queryset.filter(is_latest_version=True)

        # Filter by validity
        valid_only = self.request.query_params.get('valid_only', None)
        if valid_only and valid_only.lower() == 'true':
            from datetime import date
            today = date.today()
            queryset = queryset.filter(
                Q(valid_from__lte=today) | Q(valid_from__isnull=True),
                Q(valid_until__gte=today) | Q(valid_until__isnull=True),
                is_expired=False
            )

        return queryset

    @action(detail=False, methods=['get'])
    def by_asset(self, request):
        """
        Récupérer toutes les pièces jointes d'un actif
        """
        asset_id = request.query_params.get('asset_id')
        if not asset_id:
            return Response(
                {"error": "asset_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        attachments = self.get_queryset().filter(asset_id=asset_id)
        serializer = self.get_serializer(attachments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """
        Documents expirant dans les 30 prochains jours
        """
        from datetime import date, timedelta
        expiry_threshold = date.today() + timedelta(days=30)
        attachments = self.get_queryset().filter(
            valid_until__lte=expiry_threshold,
            valid_until__gte=date.today(),
            is_expired=False
        )
        serializer = self.get_serializer(attachments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def new_version(self, request, pk=None):
        """
        Créer une nouvelle version d'un document
        """
        current_attachment = self.get_object()
        new_attachment_data = request.data
        new_attachment_data['asset'] = current_attachment.asset.id
        new_attachment_data['previous_version'] = current_attachment.id
        new_attachment_data['is_latest_version'] = True

        # Extract version number and increment
        current_version = current_attachment.version
        try:
            version_parts = current_version.split('.')
            major = int(version_parts[0])
            minor = int(version_parts[1]) if len(version_parts) > 1 else 0
            new_attachment_data['version'] = f"{major}.{minor + 1}"
        except:
            new_attachment_data['version'] = f"{current_version}.1"

        serializer = self.get_serializer(data=new_attachment_data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AssetNoteViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les notes d'actifs
    """
    queryset = AssetNote.objects.all()
    serializer_class = AssetNoteSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['asset', 'note_type', 'priority', 'visibility', 'requires_action', 'action_completed']
    search_fields = ['subject', 'content', 'tags']
    ordering_fields = ['created_at', 'priority', 'action_due_date']
    ordering = ['-created_at', '-priority']

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by asset
        asset_id = self.request.query_params.get('asset_id', None)
        if asset_id:
            queryset = queryset.filter(asset_id=asset_id)

        # Filter active notes only
        active_only = self.request.query_params.get('active_only', None)
        if active_only and active_only.lower() != 'false':
            queryset = queryset.filter(is_active=True)

        # Filter notes requiring action
        requires_action = self.request.query_params.get('requires_action', None)
        if requires_action and requires_action.lower() == 'true':
            queryset = queryset.filter(requires_action=True, action_completed=False)

        # Filter by visibility
        visibility = self.request.query_params.get('visibility', None)
        if visibility:
            queryset = queryset.filter(visibility=visibility)

        # Filter root notes only (no parent)
        root_only = self.request.query_params.get('root_only', None)
        if root_only and root_only.lower() == 'true':
            queryset = queryset.filter(parent_note__isnull=True)

        return queryset

    @action(detail=False, methods=['get'])
    def by_asset(self, request):
        """
        Récupérer toutes les notes d'un actif
        """
        asset_id = request.query_params.get('asset_id')
        if not asset_id:
            return Response(
                {"error": "asset_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        notes = self.get_queryset().filter(asset_id=asset_id)
        serializer = self.get_serializer(notes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def actions_pending(self, request):
        """
        Notes avec actions en attente
        """
        notes = self.get_queryset().filter(
            requires_action=True,
            action_completed=False
        ).order_by('action_due_date')
        serializer = self.get_serializer(notes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def overdue_actions(self, request):
        """
        Actions en retard
        """
        from datetime import date
        notes = self.get_queryset().filter(
            requires_action=True,
            action_completed=False,
            action_due_date__lt=date.today()
        )
        serializer = self.get_serializer(notes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def complete_action(self, request, pk=None):
        """
        Marquer une action comme complétée
        """
        note = self.get_object()
        if not note.requires_action:
            return Response(
                {"error": "This note does not require action"},
                status=status.HTTP_400_BAD_REQUEST
            )

        from datetime import datetime
        note.action_completed = True
        note.action_completed_date = datetime.now()
        note.save()

        serializer = self.get_serializer(note)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_reply(self, request, pk=None):
        """
        Ajouter une réponse à une note
        """
        parent_note = self.get_object()
        reply_data = request.data
        reply_data['asset'] = parent_note.asset.id
        reply_data['parent_note'] = parent_note.id
        reply_data['note_type'] = parent_note.note_type  # Inherit type from parent

        serializer = self.get_serializer(data=reply_data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class WiseFMIntegrationViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour l'intégration Wise FM
    """
    queryset = WiseFMIntegration.objects.all()
    serializer_class = WiseFMIntegrationSerializer
    permission_classes = [IsAuthenticated]