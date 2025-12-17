"""
Integration Views
API endpoints for banking and fiscal integrations.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from apps.treasury.models import BankAccount, CashMovement
from apps.core.models import Societe
from .banking import PSD2Connector, AfricanBankingConnector
from .fiscal import OHADAFiscalConnector
from .serializers import (
    BankConnectionSerializer,
    BankTransactionSerializer,
    FiscalIntegrationSerializer,
    SyncResultSerializer
)


class BankConnectionListView(APIView):
    """
    GET /api/integrations/connections/
    List all banking connections for a workspace.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get bank accounts (connections)
        accounts = BankAccount.objects.filter(
            company__workspace=request.user.workspace,
            is_active=True
        )

        connections = []
        for account in accounts:
            connections.append({
                'id': str(account.id),
                'bank_name': account.bank_name,
                'account_number': account.account_number,
                'account_type': account.account_type,
                'currency': account.currency,
                'balance': account.balance,
                'is_active': account.is_active,
                'last_sync': account.last_sync,
                'created_at': account.created_at,
            })

        serializer = BankConnectionSerializer(connections, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class BankConnectionView(APIView):
    """
    POST /api/integrations/banking/connect/
    Connect a new bank account.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data

        # Create bank account connection
        # TODO: Implement actual bank connection logic
        connection = {
            'id': 'new-connection-id',
            'bank_name': data.get('bank_name'),
            'status': 'pending',
            'message': 'Bank connection initiated. Please complete authentication.',
            'auth_url': f'https://bank-auth-url.com/auth?ref={data.get("bank_name")}'
        }

        return Response(connection, status=status.HTTP_201_CREATED)


class BankSyncView(APIView):
    """
    POST /api/integrations/banking/sync/<connection_id>/
    Sync transactions from a bank connection.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, connection_id):
        try:
            account = BankAccount.objects.get(
                id=connection_id,
                company__workspace=request.user.workspace
            )
        except BankAccount.DoesNotExist:
            return Response(
                {'error': 'Bank connection not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Determine connector type based on bank
        connector = None
        if account.bank_name in ['BNP Paribas', 'Societe Generale', 'Credit Agricole']:
            connector = PSD2Connector(account)
        elif account.bank_name in ['ECOBANK', 'BGFI', 'BICICI', 'CORIS']:
            connector = AfricanBankingConnector(account)
        else:
            # Default to PSD2 for other banks
            connector = PSD2Connector(account)

        # Authenticate and sync
        if not connector.authenticate():
            return Response(
                {'error': 'Authentication failed'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Get transactions for last 30 days
        date_fin = timezone.now()
        date_debut = date_fin - timedelta(days=30)

        transactions = connector.get_transactions(date_debut, date_fin)

        # Import transactions
        imported_count = 0
        for trans in transactions:
            # Check if transaction already exists
            exists = CashMovement.objects.filter(
                bank_account=account,
                reference=trans.reference
            ).exists()

            if not exists:
                CashMovement.objects.create(
                    bank_account=account,
                    date_valeur=trans.date_valeur,
                    date_operation=trans.date_operation,
                    montant=trans.montant,
                    libelle=trans.libelle,
                    type_mouvement=trans.type_operation,
                    solde_apres=trans.solde_apres,
                    reference=trans.reference,
                    statut='imported'
                )
                imported_count += 1

        # Update last sync time
        account.last_sync = timezone.now()
        account.save()

        result = {
            'connection_id': str(connection_id),
            'status': 'success',
            'transactions_imported': imported_count,
            'transactions_total': len(transactions),
            'last_sync': account.last_sync,
        }

        serializer = SyncResultSerializer(result)
        return Response(serializer.data, status=status.HTTP_200_OK)


class FiscalIntegrationView(APIView):
    """
    GET /api/integrations/fiscal/
    Get fiscal integration status and information.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get user's company
        company = request.user.company

        # Check if fiscal integration is configured
        has_fiscal_config = hasattr(company, 'configuration_fiscale') and company.configuration_fiscale

        fiscal_info = {
            'company_id': str(company.id),
            'is_configured': has_fiscal_config,
            'country': company.pays if hasattr(company, 'pays') else 'CI',
            'tax_id': company.numero_contribuable if hasattr(company, 'numero_contribuable') else None,
            'fiscal_year': company.current_fiscal_year.code if hasattr(company, 'current_fiscal_year') else None,
            'next_declaration_date': None,  # TODO: Calculate from tax calendar
            'pending_declarations': 0,  # TODO: Count from DeclarationFiscale
        }

        serializer = FiscalIntegrationSerializer(fiscal_info)
        return Response(serializer.data, status=status.HTTP_200_OK)


class FiscalSubmitDeclarationView(APIView):
    """
    POST /api/integrations/fiscal/submit/
    Submit a fiscal declaration to tax authority.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        declaration_id = request.data.get('declaration_id')

        # TODO: Get declaration from DB
        # TODO: Submit via fiscal connector
        # TODO: Update declaration status

        return Response({
            'status': 'submitted',
            'reference': 'DECL-2025-001',
            'message': 'Declaration submitted successfully',
            'submission_date': timezone.now(),
        }, status=status.HTTP_200_OK)
