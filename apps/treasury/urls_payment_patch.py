"""
PATCH pour ajouter les routes Payment API
À fusionner dans urls.py

AJOUT REQUIS:
1. Import PaymentViewSet
2. Enregistrer dans le router

"""

# ==============================================================================
# DANS urls.py, MODIFIER L'IMPORT (ligne 8-11):
# ==============================================================================
# AVANT:
# from .views import (
#     TreasuryDashboardViewSet, BankAccountViewSet, CashForecastViewSet,
#     FundCallViewSet, BankReconciliationViewSet, CashMovementViewSet
# )

# APRÈS:
from .views import (
    TreasuryDashboardViewSet, BankAccountViewSet, CashForecastViewSet,
    FundCallViewSet, BankReconciliationViewSet, CashMovementViewSet
)
from .views_payment import PaymentViewSet  # ✅ AJOUTER CETTE LIGNE


# ==============================================================================
# DANS urls.py, AJOUTER DANS LE ROUTER (après ligne 17):
# ==============================================================================
# AVANT:
# router.register(r'accounts', BankAccountViewSet, basename='bank-accounts')
# router.register(r'movements', CashMovementViewSet, basename='cash-movements')
# router.register(r'fund-calls', FundCallViewSet, basename='fund-calls')

# APRÈS:
router.register(r'accounts', BankAccountViewSet, basename='bank-accounts')
router.register(r'payments', PaymentViewSet, basename='payments')  # ✅ AJOUTER CETTE LIGNE
router.register(r'movements', CashMovementViewSet, basename='cash-movements')
router.register(r'fund-calls', FundCallViewSet, basename='fund-calls')


# ==============================================================================
# ROUTES DISPONIBLES APRÈS PATCH:
# ==============================================================================
"""
GET    /api/v1/treasury/payments/                   Liste paiements
POST   /api/v1/treasury/payments/                   Créer paiement
GET    /api/v1/treasury/payments/{id}/              Détail paiement
PUT    /api/v1/treasury/payments/{id}/              Modifier paiement
DELETE /api/v1/treasury/payments/{id}/              Supprimer paiement
POST   /api/v1/treasury/payments/{id}/submit_for_approval/   Soumettre
POST   /api/v1/treasury/payments/{id}/approve/                Approuver
POST   /api/v1/treasury/payments/{id}/reject/                 Rejeter
POST   /api/v1/treasury/payments/{id}/execute/                Exécuter
POST   /api/v1/treasury/payments/{id}/cancel/                 Annuler
GET    /api/v1/treasury/payments/pending_approvals/          En attente
GET    /api/v1/treasury/payments/statistics/                 Statistiques
"""
