"""
Views pour le module Consolidation Multi-Sociétés
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.db.models import Sum, Count, Q

from .models import (
    ConsolidationGroup,
    ConsolidationEntity,
    ConsolidationPeriod,
    IntercompanyTransaction,
    ConsolidationAdjustment,
    ConsolidatedFinancialStatement,
    ConsolidationWorkflow,
)
from .serializers import (
    ConsolidationGroupSerializer,
    ConsolidationGroupListSerializer,
    ConsolidationEntitySerializer,
    ConsolidationEntityListSerializer,
    ConsolidationPeriodSerializer,
    ConsolidationPeriodListSerializer,
    IntercompanyTransactionSerializer,
    IntercompanyTransactionListSerializer,
    ConsolidationAdjustmentSerializer,
    ConsolidatedFinancialStatementSerializer,
    ConsolidationWorkflowSerializer,
    StartConsolidationSerializer,
    ValidateConsolidationSerializer,
    EliminateTransactionSerializer,
)


class ConsolidationGroupViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des groupes de consolidation.

    Endpoints:
    - GET /api/v1/consolidation/groups/ - Liste des groupes
    - POST /api/v1/consolidation/groups/ - Créer un groupe
    - GET /api/v1/consolidation/groups/{id}/ - Détail d'un groupe
    - PUT/PATCH /api/v1/consolidation/groups/{id}/ - Modifier un groupe
    - DELETE /api/v1/consolidation/groups/{id}/ - Supprimer un groupe
    """

    queryset = ConsolidationGroup.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['group_type', 'consolidation_method', 'is_active']
    search_fields = ['group_code', 'group_name']
    ordering_fields = ['group_name', 'created_at']
    ordering = ['group_name']

    def get_serializer_class(self):
        if self.action == 'list':
            return ConsolidationGroupListSerializer
        return ConsolidationGroupSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.select_related('parent_company')
        queryset = queryset.prefetch_related('entities')
        return queryset

    @action(detail=True, methods=['get'])
    def entities(self, request, pk=None):
        """Récupère les entités d'un groupe."""
        group = self.get_object()
        entities = group.entities.filter(status='ACTIVE')
        serializer = ConsolidationEntityListSerializer(entities, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def periods(self, request, pk=None):
        """Récupère les périodes d'un groupe."""
        group = self.get_object()
        periods = group.periods.all()
        serializer = ConsolidationPeriodListSerializer(periods, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        """Tableau de bord du groupe de consolidation."""
        group = self.get_object()

        # Statistiques
        active_entities = group.entities.filter(status='ACTIVE').count()
        total_ownership = group.entities.filter(status='ACTIVE').aggregate(
            avg=Sum('ownership_percentage')
        )['avg'] or 0

        latest_period = group.periods.filter(status='VALIDATED').order_by('-period_end').first()

        # Transactions intercos en attente
        pending_intercos = 0
        if latest_period:
            pending_intercos = IntercompanyTransaction.objects.filter(
                consolidation_period__consolidation_group=group,
                elimination_status__in=['IDENTIFIED', 'VALIDATED']
            ).count()

        return Response({
            'group': ConsolidationGroupListSerializer(group).data,
            'statistics': {
                'active_entities': active_entities,
                'total_ownership_sum': float(total_ownership),
                'pending_intercos': pending_intercos,
                'latest_period': ConsolidationPeriodListSerializer(latest_period).data if latest_period else None,
            }
        })


class ConsolidationEntityViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des entités de consolidation.
    """

    queryset = ConsolidationEntity.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['consolidation_group', 'entity_type', 'consolidation_method', 'status']
    search_fields = ['company__nom']
    ordering_fields = ['ownership_percentage', 'company__nom', 'created_at']
    ordering = ['-ownership_percentage']

    def get_serializer_class(self):
        if self.action == 'list':
            return ConsolidationEntityListSerializer
        return ConsolidationEntitySerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.select_related('consolidation_group', 'company')
        return queryset

    @action(detail=True, methods=['post'])
    def validate_mapping(self, request, pk=None):
        """Valide le mapping du plan comptable pour une entité."""
        entity = self.get_object()
        entity.chart_mapping_validated = True
        entity.save(update_fields=['chart_mapping_validated'])
        return Response({'status': 'mapping_validated'})


class ConsolidationPeriodViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des périodes de consolidation.
    """

    queryset = ConsolidationPeriod.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['consolidation_group', 'status']
    search_fields = ['period_name']
    ordering_fields = ['period_end', 'created_at']
    ordering = ['-period_end']

    def get_serializer_class(self):
        if self.action == 'list':
            return ConsolidationPeriodListSerializer
        return ConsolidationPeriodSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.select_related('consolidation_group', 'validated_by')
        queryset = queryset.prefetch_related('include_entities')
        return queryset

    @action(detail=True, methods=['post'])
    def start_processing(self, request, pk=None):
        """Démarre le traitement d'une période de consolidation."""
        period = self.get_object()

        if period.status not in ['DRAFT', 'IN_PROGRESS']:
            return Response(
                {'error': 'Cette période ne peut pas être traitée'},
                status=status.HTTP_400_BAD_REQUEST
            )

        period.status = 'IN_PROGRESS'
        period.processing_start_time = timezone.now()
        period.save(update_fields=['status', 'processing_start_time'])

        return Response({'status': 'processing_started'})

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Valide une période de consolidation."""
        period = self.get_object()

        if period.status != 'COMPLETED':
            return Response(
                {'error': 'La période doit être complétée avant validation'},
                status=status.HTTP_400_BAD_REQUEST
            )

        period.status = 'VALIDATED'
        period.validated_by = request.user
        period.validation_date = timezone.now()
        period.save(update_fields=['status', 'validated_by', 'validation_date'])

        return Response({'status': 'validated'})

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publie une période de consolidation."""
        period = self.get_object()

        if period.status != 'VALIDATED':
            return Response(
                {'error': 'La période doit être validée avant publication'},
                status=status.HTTP_400_BAD_REQUEST
            )

        period.status = 'PUBLISHED'
        period.save(update_fields=['status'])

        return Response({'status': 'published'})

    @action(detail=True, methods=['get'])
    def interco_transactions(self, request, pk=None):
        """Récupère les transactions intra-groupe d'une période."""
        period = self.get_object()
        transactions = period.interco_transactions.all()
        serializer = IntercompanyTransactionListSerializer(transactions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def adjustments(self, request, pk=None):
        """Récupère les ajustements d'une période."""
        period = self.get_object()
        adjustments = period.adjustments.all()
        serializer = ConsolidationAdjustmentSerializer(adjustments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def workflow_status(self, request, pk=None):
        """Récupère le statut du workflow d'une période."""
        period = self.get_object()
        steps = period.workflow_steps.all().order_by('step_order')
        serializer = ConsolidationWorkflowSerializer(steps, many=True)

        completed = steps.filter(status='COMPLETED').count()
        total = steps.count()

        return Response({
            'steps': serializer.data,
            'progress': {
                'completed': completed,
                'total': total,
                'percentage': int((completed / total * 100) if total > 0 else 0)
            }
        })


class IntercompanyTransactionViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des transactions intra-groupe.
    """

    queryset = IntercompanyTransaction.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'consolidation_period', 'entity_debtor', 'entity_creditor',
        'transaction_type', 'elimination_status'
    ]
    search_fields = ['transaction_reference', 'description']
    ordering_fields = ['transaction_date', 'amount_group_currency', 'created_at']
    ordering = ['-transaction_date']

    def get_serializer_class(self):
        if self.action == 'list':
            return IntercompanyTransactionListSerializer
        return IntercompanyTransactionSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.select_related(
            'consolidation_period',
            'entity_debtor__company',
            'entity_creditor__company',
            'validated_by'
        )
        return queryset

    @action(detail=True, methods=['post'])
    def eliminate(self, request, pk=None):
        """Élimine une transaction intra-groupe."""
        transaction = self.get_object()

        serializer = EliminateTransactionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        elimination_rate = serializer.validated_data.get('elimination_rate', 100)
        justification = serializer.validated_data.get('justification', '')

        transaction.elimination_rate = elimination_rate
        transaction.justification = justification
        transaction.elimination_status = 'ELIMINATED'
        transaction.elimination_date = timezone.now().date()
        transaction.validated_by = request.user
        transaction.validation_date = timezone.now()
        transaction.save()

        return Response(IntercompanyTransactionSerializer(transaction).data)

    @action(detail=False, methods=['post'])
    def bulk_eliminate(self, request):
        """Élimine plusieurs transactions en masse."""
        transaction_ids = request.data.get('transaction_ids', [])

        if not transaction_ids:
            return Response(
                {'error': 'Aucune transaction spécifiée'},
                status=status.HTTP_400_BAD_REQUEST
            )

        count = IntercompanyTransaction.objects.filter(
            id__in=transaction_ids,
            elimination_status__in=['IDENTIFIED', 'VALIDATED']
        ).update(
            elimination_status='ELIMINATED',
            elimination_date=timezone.now().date(),
            validated_by=request.user,
            validation_date=timezone.now()
        )

        return Response({'eliminated_count': count})

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Résumé des transactions intra-groupe."""
        period_id = request.query_params.get('period_id')

        queryset = self.get_queryset()
        if period_id:
            queryset = queryset.filter(consolidation_period_id=period_id)

        summary = queryset.aggregate(
            total_amount=Sum('amount_group_currency'),
            eliminated_amount=Sum('elimination_amount'),
            transaction_count=Count('id')
        )

        by_type = queryset.values('transaction_type').annotate(
            count=Count('id'),
            total=Sum('amount_group_currency')
        )

        by_status = queryset.values('elimination_status').annotate(
            count=Count('id')
        )

        return Response({
            'summary': summary,
            'by_type': list(by_type),
            'by_status': list(by_status)
        })


class ConsolidationAdjustmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des ajustements de consolidation.
    """

    queryset = ConsolidationAdjustment.objects.all()
    serializer_class = ConsolidationAdjustmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['consolidation_period', 'adjustment_type', 'entity', 'is_validated']
    search_fields = ['adjustment_name', 'description']
    ordering_fields = ['adjustment_type', 'adjustment_amount', 'created_at']
    ordering = ['adjustment_type']

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.select_related(
            'consolidation_period',
            'entity__company',
            'validated_by'
        )
        return queryset

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Valide un ajustement."""
        adjustment = self.get_object()

        adjustment.is_validated = True
        adjustment.validated_by = request.user
        adjustment.validation_date = timezone.now()
        adjustment.save(update_fields=['is_validated', 'validated_by', 'validation_date'])

        return Response({'status': 'validated'})


class ConsolidatedFinancialStatementViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les états financiers consolidés.
    """

    queryset = ConsolidatedFinancialStatement.objects.all()
    serializer_class = ConsolidatedFinancialStatementSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['consolidation_period', 'statement_type', 'reporting_format', 'is_final']
    ordering_fields = ['generation_date', 'statement_type']
    ordering = ['-generation_date']

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.select_related('consolidation_period')
        return queryset

    @action(detail=True, methods=['post'])
    def mark_final(self, request, pk=None):
        """Marque un état financier comme final."""
        statement = self.get_object()
        statement.is_final = True
        statement.save(update_fields=['is_final'])
        return Response({'status': 'marked_final'})

    @action(detail=True, methods=['get'])
    def export(self, request, pk=None):
        """Exporte un état financier."""
        statement = self.get_object()
        format_type = request.query_params.get('format', 'json')

        if format_type == 'json':
            return Response({
                'statement': ConsolidatedFinancialStatementSerializer(statement).data,
                'data': statement.consolidated_data
            })

        # TODO: Implémenter l'export PDF/Excel
        return Response({'error': 'Format non supporté'}, status=status.HTTP_400_BAD_REQUEST)


class ConsolidationWorkflowViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour le workflow de consolidation.
    """

    queryset = ConsolidationWorkflow.objects.all()
    serializer_class = ConsolidationWorkflowSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['consolidation_period', 'status', 'assigned_to']
    ordering_fields = ['step_order', 'created_at']
    ordering = ['step_order']

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.select_related('consolidation_period', 'assigned_to')
        return queryset

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Démarre une étape du workflow."""
        step = self.get_object()

        if step.status != 'PENDING':
            return Response(
                {'error': 'Cette étape ne peut pas être démarrée'},
                status=status.HTTP_400_BAD_REQUEST
            )

        step.status = 'IN_PROGRESS'
        step.start_time = timezone.now()
        step.save(update_fields=['status', 'start_time'])

        return Response({'status': 'started'})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Termine une étape du workflow."""
        step = self.get_object()

        if step.status != 'IN_PROGRESS':
            return Response(
                {'error': 'Cette étape n\'est pas en cours'},
                status=status.HTTP_400_BAD_REQUEST
            )

        step.status = 'COMPLETED'
        step.end_time = timezone.now()

        if step.start_time:
            duration = step.end_time - step.start_time
            step.actual_duration_minutes = int(duration.total_seconds() / 60)

        step.result_data = request.data.get('result_data', {})
        step.save()

        return Response({'status': 'completed'})

    @action(detail=True, methods=['post'])
    def fail(self, request, pk=None):
        """Marque une étape comme échouée."""
        step = self.get_object()

        step.status = 'FAILED'
        step.end_time = timezone.now()
        step.error_messages = request.data.get('error_messages', [])
        step.save(update_fields=['status', 'end_time', 'error_messages'])

        return Response({'status': 'failed'})
