"""
Documentation OpenAPI pour les endpoints Treasury
Utilise drf-spectacular pour générer documentation Swagger/Redoc
"""
from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
    OpenApiParameter,
    OpenApiExample,
    OpenApiResponse
)
from drf_spectacular.types import OpenApiTypes
from rest_framework import status


# Documentation pour PaymentViewSet

payment_list_doc = extend_schema(
    summary="Liste des paiements",
    description="""
    Récupère la liste des paiements de l'entreprise connectée.

    **Filtres disponibles:**
    - status: Filtrer par statut (DRAFT, PENDING_APPROVAL, APPROVED, EXECUTED, etc.)
    - direction: Filtrer par direction (INBOUND, OUTBOUND)
    - bank_account: Filtrer par compte bancaire (UUID)

    **Permissions requises:**
    - Utilisateur authentifié
    - Membre de l'entreprise
    """,
    parameters=[
        OpenApiParameter(
            name='status',
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description='Statut du paiement',
            enum=['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'EXECUTED', 'CONFIRMED', 'CANCELLED', 'FAILED']
        ),
        OpenApiParameter(
            name='direction',
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description='Direction du paiement',
            enum=['INBOUND', 'OUTBOUND']
        ),
        OpenApiParameter(
            name='bank_account',
            type=OpenApiTypes.UUID,
            location=OpenApiParameter.QUERY,
            description='UUID du compte bancaire'
        ),
    ],
    responses={
        200: OpenApiResponse(
            description='Liste des paiements récupérée avec succès'
        ),
        401: OpenApiResponse(description='Non authentifié'),
        403: OpenApiResponse(description='Permission refusée')
    },
    tags=['Payments']
)

payment_create_doc = extend_schema(
    summary="Créer un paiement",
    description="""
    Crée un nouveau paiement en statut DRAFT.

    **Workflow:**
    1. Créer paiement (DRAFT)
    2. submit_for_approval() → PENDING_APPROVAL
    3. approve() (N fois) → APPROVED
    4. execute() → EXECUTED

    **Signatures requises (automatique):**
    - Montant < 10,000: 1 signature
    - Montant < 100,000: 2 signatures
    - Montant ≥ 100,000: 3 signatures
    """,
    examples=[
        OpenApiExample(
            'Paiement fournisseur',
            value={
                "bank_account": "uuid-of-account",
                "payment_type": "SEPA",
                "direction": "OUTBOUND",
                "amount": 50000.00,
                "currency": "XOF",
                "beneficiary_name": "Fournisseur ABC",
                "beneficiary_account": "FR7612345678901234567890123",
                "description": "Facture #12345"
            },
            request_only=True
        )
    ],
    responses={
        201: OpenApiResponse(description='Paiement créé avec succès'),
        400: OpenApiResponse(description='Données invalides'),
        401: OpenApiResponse(description='Non authentifié'),
        403: OpenApiResponse(description='Permission refusée')
    },
    tags=['Payments']
)

payment_submit_approval_doc = extend_schema(
    summary="Soumettre pour approbation",
    description="""
    Change le statut d'un paiement de DRAFT à PENDING_APPROVAL.

    **Validations:**
    - Paiement doit être en statut DRAFT
    - Bénéficiaire requis
    - Compte bénéficiaire requis
    """,
    request=None,
    responses={
        200: OpenApiResponse(description='Paiement soumis avec succès'),
        400: OpenApiResponse(
            description='Validation échouée',
            examples=[
                OpenApiExample(
                    'Erreur statut',
                    value={
                        "error": "Seuls les paiements en brouillon peuvent être soumis"
                    }
                )
            ]
        )
    },
    tags=['Payments - Workflow']
)

payment_approve_doc = extend_schema(
    summary="Approuver un paiement",
    description="""
    Ajoute une signature au paiement.

    **Logique:**
    - Incrémente current_signatures
    - Si current_signatures ≥ required_signatures → statut APPROVED
    - Sinon reste PENDING_APPROVAL

    **Exemple:**
    - Paiement de 50,000 XOF → 2 signatures requises
    - Première approbation: 1/2 (PENDING_APPROVAL)
    - Deuxième approbation: 2/2 (APPROVED)
    """,
    request=None,
    responses={
        200: OpenApiResponse(
            description='Signature ajoutée',
            examples=[
                OpenApiExample(
                    'Signature ajoutée',
                    value={
                        "message": "Signature ajoutée (2/2)",
                        "payment": {
                            "id": "uuid",
                            "status": "APPROVED",
                            "current_signatures": 2,
                            "required_signatures": 2
                        }
                    }
                )
            ]
        ),
        400: OpenApiResponse(description='Erreur validation')
    },
    tags=['Payments - Workflow']
)

payment_execute_doc = extend_schema(
    summary="Exécuter un paiement",
    description="""
    Exécute un paiement approuvé et débite/crédite le compte bancaire.

    **Validations:**
    - Statut = APPROVED
    - Compte bancaire actif
    - Solde suffisant (si OUTBOUND)
    - Signatures complètes

    **Actions:**
    - Débite/crédite le compte
    - Change statut → EXECUTED
    - Enregistre execution_date
    - Crée écriture comptable automatique

    **Erreurs possibles:**
    - InsufficientBalanceException (400)
    - PaymentNotExecutableException (400)
    - AccountInactiveException (400)
    """,
    request=None,
    responses={
        200: OpenApiResponse(
            description='Paiement exécuté',
            examples=[
                OpenApiExample(
                    'Exécution réussie',
                    value={
                        "message": "Paiement exécuté avec succès",
                        "payment": {"id": "uuid", "status": "EXECUTED"},
                        "new_balance": 450000.00
                    }
                )
            ]
        ),
        400: OpenApiResponse(
            description='Erreur exécution',
            examples=[
                OpenApiExample(
                    'Solde insuffisant',
                    value={
                        "error": "Solde insuffisant pour effectuer cette opération",
                        "required_amount": 50000.0,
                        "available_balance": 25000.0,
                        "shortfall": 25000.0,
                        "account": "Compte BNI Principal"
                    }
                )
            ]
        )
    },
    tags=['Payments - Workflow']
)

payment_statistics_doc = extend_schema(
    summary="Statistiques paiements",
    description="""
    Récupère les statistiques des paiements de l'entreprise.

    **Métriques:**
    - Nombre total de paiements
    - Répartition par statut (count + montant)
    - Répartition par direction
    - Nombre en attente d'approbation
    - Nombre en attente d'exécution
    """,
    request=None,
    responses={
        200: OpenApiResponse(
            description='Statistiques récupérées',
            examples=[
                OpenApiExample(
                    'Exemple statistiques',
                    value={
                        "total_payments": 150,
                        "by_status": [
                            {
                                "status": "EXECUTED",
                                "count": 100,
                                "total_amount": 5000000.00
                            },
                            {
                                "status": "APPROVED",
                                "count": 15,
                                "total_amount": 750000.00
                            }
                        ],
                        "by_direction": [
                            {
                                "direction": "OUTBOUND",
                                "count": 120,
                                "total_amount": 6000000.00
                            }
                        ],
                        "pending_approvals": 10,
                        "awaiting_execution": 15
                    }
                )
            ]
        )
    },
    tags=['Payments - Analytics']
)


# Documentation pour TreasuryDashboardViewSet

dashboard_position_doc = extend_schema(
    summary="Position de trésorerie temps réel",
    description="""
    Calcule et retourne la position de trésorerie globale de l'entreprise.

    **Inclut:**
    - Solde de tous les comptes actifs
    - Cash-in / Cash-out du jour
    - Prévisions entrées/sorties
    - Analyse de risque liquidité
    - Alertes actives
    """,
    responses={
        200: OpenApiResponse(description='Position calculée avec succès')
    },
    tags=['Treasury Dashboard']
)

dashboard_kpis_doc = extend_schema(
    summary="KPIs principaux",
    description="""
    Retourne les indicateurs clés du dashboard trésorerie.

    **KPIs:**
    - all_accounts_balance: Solde total
    - cash_in: Entrées du jour
    - cash_out: Sorties du jour
    - actual_balance: Solde actuel
    - landing_forecast: Prévision fin de période
    - liquidity_risk_score: Score de risque (0-100)
    - days_coverage: Nombre de jours de couverture
    """,
    responses={
        200: OpenApiResponse(description='KPIs récupérés')
    },
    tags=['Treasury Dashboard']
)


# Documentation pour BankAccountViewSet

account_consolidation_doc = extend_schema(
    summary="Consolidation multi-comptes",
    description="""
    Vue consolidée de tous les comptes bancaires actifs.

    **Informations par compte:**
    - Solde actuel
    - Découvert autorisé
    - Solde disponible
    - Dernière mise à jour
    - Informations banque
    """,
    responses={
        200: OpenApiResponse(description='Consolidation générée')
    },
    tags=['Bank Accounts']
)


# Application de la documentation aux ViewSets
"""
Dans views_payment.py, ajouter:

from apps.treasury.api_documentation import (
    payment_list_doc, payment_create_doc,
    payment_submit_approval_doc, payment_approve_doc,
    payment_execute_doc, payment_statistics_doc
)

@extend_schema_view(
    list=payment_list_doc,
    create=payment_create_doc,
    submit_for_approval=payment_submit_approval_doc,
    approve=payment_approve_doc,
    execute=payment_execute_doc,
    statistics=payment_statistics_doc
)
class PaymentViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    ...
"""


# Configuration drf-spectacular dans settings.py
SPECTACULAR_SETTINGS = {
    'TITLE': 'WiseBook Treasury API',
    'DESCRIPTION': """
    API REST pour la gestion de trésorerie enterprise-grade.

    ## Fonctionnalités

    - **Paiements:** Création, approbation multi-niveaux, exécution
    - **Comptes bancaires:** Consolidation, rapprochement
    - **Appels de fonds:** Gestion automatique des besoins
    - **Prévisions:** Cash-flow 13 semaines, scénarios
    - **Dashboard:** KPIs temps réel, alertes

    ## Authentification

    Toutes les routes nécessitent une authentification par token JWT.

    **Header requis:**
    ```
    Authorization: Bearer <votre-token>
    ```

    ## Permissions

    - `IsAuthenticated`: Utilisateur connecté
    - `IsCompanyMember`: Membre de l'entreprise
    """,
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'TAGS': [
        {'name': 'Payments', 'description': 'Gestion des paiements'},
        {'name': 'Payments - Workflow', 'description': 'Workflow d\'approbation'},
        {'name': 'Payments - Analytics', 'description': 'Statistiques et analyses'},
        {'name': 'Treasury Dashboard', 'description': 'Dashboard et KPIs'},
        {'name': 'Bank Accounts', 'description': 'Comptes bancaires'},
    ],
    'SCHEMA_PATH_PREFIX': r'/api/v1',
}
