"""
URLs minimales pour Phase 1 WiseBook API
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from . import views

app_name = 'api'

# Router pour les ViewSets
router = DefaultRouter()

# Core
router.register(r'societes', views.SocieteViewSet, basename='societe')
router.register(r'devises', views.DeviseViewSet, basename='devise')

# Authentication
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'roles', views.RoleViewSet, basename='role')
router.register(r'permissions', views.PermissionViewSet, basename='permission')

# Accounting
router.register(r'exercices', views.FiscalYearViewSet, basename='exercice')
router.register(r'journaux', views.JournalViewSet, basename='journal')
router.register(r'comptes', views.ChartOfAccountsViewSet, basename='compte')
router.register(r'ecritures', views.JournalEntryViewSet, basename='ecriture')
router.register(r'lignes-ecriture', views.JournalEntryLineViewSet, basename='ligne-ecriture')

# Third Party
router.register(r'tiers', views.TiersViewSet, basename='tiers')
router.register(r'adresses-tiers', views.AdresseTiersViewSet, basename='adresse-tiers')
router.register(r'contacts-tiers', views.ContactTiersViewSet, basename='contact-tiers')

# URLs
urlpatterns = [
    # Authentication endpoints
    path('auth/login/', views.login_api, name='login'),
    path('auth/logout/', views.logout_api, name='logout'),
    path('auth/profile/', views.profile_api, name='profile'),

    # JWT Token endpoints
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Router URLs
    path('', include(router.urls)),
]
