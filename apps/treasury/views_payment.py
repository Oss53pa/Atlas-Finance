"""
ViewSet pour la gestion des paiements
Ajout du module Payment manquant dans l'API
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from datetime import date

from apps.core.mixins import CompanyFilterMixin
from apps.core.permissions import IsCompanyMember
from apps.core.throttling import (
    TreasuryReadThrottle,
    TreasuryWriteThrottle,
    PaymentExecutionThrottle,
    PaymentApprovalThrottle
)
from apps.core.mfa import MFAService, mfa_required
from .models import Payment, BankAccount
from .serializers import PaymentSerializer
from .exceptions import (
    InsufficientBalanceException,
    PaymentNotExecutableException,
    InvalidSignatureException,
    AccountInactiveException
)


class PaymentViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des paiements
    CRUD complet + workflows d'approbation et d'exécution

    Rate Limiting:
    - Lecture (list, retrieve): 1000/hour
    - Écriture (create, update): 200/hour
    - Exécution: 50/hour (protection critique)
    - Approbation: 100/hour
    """

    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]
    serializer_class = PaymentSerializer

    def get_throttles(self):
        """
        Throttling adapté selon l'action
        """
        if self.action in ['list', 'retrieve']:
            throttle_classes = [TreasuryReadThrottle]
        elif self.action == 'execute':
            throttle_classes = [PaymentExecutionThrottle]
        elif self.action in ['approve', 'reject']:
            throttle_classes = [PaymentApprovalThrottle]
        else:  # create, update, partial_update, destroy
            throttle_classes = [TreasuryWriteThrottle]

        return [throttle() for throttle in throttle_classes]

    def get_queryset(self):
        """
        Filtrer les paiements par company de l'utilisateur
        OPTIMISATION: select_related pour éviter N+1 queries
        """
        queryset = Payment.objects.filter(
            company=self.get_company()
        ).select_related(
            'bank_account',
            'bank_account__bank',
            'company'
        ).order_by('-value_date', '-created_at')

        # Filtres optionnels
        status_filter = self.request.query_params.get('status')
        direction = self.request.query_params.get('direction')
        bank_account_id = self.request.query_params.get('bank_account')

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if direction:
            queryset = queryset.filter(direction=direction)

        if bank_account_id:
            queryset = queryset.filter(bank_account_id=bank_account_id)

        return queryset

    def perform_create(self, serializer):
        """Créer un paiement pour la company de l'utilisateur"""
        serializer.save(company=self.get_company())

    def perform_update(self, serializer):
        """
        Mise à jour avec validation clean()
        La validation IBAN + montant après approbation est gérée dans model.clean()
        """
        try:
            instance = serializer.save()
            # Appeler clean() pour valider (faille signatures corrigée)
            instance.full_clean()
        except DjangoValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def submit_for_approval(self, request, pk=None):
        """
        Soumettre un paiement pour approbation
        Change le statut de DRAFT à PENDING_APPROVAL
        """
        payment = self.get_object()

        if payment.status != 'DRAFT':
            return Response(
                {'error': 'Seuls les paiements en brouillon peuvent être soumis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Valider que tous les champs obligatoires sont remplis
        if not payment.beneficiary_name or not payment.beneficiary_account:
            return Response(
                {'error': 'Bénéficiaire et compte bénéficiaire requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment.status = 'PENDING_APPROVAL'
        payment.save()

        return Response(
            PaymentSerializer(payment).data,
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Approuver un paiement (ajouter une signature)
        Gère le circuit de validation avec required_signatures
        """
        payment = self.get_object()

        if payment.status not in ['PENDING_APPROVAL', 'APPROVED']:
            return Response(
                {'error': f'Le paiement doit être en attente d\'approbation (statut actuel: {payment.status})'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Ajouter une signature
        payment.current_signatures += 1

        # Si toutes les signatures sont obtenues, passer à APPROVED
        if payment.current_signatures >= payment.required_signatures:
            payment.status = 'APPROVED'

        payment.save()

        return Response({
            'message': f'Signature ajoutée ({payment.current_signatures}/{payment.required_signatures})',
            'payment': PaymentSerializer(payment).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Rejeter un paiement en attente"""
        payment = self.get_object()

        if payment.status not in ['PENDING_APPROVAL']:
            return Response(
                {'error': 'Seuls les paiements en attente peuvent être rejetés'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = request.data.get('reason', 'Rejeté par approbateur')

        payment.status = 'CANCELLED'
        payment.notes = f"{payment.notes}\n\nRejet: {reason}" if payment.notes else f"Rejet: {reason}"
        payment.save()

        return Response(
            PaymentSerializer(payment).data,
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """
        Exécuter un paiement approuvé
        OPTIMISATION: Gestion d'erreurs robuste + validation complète
        MFA: Requis automatiquement pour paiements >= 100k XAF
        """
        payment = self.get_object()

        # MFA Check: Vérifier si MFA requis pour ce montant
        context = {'amount': float(payment.amount_in_base_currency), 'payment_id': str(payment.id)}
        if MFAService.requires_mfa(request.user, 'PAYMENT_EXECUTION', context):
            mfa_code = request.data.get('mfa_code')
            challenge_code = request.data.get('challenge_code')

            if not mfa_code or not challenge_code:
                # Créer challenge MFA
                challenge = MFAService.create_challenge(
                    user=request.user,
                    action_type='PAYMENT_EXECUTION',
                    context=context
                )

                return Response({
                    'mfa_required': True,
                    'challenge_code': challenge.challenge_code,
                    'amount': float(payment.amount_in_base_currency),
                    'message': 'MFA requis pour ce paiement (montant >= 100 000 XAF). Veuillez fournir votre code authenticator.'
                }, status=status.HTTP_403_FORBIDDEN)

            # Vérifier challenge MFA
            success, error = MFAService.verify_challenge(challenge_code, mfa_code)

            if not success:
                return Response({
                    'mfa_required': True,
                    'error': error,
                    'challenge_code': challenge_code
                }, status=status.HTTP_403_FORBIDDEN)

        # Validation 1: État du paiement
        if not payment.can_be_executed():
            # Déterminer les raisons spécifiques
            reasons = []
            if payment.status != 'APPROVED':
                reasons.append(f"Statut invalide: {payment.status} (requis: APPROVED)")
            if payment.current_signatures < payment.required_signatures:
                reasons.append(f"Signatures insuffisantes: {payment.current_signatures}/{payment.required_signatures}")
            if payment.execution_date:
                reasons.append("Paiement déjà exécuté")

            raise PaymentNotExecutableException(
                payment_ref=payment.payment_reference,
                reasons=reasons
            )

        # Validation 2: Compte bancaire actif
        if payment.bank_account.status != 'ACTIVE':
            raise AccountInactiveException(
                account_label=payment.bank_account.label,
                account_status=payment.bank_account.status
            )

        # Validation 3: Solde suffisant (pour OUTBOUND)
        if payment.direction == 'OUTBOUND':
            available_balance = payment.bank_account.available_balance
            required_amount = payment.amount_in_base_currency

            if available_balance < required_amount:
                raise InsufficientBalanceException(
                    required_amount=required_amount,
                    available_balance=available_balance,
                    account_label=payment.bank_account.label
                )

        # Exécution transactionnelle
        with transaction.atomic():
            # Débiter/Créditer le compte bancaire
            if payment.direction == 'OUTBOUND':
                payment.bank_account.current_balance -= payment.amount_in_base_currency
            else:  # INBOUND
                payment.bank_account.current_balance += payment.amount_in_base_currency

            payment.bank_account.save(update_fields=['current_balance', 'updated_at'])

            # Mettre à jour le paiement
            payment.status = 'EXECUTED'
            payment.execution_date = date.today()
            payment.save()

            # Créer écriture comptable automatique
            try:
                from apps.treasury.services.accounting_entry_service import AccountingEntryService
                accounting_entry = AccountingEntryService.create_payment_entry(payment)
            except Exception as e:
                # Log l'erreur mais ne bloque pas l'exécution du paiement
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Erreur création écriture comptable pour {payment.payment_reference}: {str(e)}")

        return Response({
            'message': 'Paiement exécuté avec succès',
            'payment': PaymentSerializer(payment).data,
            'new_balance': float(payment.bank_account.current_balance)
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Annuler un paiement
        Seulement possible si pas encore exécuté
        """
        payment = self.get_object()

        if payment.status in ['EXECUTED', 'CONFIRMED']:
            return Response(
                {'error': 'Impossible d\'annuler un paiement déjà exécuté'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = request.data.get('reason', 'Annulé par utilisateur')

        payment.status = 'CANCELLED'
        payment.notes = f"{payment.notes}\n\nAnnulation: {reason}" if payment.notes else f"Annulation: {reason}"
        payment.save()

        return Response(
            PaymentSerializer(payment).data,
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'])
    def pending_approvals(self, request):
        """
        Liste des paiements en attente d'approbation
        Pour tableau de bord des approbateurs
        """
        pending = self.get_queryset().filter(
            status='PENDING_APPROVAL'
        ).order_by('value_date')

        serializer = PaymentSerializer(pending, many=True)

        return Response({
            'count': pending.count(),
            'payments': serializer.data
        })

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Statistiques sur les paiements
        Par statut, montant total, etc.
        """
        queryset = self.get_queryset()

        from django.db.models import Count, Sum
        from decimal import Decimal

        stats_by_status = queryset.values('status').annotate(
            count=Count('id'),
            total_amount=Sum('amount_in_base_currency')
        )

        stats_by_direction = queryset.values('direction').annotate(
            count=Count('id'),
            total_amount=Sum('amount_in_base_currency')
        )

        return Response({
            'total_payments': queryset.count(),
            'by_status': list(stats_by_status),
            'by_direction': list(stats_by_direction),
            'pending_approvals': queryset.filter(status='PENDING_APPROVAL').count(),
            'awaiting_execution': queryset.filter(status='APPROVED').count()
        })
