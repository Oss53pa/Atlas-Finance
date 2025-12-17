"""
Authentication URLs - WiseBook ERP
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

app_name = 'authentication'

urlpatterns = [
    # Login/Logout
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),

    # Registration
    path('register/', views.RegisterView.as_view(), name='register'),

    # Profile
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('me/', views.ProfileView.as_view(), name='me'),  # Alias

    # Password
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),

    # JWT Token
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    # Status/Check
    path('check/', views.check_auth, name='check'),
    path('status/', views.auth_status, name='status'),

    # Admin - Users list
    path('users/', views.UsersListView.as_view(), name='users-list'),
]
