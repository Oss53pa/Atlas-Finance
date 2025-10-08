"""
URLs minimales pour WiseBook V3.0 - Développement local
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.views.generic import TemplateView

def api_info(request):
    """Vue d'information de l'API."""
    return JsonResponse({
        'message': 'WiseBook V3.0 API',
        'version': '3.0.0',
        'status': 'Development Mode',
        'description': 'ERP Comptable SYSCOHADA pour l\'Afrique',
        'endpoints': {
            'admin': '/admin/',
            'api': '/api/',
            'docs': '/api/docs/',
        }
    })

class HomeView(TemplateView):
    """Vue d'accueil simple."""
    template_name = 'home.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update({
            'title': 'WiseBook V3.0',
            'version': '3.0.0',
            'description': 'ERP Comptable SYSCOHADA'
        })
        return context

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api_info, name='api-info'),
    path('api/auth/', include('rest_framework.urls')),
    path('', api_info, name='home'),
]