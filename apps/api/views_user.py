from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model

User = get_user_model()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    user = request.user

    user_role = 'comptable'
    if user.is_superuser:
        user_role = 'admin'
    elif hasattr(user, 'role'):
        user_role = user.role

    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'full_name': user.get_full_name() or user.username,
        'role': user_role,
        'is_active': user.is_active,
        'is_superuser': user.is_superuser,
        'date_joined': user.date_joined.isoformat() if hasattr(user, 'date_joined') else None,
        'last_login': user.last_login.isoformat() if user.last_login else None,
    })


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_preferences(request):
    user = request.user

    if request.method == 'GET':
        preferences = {
            'language': 'fr',
            'theme': 'light',
            'notifications_enabled': True,
            'email_notifications': True,
            'default_company': None,
            'default_fiscal_year': None,
            'timezone': 'UTC',
            'date_format': 'DD/MM/YYYY',
            'currency': 'XOF',
        }

        if hasattr(user, 'preferences'):
            preferences.update(user.preferences)

        return Response(preferences)

    elif request.method == 'PUT':
        preferences = request.data

        return Response({
            'message': 'Préférences mises à jour avec succès',
            'preferences': preferences
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_notifications(request):
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 20))
    unread_only = request.query_params.get('unread_only', 'false').lower() == 'true'

    notifications = [
        {
            'id': '1',
            'type': 'info',
            'title': 'Nouvelle écriture validée',
            'message': 'Écriture VE001 a été validée avec succès',
            'read': False,
            'created_at': '2025-09-27T10:30:00Z',
            'url': '/accounting/entries/1',
            'icon': 'CheckCircle',
            'color': 'green'
        },
        {
            'id': '2',
            'type': 'warning',
            'title': 'Rapprochement bancaire en attente',
            'message': '12 transactions en attente de rapprochement',
            'read': False,
            'created_at': '2025-09-27T09:15:00Z',
            'url': '/treasury/reconciliation',
            'icon': 'AlertCircle',
            'color': 'orange'
        },
        {
            'id': '3',
            'type': 'success',
            'title': 'Sauvegarde automatique effectuée',
            'message': 'Base de données sauvegardée avec succès',
            'read': True,
            'created_at': '2025-09-27T00:00:00Z',
            'url': None,
            'icon': 'CheckCircle',
            'color': 'green'
        },
    ]

    if unread_only:
        notifications = [n for n in notifications if not n['read']]

    start = (page - 1) * page_size
    end = start + page_size
    paginated_notifications = notifications[start:end]

    return Response({
        'count': len(notifications),
        'unread_count': len([n for n in notifications if not n['read']]),
        'page': page,
        'page_size': page_size,
        'results': paginated_notifications
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    return Response({
        'message': 'Notification marquée comme lue',
        'notification_id': notification_id
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    return Response({
        'message': 'Toutes les notifications ont été marquées comme lues'
    })