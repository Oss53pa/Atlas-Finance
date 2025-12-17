"""
API Views pour Multi-Factor Authentication (MFA)
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .mfa import MFAService, MFAMethod
from .serializers_mfa import MFAMethodSerializer

import logging

logger = logging.getLogger(__name__)


class MFAViewSet(viewsets.ViewSet):
    """
    ViewSet pour gestion MFA utilisateur
    """

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def status(self, request):
        """
        GET /api/v1/mfa/status/
        Récupère le statut MFA de l'utilisateur
        """
        user = request.user

        mfa_methods = MFAMethod.objects.filter(user=user)

        has_mfa = mfa_methods.filter(is_active=True, is_verified=True).exists()

        return Response({
            'mfa_enabled': has_mfa,
            'methods': MFAMethodSerializer(mfa_methods, many=True).data
        })

    @action(detail=False, methods=['post'])
    def setup_totp(self, request):
        """
        POST /api/v1/mfa/setup_totp/
        Configure TOTP (Google Authenticator, Authy, etc.)

        Body:
        {
            "device_name": "iPhone"  // Optionnel
        }

        Returns:
        {
            "secret": "JBSWY3DPEHPK3PXP",
            "qr_code": "data:image/png;base64,...",
            "backup_codes": ["1234-5678", ...]
        }
        """
        device_name = request.data.get('device_name', 'Authenticator')

        secret, qr_code, backup_codes = MFAService.setup_totp(
            user=request.user,
            device_name=device_name
        )

        return Response({
            'secret': secret,
            'qr_code': qr_code,
            'backup_codes': backup_codes,
            'message': 'Scannez le QR code avec votre application Authenticator, puis vérifiez avec un code.'
        })

    @action(detail=False, methods=['post'])
    def verify_totp_setup(self, request):
        """
        POST /api/v1/mfa/verify_totp_setup/
        Vérifie et active TOTP après configuration

        Body:
        {
            "code": "123456"
        }
        """
        code = request.data.get('code')

        if not code:
            return Response(
                {'error': 'Code requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        success = MFAService.verify_totp_setup(request.user, code)

        if success:
            return Response({
                'success': True,
                'message': 'MFA activé avec succès !'
            })
        else:
            return Response(
                {'error': 'Code invalide. Veuillez réessayer.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def verify(self, request):
        """
        POST /api/v1/mfa/verify/
        Vérifie un code MFA

        Body:
        {
            "code": "123456"
        }
        """
        code = request.data.get('code')

        if not code:
            return Response(
                {'error': 'Code requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Vérifier TOTP
        if MFAService.verify_totp(request.user, code):
            return Response({'verified': True})

        # Vérifier backup code
        if MFAService.verify_backup_code(request.user, code):
            return Response({
                'verified': True,
                'backup_code_used': True,
                'message': 'Code de secours utilisé. Pensez à régénérer vos codes.'
            })

        return Response(
            {'error': 'Code invalide'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=False, methods=['post'])
    def disable(self, request):
        """
        POST /api/v1/mfa/disable/
        Désactive MFA (nécessite mot de passe)

        Body:
        {
            "password": "user_password"
        }
        """
        password = request.data.get('password')

        if not password:
            return Response(
                {'error': 'Mot de passe requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Vérifier mot de passe
        if not request.user.check_password(password):
            return Response(
                {'error': 'Mot de passe incorrect'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Désactiver toutes les méthodes MFA
        MFAMethod.objects.filter(user=request.user).update(is_active=False)

        logger.warning(f"MFA disabled for user {request.user.id}")

        return Response({
            'success': True,
            'message': 'MFA désactivé'
        })

    @action(detail=False, methods=['post'])
    def regenerate_backup_codes(self, request):
        """
        POST /api/v1/mfa/regenerate_backup_codes/
        Régénère les codes de backup

        Body:
        {
            "code": "123456"  // Code TOTP pour confirmer
        }
        """
        code = request.data.get('code')

        if not code:
            return Response(
                {'error': 'Code TOTP requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Vérifier code TOTP
        if not MFAService.verify_totp(request.user, code):
            return Response(
                {'error': 'Code invalide'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Régénérer backup codes
        try:
            mfa_method = MFAMethod.objects.get(
                user=request.user,
                method_type='TOTP',
                is_active=True
            )

            backup_codes = MFAService._generate_backup_codes()
            mfa_method.backup_codes = backup_codes
            mfa_method.save()

            logger.info(f"Backup codes regenerated for user {request.user.id}")

            return Response({
                'backup_codes': backup_codes,
                'message': 'Nouveaux codes de secours générés. Sauvegardez-les en lieu sûr.'
            })

        except MFAMethod.DoesNotExist:
            return Response(
                {'error': 'MFA non configuré'},
                status=status.HTTP_404_NOT_FOUND
            )
