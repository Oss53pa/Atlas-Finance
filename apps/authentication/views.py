"""
Authentication Views - WiseBook ERP
Complete authentication system with JWT tokens
"""
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth import get_user_model
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    LoginSerializer,
    PasswordChangeSerializer,
)

User = get_user_model()


class LoginView(APIView):
    """
    User login endpoint - Returns JWT tokens
    POST /api/v1/auth/login/
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})

        if not serializer.is_valid():
            return Response(
                {'error': 'Identifiants invalides', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = serializer.validated_data['user']

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        # Determine user role
        if user.is_superuser:
            role = 'admin'
        elif user.is_staff:
            role = 'manager'
        elif hasattr(user, 'role') and user.role:
            role = user.role.code if hasattr(user.role, 'code') else str(user.role)
        else:
            role = 'comptable'

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': str(user.id),
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': role,
                'is_active': user.is_active,
            }
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    User logout endpoint - Blacklist refresh token
    POST /api/v1/auth/logout/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response(
                {'message': 'Déconnexion réussie'},
                status=status.HTTP_200_OK
            )
        except Exception:
            return Response(
                {'message': 'Déconnexion réussie'},
                status=status.HTTP_200_OK
            )


class RegisterView(generics.CreateAPIView):
    """
    User registration endpoint
    POST /api/v1/auth/register/
    """
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {'error': 'Données invalides', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = serializer.save()

        # Generate tokens for auto-login after registration
        refresh = RefreshToken.for_user(user)

        return Response({
            'message': 'Compte créé avec succès',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class ProfileView(APIView):
    """
    User profile endpoint
    GET /api/v1/auth/profile/ - Get current user profile
    PUT/PATCH /api/v1/auth/profile/ - Update profile
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        # Determine role
        if user.is_superuser:
            role = 'admin'
        elif user.is_staff:
            role = 'manager'
        elif hasattr(user, 'role') and user.role:
            role = user.role.code if hasattr(user.role, 'code') else str(user.role)
        else:
            role = 'comptable'

        return Response({
            'id': str(user.id),
            'email': user.email,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': role,
            'is_active': user.is_active,
            'date_joined': user.date_joined,
            'last_login': user.last_login,
            'company': getattr(user, 'societe', None),
            'phone': getattr(user, 'phone', None),
            'permissions': list(user.get_all_permissions()) if hasattr(user, 'get_all_permissions') else [],
        })

    def put(self, request):
        return self._update_profile(request)

    def patch(self, request):
        return self._update_profile(request)

    def _update_profile(self, request):
        user = request.user
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Profil mis à jour',
                'user': UserSerializer(user).data
            })

        return Response(
            {'error': 'Données invalides', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )


class ChangePasswordView(APIView):
    """
    Change password endpoint
    POST /api/v1/auth/change-password/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request}
        )

        if not serializer.is_valid():
            return Response(
                {'error': 'Données invalides', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer.save()

        return Response({
            'message': 'Mot de passe modifié avec succès'
        })


class RefreshTokenView(TokenRefreshView):
    """
    Refresh JWT token
    POST /api/v1/auth/token/refresh/
    """
    pass


class UsersListView(generics.ListAPIView):
    """
    List all users (admin only)
    GET /api/v1/auth/users/
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def check_auth(request):
    """
    Check if user is authenticated
    GET /api/v1/auth/check/
    """
    if request.user.is_authenticated:
        return Response({
            'authenticated': True,
            'user': {
                'id': str(request.user.id),
                'email': request.user.email,
                'username': request.user.username,
            }
        })
    return Response({'authenticated': False})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def auth_status(request):
    """
    Get authentication status and server info
    GET /api/v1/auth/status/
    """
    return Response({
        'status': 'ok',
        'version': '3.0.0',
        'authenticated': request.user.is_authenticated,
    })
