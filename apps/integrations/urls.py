"""
Integration URLs Configuration
Endpoints for banking and fiscal integrations.
"""
from django.urls import path
from . import views

app_name = 'integrations'

urlpatterns = [
    # Banking Integrations
    path(
        'connections/',
        views.BankConnectionListView.as_view(),
        name='connections-list'
    ),
    path(
        'banking/connect/',
        views.BankConnectionView.as_view(),
        name='banking-connect'
    ),
    path(
        'banking/sync/<uuid:connection_id>/',
        views.BankSyncView.as_view(),
        name='banking-sync'
    ),

    # Fiscal Integrations
    path(
        'fiscal/',
        views.FiscalIntegrationView.as_view(),
        name='fiscal-integration'
    ),
    path(
        'fiscal/submit/',
        views.FiscalSubmitDeclarationView.as_view(),
        name='fiscal-submit'
    ),
]
