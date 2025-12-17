"""
Health check URLs for monitoring
"""
from django.urls import path
from . import views

app_name = 'health'

urlpatterns = [
    # Main healthcheck (checks database + cache)
    path('', views.healthcheck, name='healthcheck'),
    
    # Kubernetes-style probes
    path('ready/', views.readiness, name='readiness'),
    path('live/', views.liveness, name='liveness'),
]
