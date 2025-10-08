"""
URL configuration for WiseBook project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from graphene_django.views import GraphQLView
from django.views.decorators.csrf import csrf_exempt

from django.views.generic import TemplateView
from django.http import HttpResponse

def home_view(request):
    return HttpResponse("""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WiseBook ERP - Accueil</title>
        <link href="/static/css/responsive.css" rel="stylesheet">
        <link href="/static/css/accessibility.css" rel="stylesheet">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; }
            .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2c3e50; margin-bottom: 20px; }
            .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 30px; }
            .feature { padding: 20px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #4CAF50; }
            .links { margin-top: 30px; }
            .btn { display: inline-block; padding: 12px 24px; margin: 5px; background: #4CAF50; color: white; text-decoration: none; border-radius: 4px; font-weight: 500; }
            .btn-secondary { background: #6c757d; }
            .status { margin: 20px 0; padding: 15px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; color: #155724; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🏢 WiseBook ERP - Système de Gestion Intégrée</h1>
            
            <div class="status">
                ✅ <strong>Application démarrée avec succès !</strong><br>
                Version: 3.0.0 | Environnement: Développement | Base de données: SQLite
            </div>
            
            <p>Bienvenue dans WiseBook ERP, votre solution complète de gestion d'entreprise conforme SYSCOHADA.</p>
            
            <div class="features">
                <div class="feature">
                    <h3>📊 Comptabilité</h3>
                    <p>Gestion complète de la comptabilité générale, analytique et budgétaire selon les normes SYSCOHADA.</p>
                </div>
                <div class="feature">
                    <h3>💰 Trésorerie</h3>
                    <p>Suivi des flux de trésorerie, rapprochements bancaires et prévisions financières.</p>
                </div>
                <div class="feature">
                    <h3>🏗️ Immobilisations</h3>
                    <p>Gestion des immobilisations avec calculs automatiques d'amortissements.</p>
                </div>
                <div class="feature">
                    <h3>📈 Reporting</h3>
                    <p>Tableaux de bord interactifs et rapports financiers personnalisables.</p>
                </div>
                <div class="feature">
                    <h3>🔒 Sécurité</h3>
                    <p>Authentification multi-facteurs, audit trails et conformité RGPD.</p>
                </div>
                <div class="feature">
                    <h3>⚙️ Workflows</h3>
                    <p>Processus automatisés de facturation, encaissement et clôture comptable.</p>
                </div>
            </div>
            
            <div class="links">
                <a href="/admin/" class="btn">🔧 Administration Django</a>
                <a href="/api/docs/" class="btn">📚 Documentation API</a>
                <a href="/graphql/" class="btn btn-secondary">🔍 GraphQL Explorer</a>
                <a href="/dashboard/" class="btn">📊 Tableau de bord (à implémenter)</a>
            </div>
            
            <hr style="margin: 40px 0;">
            
            <h2>🚀 Prochaines étapes</h2>
            <ol>
                <li><strong>Créer un superutilisateur:</strong> <code>python manage.py createsuperuser</code></li>
                <li><strong>Configurer la base de données:</strong> <code>python manage.py migrate</code></li>
                <li><strong>Charger les données initiales:</strong> Plan comptable SYSCOHADA, devises, etc.</li>
                <li><strong>Accéder à l'administration:</strong> <a href="/admin/">/admin/</a></li>
            </ol>
            
            <p style="margin-top: 40px; text-align: center; color: #6c757d; font-size: 14px;">
                WiseBook ERP v3.0.0 - Développé avec Django & React<br>
                📧 Support: support@wisebook.cm | 🌐 Documentation: <a href="/api/docs/">docs.wisebook.cm</a>
            </p>
        </div>
    </body>
    </html>
    """)

urlpatterns = [
    # Home page
    path('', home_view, name='home'),
    
    # Admin
    path('admin/', admin.site.urls),
    
    # Navigation web
    path('dashboard/', TemplateView.as_view(template_name='dashboard.html'), name='dashboard'),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # GraphQL
    path('graphql/', csrf_exempt(GraphQLView.as_view(graphiql=True))),
    
    # API Routes - Phase 1 uniquement
    path('api/v1/', include('apps.api.urls')),

    # Phase 2 - Apps désactivées (à réactiver progressivement)
    # path('api/v1/auth/', include('apps.authentication.urls')),
    # path('api/v1/core/', include('apps.core.urls')),
    # path('api/v1/accounting/', include('apps.accounting.urls')),
    # path('api/v1/third-party/', include('apps.third_party.urls')),
    # path('api/v1/treasury/', include('apps.treasury.urls')),
    # path('api/v1/assets/', include('apps.assets.urls')),
    # path('api/v1/analytics/', include('apps.analytics.urls')),
    # path('api/v1/budgeting/', include('apps.budgeting.urls')),
    # path('api/v1/taxation/', include('apps.taxation.urls')),
    # path('api/v1/closing/', include('apps.closing.urls')),
    # path('api/v1/period-closures/', include('apps.period_closures.urls')),
    # path('api/v1/closures-comptables/', include('apps.closures_comptables.urls')),
    # path('api/v1/reporting/', include('apps.reporting.urls')),
    # path('api/v1/fund-calls/', include('apps.fund_calls.urls')),
    # path('api/v1/consolidation/', include('apps.consolidation.urls')),
    # path('api/ml/', include('apps.ml_detection.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    
    # Debug toolbar
    if 'debug_toolbar' in settings.INSTALLED_APPS:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns

# Custom error pages
# handler400 = 'apps.core.views.bad_request'
# handler403 = 'apps.core.views.permission_denied'
# handler404 = 'apps.core.views.page_not_found'
# handler500 = 'apps.core.views.server_error'