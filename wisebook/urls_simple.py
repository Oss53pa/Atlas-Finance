"""
Simple URL configuration for WiseBook startup
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.http import HttpResponse
from django.shortcuts import render
from apps.test_api import fund_calls_all_data, accounts_start_account, fund_call_create, account_payable_grand_livre

def home_view(request):
    # Essayer de rendre le template s'il existe
    try:
        return render(request, 'home.html')
    except:
        # Sinon retourner une page HTML directe
        return HttpResponse("""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WiseBook ERP - Accueil</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; margin: 0; padding: 40px; background: #f5f7fa; }
            .container { max-width: 1000px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
            h1 { color: #2c3e50; margin-bottom: 30px; font-size: 2.5rem; text-align: center; }
            .status { margin: 30px 0; padding: 20px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; color: #155724; text-align: center; font-size: 1.1rem; }
            .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 25px; margin: 40px 0; }
            .feature { padding: 25px; background: #f8f9fa; border-radius: 10px; border-left: 5px solid #4CAF50; }
            .feature h3 { margin-top: 0; color: #2c3e50; }
            .links { text-align: center; margin: 40px 0; }
            .btn { display: inline-block; padding: 15px 25px; margin: 10px; background: #4CAF50; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; transition: all 0.3s; }
            .btn:hover { background: #45a049; transform: translateY(-1px); }
            .btn-secondary { background: #6c757d; }
            .steps { background: #e9ecef; padding: 30px; border-radius: 10px; margin: 30px 0; }
            .steps h2 { color: #495057; margin-top: 0; }
            .steps ol { font-size: 1.1rem; line-height: 1.8; }
            .footer { text-align: center; margin-top: 50px; padding-top: 30px; border-top: 2px solid #e9ecef; color: #6c757d; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🏢 WiseBook ERP</h1>
            
            <div class="status">
                ✅ <strong>Application démarrée avec succès !</strong><br>
                🚀 Prêt pour le développement local
            </div>
            
            <p style="text-align: center; font-size: 1.2rem; color: #495057; margin: 30px 0;">
                Bienvenue dans votre système de gestion intégrée conforme SYSCOHADA
            </p>
            
            <div class="features">
                <div class="feature">
                    <h3>📊 Comptabilité SYSCOHADA</h3>
                    <p>Plan comptable, écritures, balance et états financiers conformes aux normes OHADA.</p>
                </div>
                <div class="feature">
                    <h3>💰 Gestion Trésorerie</h3>
                    <p>Suivi des flux, rapprochements bancaires et prévisions de trésorerie.</p>
                </div>
                <div class="feature">
                    <h3>🏗️ Immobilisations</h3>
                    <p>Gestion des actifs avec calculs automatiques d'amortissements.</p>
                </div>
                <div class="feature">
                    <h3>📈 Reporting Avancé</h3>
                    <p>Tableaux de bord interactifs et rapports personnalisables.</p>
                </div>
                <div class="feature">
                    <h3>🔒 Sécurité Renforcée</h3>
                    <p>MFA, audit trails et conformité RGPD intégrés.</p>
                </div>
                <div class="feature">
                    <h3>⚙️ Workflows Automatisés</h3>
                    <p>Processus de facturation et clôture comptable automatisés.</p>
                </div>
            </div>
            
            <div class="links">
                <a href="/admin/" class="btn">🔧 Administration Django</a>
                <a href="/api/" class="btn btn-secondary">🔌 API REST</a>
            </div>
            
            <div class="steps">
                <h2>🚀 Étapes de configuration</h2>
                <ol>
                    <li><strong>Appliquer les migrations :</strong> <code>python manage.py migrate --settings=wisebook.simple_settings</code></li>
                    <li><strong>Créer un superutilisateur :</strong> <code>python manage.py createsuperuser --settings=wisebook.simple_settings</code></li>
                    <li><strong>Charger les données initiales :</strong> Plan comptable SYSCOHADA, devises...</li>
                    <li><strong>Accéder à l'administration :</strong> <a href="/admin/">Interface d'admin Django</a></li>
                </ol>
            </div>
            
            <div class="footer">
                <p><strong>WiseBook ERP v3.0.0</strong><br>
                Système de gestion intégrée pour l'Afrique<br>
                🌍 Conforme SYSCOHADA | 🔒 Sécurisé | ⚡ Performant</p>
            </div>
        </div>
    </body>
    </html>
    """)

urlpatterns = [
    # Page d'accueil
    path('', home_view, name='home'),

    # Administration Django
    path('admin/', admin.site.urls),

    # API Assets Management
    # path('api/assets-management/', include('apps.assets_management.urls')),  # Désactivé

    # ML Detection API
    # path('api/ml/', include('apps.ml_detection.urls')),  # Désactivé pour démarrage rapide

    # API de test temporaire
    path('accounting/fund-call/all_data/', fund_calls_all_data, name='test-fund-calls'),
    path('accounting/fund-call/', fund_call_create, name='test-create-fund-call'),
    path('accounting/account/start_account/', accounts_start_account, name='test-accounts'),
    path('accounting/account-payable/grand-livre/', account_payable_grand_livre, name='test-account-payable-gl'),
]

# Servir les fichiers statiques en développement
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)