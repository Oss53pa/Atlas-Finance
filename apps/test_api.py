"""
API de test simple pour les modules WiseBook
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from datetime import date


@csrf_exempt
@require_http_methods(["GET"])
def fund_calls_all_data(request):
    """Endpoint de test pour les appels de fonds"""
    # Mock data matching frontend expectations
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

    # Apply date filters if provided
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

    return JsonResponse(filtered_data, safe=False)


@csrf_exempt
@require_http_methods(["GET"])
def accounts_start_account(request):
    """Endpoint de test pour les comptes commençant par un code"""
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

    # Filter accounts by start_by parameter
    if start_by:
        filtered_accounts = [
            acc for acc in mock_accounts
            if acc['account_number'].startswith(start_by)
        ]
    else:
        filtered_accounts = mock_accounts

    return JsonResponse(filtered_accounts, safe=False)


@csrf_exempt
@require_http_methods(["POST"])
def fund_call_create(request):
    """Endpoint de test pour créer un appel de fonds"""
    try:
        data = json.loads(request.body)

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

        return JsonResponse(created_fund_call, status=201)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def account_payable_grand_livre(request):
    """Endpoint pour récupérer les données Account Payable depuis le Grand Livre (Comptes classe 4)"""

    # Mock data basée sur le Grand Livre - Comptes fournisseurs (401x)
    mock_grand_livre_data = {
        'Puissance 6 sis-p6': {
            'account_number': '4011001',
            'invoices': [
                {
                    'id': 'GL-P6-001',
                    'date_piece': '15/01/2025',
                    'numero_piece': 'E0001',
                    'reference': 'P6-2025-001',
                    'libelle': 'Prestations techniques janvier 2025',
                    'montant_du': 187776468,
                    'montant_impaye': 187776468,
                    'date_echeance': '15/02/2025',
                    'age_jours': 45
                }
            ]
        },
        'Label': {
            'account_number': '4011002',
            'invoices': [
                {
                    'id': 'GL-LB-001',
                    'date_piece': '02/01/2024',
                    'numero_piece': 'E0003',
                    'reference': '650',
                    'libelle': 'Label f 650 assistance technique sage janvier 2024',
                    'montant_du': 247800,
                    'montant_impaye': 247800,
                    'date_echeance': '02/02/2024',
                    'age_jours': 576
                },
                {
                    'id': 'GL-LB-002',
                    'date_piece': '15/01/2024',
                    'numero_piece': 'E0025',
                    'reference': '687',
                    'libelle': 'Label f 687 renouvellement dsu sage paie-comptabilite-immobilisation',
                    'montant_du': 3463772,
                    'montant_impaye': 3463772,
                    'date_echeance': '15/02/2024',
                    'age_jours': 563
                },
                {
                    'id': 'GL-LB-003',
                    'date_piece': '01/02/2024',
                    'numero_piece': 'E0068',
                    'reference': '756',
                    'libelle': 'Label f 756 assistance technique sage fevrier 2024',
                    'montant_du': 247800,
                    'montant_impaye': 247800,
                    'date_echeance': '01/03/2024',
                    'age_jours': 546
                },
                {
                    'id': 'GL-LB-004',
                    'date_piece': '01/03/2024',
                    'numero_piece': 'E0119',
                    'reference': '805',
                    'libelle': 'Label f 805 assistance technique sage mars 2024',
                    'montant_du': 247800,
                    'montant_impaye': 247800,
                    'date_echeance': '01/04/2024',
                    'age_jours': 517
                },
                {
                    'id': 'GL-LB-005',
                    'date_piece': '01/04/2024',
                    'numero_piece': 'E0165',
                    'reference': '1385',
                    'libelle': 'Label f 874 assistant sage avril 2024',
                    'montant_du': 247800,
                    'montant_impaye': 247800,
                    'date_echeance': '01/05/2024',
                    'age_jours': 486
                }
            ]
        },
        'Flash vehicles': {
            'account_number': '4011003',
            'invoices': [
                {
                    'id': 'GL-FV-001',
                    'date_piece': '10/01/2025',
                    'numero_piece': 'E0002',
                    'reference': 'FV-2025-001',
                    'libelle': 'Location véhicules janvier 2025',
                    'montant_du': 5941105,
                    'montant_impaye': 5941105,
                    'date_echeance': '10/02/2025',
                    'age_jours': 60
                },
                {
                    'id': 'GL-FV-002',
                    'date_piece': '12/01/2025',
                    'numero_piece': 'E0004',
                    'reference': 'FV-2025-002',
                    'libelle': 'Maintenance véhicules janvier 2025',
                    'montant_du': 4000000,
                    'montant_impaye': 4000000,
                    'date_echeance': '12/02/2025',
                    'age_jours': 58
                }
            ]
        },
        'CIE': {
            'account_number': '4011004',
            'invoices': [
                {
                    'id': 'GL-CIE-001',
                    'date_piece': '05/01/2025',
                    'numero_piece': 'E0006',
                    'reference': 'CIE-2025-001',
                    'libelle': 'Électricité janvier 2025',
                    'montant_du': 95975192,
                    'montant_impaye': 95975192,
                    'date_echeance': '05/02/2025',
                    'age_jours': 90
                },
                {
                    'id': 'GL-CIE-002',
                    'date_piece': '08/01/2025',
                    'numero_piece': 'E0007',
                    'reference': 'CIE-2025-002',
                    'libelle': 'Électricité février 2025',
                    'montant_du': 90000000,
                    'montant_impaye': 90000000,
                    'date_echeance': '08/02/2025',
                    'age_jours': 87
                }
            ]
        }
    }

    # Calculer le total général
    total_outstanding = 0
    for vendor_data in mock_grand_livre_data.values():
        for invoice in vendor_data['invoices']:
            total_outstanding += invoice['montant_impaye']

    # Retourner les données structurées pour le frontend
    response_data = {
        'total_outstanding': total_outstanding,
        'date_extraction': date.today().isoformat(),
        'source': 'grand_livre',
        'vendors': mock_grand_livre_data
    }

    return JsonResponse(response_data, safe=False)