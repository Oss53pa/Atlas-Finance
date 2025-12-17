"""
API Views pour RGPD/GDPR Compliance
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.http import JsonResponse

from .gdpr import GDPRService, DataErasureRequest
from .serializers_gdpr import DataErasureRequestSerializer

import logging

logger = logging.getLogger(__name__)


class GDPRViewSet(viewsets.ViewSet):
    """
    ViewSet pour gestion RGPD
    """

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def request_erasure(self, request):
        """
        POST /api/v1/gdpr/request_erasure/
        Créer une demande de suppression de données (RGPD Article 17)

        Body:
        {
            "reason": "Je souhaite supprimer mes données personnelles"  // Optionnel
        }

        Returns:
        {
            "request_id": 123,
            "status": "PENDING",
            "message": "Demande enregistrée..."
        }
        """
        reason = request.data.get('reason', '')

        try:
            erasure_request = GDPRService.create_erasure_request(
                user=request.user,
                reason=reason
            )

            return Response({
                'request_id': erasure_request.id,
                'status': erasure_request.status,
                'requested_at': erasure_request.requested_at,
                'message': 'Demande de suppression enregistrée. Un administrateur la traitera sous 30 jours (délai légal RGPD).'
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def my_erasure_requests(self, request):
        """
        GET /api/v1/gdpr/my_erasure_requests/
        Liste des demandes de suppression de l'utilisateur
        """
        requests = DataErasureRequest.objects.filter(user=request.user)

        return Response(
            DataErasureRequestSerializer(requests, many=True).data
        )

    @action(detail=False, methods=['get'])
    def export_my_data(self, request):
        """
        GET /api/v1/gdpr/export_my_data/
        Exporter toutes les données personnelles (RGPD Article 20 - Portabilité)

        Returns:
            JSON avec toutes les données
        """
        data = GDPRService.export_user_data(request.user)

        # Retourner en JSON
        response = JsonResponse(data, safe=False)
        response['Content-Disposition'] = f'attachment; filename="my_data_{request.user.id}.json"'

        logger.info(f"Data export for user {request.user.id}")

        return response

    # ========================================================================
    # Actions Admin (nécessitent IsAdminUser)
    # ========================================================================

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def pending_requests(self, request):
        """
        GET /api/v1/gdpr/pending_requests/  (Admin only)
        Liste des demandes en attente
        """
        requests = DataErasureRequest.objects.filter(status='PENDING')

        return Response(
            DataErasureRequestSerializer(requests, many=True).data
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def process_request(self, request, pk=None):
        """
        POST /api/v1/gdpr/{id}/process_request/  (Admin only)
        Traiter une demande de suppression

        ATTENTION: Action IRRÉVERSIBLE
        """
        try:
            report = GDPRService.process_erasure_request(
                request_id=int(pk),
                admin_user=request.user
            )

            return Response({
                'success': True,
                'report': report
            })

        except Exception as e:
            logger.error(f"Error processing erasure request {pk}: {e}")

            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def reject_request(self, request, pk=None):
        """
        POST /api/v1/gdpr/{id}/reject_request/  (Admin only)
        Rejeter une demande de suppression (avec justification)

        Body:
        {
            "reason": "Raison du rejet..."
        }
        """
        reason = request.data.get('reason', 'Rejeté par admin')

        try:
            erasure_request = DataErasureRequest.objects.get(id=pk)

            erasure_request.status = 'REJECTED'
            erasure_request.error_message = reason
            erasure_request.processed_by = request.user
            erasure_request.save()

            logger.warning(f"Erasure request {pk} rejected by {request.user.id}: {reason}")

            return Response({
                'success': True,
                'message': 'Demande rejetée'
            })

        except DataErasureRequest.DoesNotExist:
            return Response(
                {'error': 'Demande introuvable'},
                status=status.HTTP_404_NOT_FOUND
            )
