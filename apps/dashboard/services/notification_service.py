"""
Service de gestion des notifications
Crée et gère les notifications utilisateur basées sur les alertes
"""
from django.db.models import Q
from apps.dashboard.models import Notification
from .alert_service import AlertService


class NotificationService:
    """
    Service pour créer et gérer les notifications utilisateur
    """

    def __init__(self, company=None, user=None):
        self.company = company
        self.user = user

    def create_notification_from_alert(self, alert_data, user):
        """
        Crée une notification à partir d'une alerte

        Args:
            alert_data (dict): Données de l'alerte depuis AlertService
            user: Utilisateur destinataire

        Returns:
            Notification: L'instance créée
        """
        notification = Notification.objects.create(
            user=user,
            company=self.company,
            title=alert_data['title'],
            message=alert_data['message'],
            severity=alert_data['severity'],
            category=alert_data['category'],
            notification_type='alert' if alert_data['severity'] in ['high', 'critical'] else 'warning',
            metadata={
                'metric_value': alert_data.get('metric_value'),
                'threshold': alert_data.get('threshold'),
                'action_required': alert_data.get('action_required'),
                'impact': alert_data.get('impact'),
            },
            action_url=f"/{alert_data['category']}"
        )
        return notification

    def create_notifications_from_alerts(self, user):
        """
        Génère toutes les notifications basées sur les alertes actuelles

        Args:
            user: Utilisateur destinataire

        Returns:
            list: Liste des notifications créées
        """
        alert_service = AlertService(company=self.company)
        alerts = alert_service.check_all_alerts()

        notifications = []
        for alert in alerts:
            notification = self.create_notification_from_alert(alert, user)
            notifications.append(notification)

        return notifications

    def get_user_notifications(self, user, filters=None):
        """
        Récupère les notifications d'un utilisateur

        Args:
            user: Utilisateur
            filters (dict): Filtres optionnels (status, severity, category, is_read)

        Returns:
            QuerySet: Notifications filtrées
        """
        queryset = Notification.objects.filter(user=user)

        if self.company:
            queryset = queryset.filter(company=self.company)

        if filters:
            if 'status' in filters:
                queryset = queryset.filter(status=filters['status'])
            if 'severity' in filters:
                queryset = queryset.filter(severity=filters['severity'])
            if 'category' in filters:
                queryset = queryset.filter(category=filters['category'])
            if 'is_read' in filters:
                queryset = queryset.filter(is_read=filters['is_read'])

        return queryset.order_by('-created_at')

    def get_unread_count(self, user):
        """
        Compte le nombre de notifications non lues

        Args:
            user: Utilisateur

        Returns:
            int: Nombre de notifications non lues
        """
        queryset = Notification.objects.filter(user=user, is_read=False)
        if self.company:
            queryset = queryset.filter(company=self.company)
        return queryset.count()

    def get_critical_count(self, user):
        """
        Compte le nombre de notifications critiques non lues

        Args:
            user: Utilisateur

        Returns:
            int: Nombre de notifications critiques non lues
        """
        queryset = Notification.objects.filter(
            user=user,
            is_read=False,
            severity__in=['critical', 'high']
        )
        if self.company:
            queryset = queryset.filter(company=self.company)
        return queryset.count()

    def mark_as_read(self, notification_id, user):
        """
        Marque une notification comme lue

        Args:
            notification_id: ID de la notification
            user: Utilisateur (pour vérifier les permissions)

        Returns:
            bool: True si succès
        """
        try:
            notification = Notification.objects.get(id=notification_id, user=user)
            notification.mark_as_read()
            return True
        except Notification.DoesNotExist:
            return False

    def mark_all_as_read(self, user):
        """
        Marque toutes les notifications d'un utilisateur comme lues

        Args:
            user: Utilisateur

        Returns:
            int: Nombre de notifications marquées
        """
        queryset = Notification.objects.filter(user=user, is_read=False)
        if self.company:
            queryset = queryset.filter(company=self.company)

        count = 0
        for notification in queryset:
            notification.mark_as_read()
            count += 1

        return count

    def archive_notification(self, notification_id, user):
        """
        Archive une notification

        Args:
            notification_id: ID de la notification
            user: Utilisateur (pour vérifier les permissions)

        Returns:
            bool: True si succès
        """
        try:
            notification = Notification.objects.get(id=notification_id, user=user)
            notification.archive()
            return True
        except Notification.DoesNotExist:
            return False

    def delete_old_notifications(self, days=90):
        """
        Supprime les notifications archivées de plus de X jours

        Args:
            days (int): Nombre de jours

        Returns:
            int: Nombre de notifications supprimées
        """
        from django.utils import timezone
        from datetime import timedelta

        cutoff_date = timezone.now() - timedelta(days=days)
        queryset = Notification.objects.filter(
            is_archived=True,
            archived_at__lt=cutoff_date
        )

        if self.company:
            queryset = queryset.filter(company=self.company)

        count = queryset.count()
        queryset.delete()

        return count

    def get_notification_summary(self, user):
        """
        Retourne un résumé des notifications

        Args:
            user: Utilisateur

        Returns:
            dict: Résumé avec compteurs par catégorie et sévérité
        """
        queryset = Notification.objects.filter(user=user, is_read=False)
        if self.company:
            queryset = queryset.filter(company=self.company)

        summary = {
            'total': queryset.count(),
            'by_severity': {
                'critical': queryset.filter(severity='critical').count(),
                'high': queryset.filter(severity='high').count(),
                'medium': queryset.filter(severity='medium').count(),
                'low': queryset.filter(severity='low').count(),
                'info': queryset.filter(severity='info').count(),
            },
            'by_category': {
                'treasury': queryset.filter(category='treasury').count(),
                'receivables': queryset.filter(category='receivables').count(),
                'payables': queryset.filter(category='payables').count(),
                'accounting': queryset.filter(category='accounting').count(),
                'tax': queryset.filter(category='tax').count(),
                'system': queryset.filter(category='system').count(),
            }
        }

        return summary
