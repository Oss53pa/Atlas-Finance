"""
Vues de test pour les API - Renvoie des données mockées
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from datetime import date, datetime


@api_view(['GET'])
@permission_classes([AllowAny])
def test_fund_calls(request):
    """Test endpoint pour les appels de fonds"""
    # Mock data matching the expected structure
    mock_fund_calls = [
        {
            "id": 1,
            "request_date": "2025-01-15",
            "reference": "AF-2025-0001",
            "is_mark_as_pre_approved": True,
            "leveling_account_from_info": {
                "id": 1,
                "french_description": "Banque BCA",
                "account_number": "5211"
            },
            "leveling_account_to_info": {
                "id": 2,
                "french_description": "Banque UBA",
                "account_number": "5212"
            },
            "amount_requested": 2500000,
            "create_by_user": {
                "id": 1,
                "fullname": "Jean Dupont"
            },
            "comment": "Appel de fonds pour projet Alpha"
        },
        {
            "id": 2,
            "request_date": "2025-02-01",
            "reference": "AF-2025-0002",
            "is_mark_as_pre_approved": False,
            "leveling_account_from_info": {
                "id": 3,
                "french_description": "Caisse Centrale",
                "account_number": "5200"
            },
            "leveling_account_to_info": {
                "id": 4,
                "french_description": "Banque Atlantique",
                "account_number": "5213"
            },
            "amount_requested": 1800000,
            "create_by_user": {
                "id": 2,
                "fullname": "Marie Martin"
            },
            "comment": "Financement équipements Beta"
        }
    ]

    # Filter by date if provided
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')

    filtered_data = mock_fund_calls

    if start_date:
        filtered_data = [
            item for item in filtered_data
            if item['request_date'] >= start_date
        ]

    if end_date:
        filtered_data = [
            item for item in filtered_data
            if item['request_date'] <= end_date
        ]

    return Response(filtered_data)


@api_view(['GET'])
@permission_classes([AllowAny])
def test_accounts(request):
    """Test endpoint pour les comptes comptables"""
    start_by = request.GET.get('start_by', '')

    # Mock accounts data
    mock_accounts = [
        {
            "id": 1,
            "account_number": "5211",
            "french_description": "Banque BCA - Compte Principal"
        },
        {
            "id": 2,
            "account_number": "5212",
            "french_description": "Banque UBA - Compte Secondaire"
        },
        {
            "id": 3,
            "account_number": "5200",
            "french_description": "Caisse Centrale"
        },
        {
            "id": 4,
            "account_number": "5213",
            "french_description": "Banque Atlantique"
        },
        {
            "id": 5,
            "account_number": "5220",
            "french_description": "Banque Populaire"
        },
        {
            "id": 6,
            "account_number": "5230",
            "french_description": "Crédit Lyonnais"
        }
    ]

    # Filter by start_by parameter
    if start_by:
        filtered_accounts = [
            acc for acc in mock_accounts
            if acc['account_number'].startswith(start_by)
        ]
    else:
        filtered_accounts = mock_accounts

    return Response(filtered_accounts)


@api_view(['POST'])
@permission_classes([AllowAny])
def test_create_fund_call(request):
    """Test endpoint pour créer un appel de fonds"""
    data = request.data

    # Mock successful creation
    created_fund_call = {
        "id": 999,
        "request_date": data.get('request_date', str(date.today())),
        "reference": "AF-2025-TEST",
        "is_mark_as_pre_approved": False,
        "leveling_account_from_info": {
            "id": data.get('leveling_account_from', 1),
            "french_description": "Compte Test Départ",
            "account_number": "5200"
        },
        "leveling_account_to_info": {
            "id": data.get('leveling_account_to', 2),
            "french_description": "Compte Test Arrivée",
            "account_number": "5211"
        },
        "amount_requested": data.get('amount', 0),
        "create_by_user": {
            "id": 1,
            "fullname": "Utilisateur Test"
        },
        "comment": data.get('comment', 'Appel de fonds test')
    }

    return Response(created_fund_call, status=status.HTTP_201_CREATED)