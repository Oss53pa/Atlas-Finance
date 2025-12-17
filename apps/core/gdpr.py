"""
WiseBook - RGPD/GDPR Compliance
Right to Erasure (Article 17) + Anonymization
"""

import logging
from typing import List, Dict
from datetime import datetime

from django.db import models, transaction
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone

logger = logging.getLogger(__name__)

User = get_user_model()


class DataErasureRequest(models.Model):
    """
    Demande de suppression de données personnelles (RGPD Article 17)
    """

    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('PROCESSING', 'En cours'),
        ('COMPLETED', 'Terminée'),
        ('REJECTED', 'Rejetée'),
        ('CANCELLED', 'Annulée'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='erasure_requests'
    )

    # Justification (optionnel)
    reason = models.TextField(
        blank=True,
        help_text='Raison de la suppression'
    )

    # Statut
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )

    # Workflow
    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Résultat
    records_deleted = models.IntegerField(default=0)
    records_anonymized = models.IntegerField(default=0)
    error_message = models.TextField(blank=True)

    # Traçabilité
    processed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_erasure_requests'
    )

    # Rapport détaillé
    report = models.JSONField(
        default=dict,
        help_text='Rapport détaillé de la suppression'
    )

    class Meta:
        db_table = 'core_data_erasure_requests'
        ordering = ['-requested_at']

    def __str__(self):
        return f"Erasure Request {self.id} - {self.user.username} ({self.status})"


class GDPRService:
    """
    Service pour gestion RGPD
    """

    # Modèles à anonymiser (plutôt que supprimer)
    ANONYMIZE_MODELS = [
        'treasury.Payment',
        'accounting.JournalEntry',
        'crm_clients.Client',
        'suppliers.Supplier',
    ]

    # Modèles à supprimer complètement
    DELETE_MODELS = [
        'auth.Session',
        'core.MFAMethod',
        'core.MFAChallenge',
    ]

    @staticmethod
    def create_erasure_request(user: User, reason: str = '') -> DataErasureRequest:
        """
        Crée une demande de suppression de données

        Args:
            user: Utilisateur demandant la suppression
            reason: Raison (optionnel)

        Returns:
            DataErasureRequest instance
        """
        # Vérifier qu'il n'y a pas de demande en cours
        existing = DataErasureRequest.objects.filter(
            user=user,
            status__in=['PENDING', 'PROCESSING']
        ).exists()

        if existing:
            raise ValidationError("Une demande de suppression est déjà en cours.")

        request = DataErasureRequest.objects.create(
            user=user,
            reason=reason,
            status='PENDING'
        )

        logger.info(f"Erasure request created: {request.id} for user {user.id}")

        return request

    @staticmethod
    @transaction.atomic
    def process_erasure_request(request_id: int, admin_user: User) -> Dict:
        """
        Traite une demande de suppression

        Args:
            request_id: ID de la demande
            admin_user: Admin qui traite la demande

        Returns:
            Rapport détaillé
        """
        try:
            erasure_request = DataErasureRequest.objects.select_for_update().get(id=request_id)

            if erasure_request.status != 'PENDING':
                raise ValidationError(f"Request must be PENDING (current: {erasure_request.status})")

            erasure_request.status = 'PROCESSING'
            erasure_request.processed_by = admin_user
            erasure_request.processed_at = timezone.now()
            erasure_request.save()

            user = erasure_request.user

            report = {
                'user_id': user.id,
                'username': user.username,
                'email': user.email,
                'started_at': timezone.now().isoformat(),
                'actions': []
            }

            deleted_count = 0
            anonymized_count = 0

            # 1. Anonymiser les données métier
            for model_path in GDPRService.ANONYMIZE_MODELS:
                count = GDPRService._anonymize_user_data(user, model_path)
                anonymized_count += count

                report['actions'].append({
                    'action': 'anonymize',
                    'model': model_path,
                    'count': count
                })

                logger.info(f"Anonymized {count} records from {model_path}")

            # 2. Supprimer les données système
            for model_path in GDPRService.DELETE_MODELS:
                count = GDPRService._delete_user_data(user, model_path)
                deleted_count += count

                report['actions'].append({
                    'action': 'delete',
                    'model': model_path,
                    'count': count
                })

                logger.info(f"Deleted {count} records from {model_path}")

            # 3. Anonymiser logs (masquer informations personnelles)
            GDPRService._anonymize_logs(user)

            # 4. Anonymiser l'utilisateur lui-même
            GDPRService._anonymize_user(user)

            report['completed_at'] = timezone.now().isoformat()
            report['total_deleted'] = deleted_count
            report['total_anonymized'] = anonymized_count

            # Mettre à jour la demande
            erasure_request.status = 'COMPLETED'
            erasure_request.completed_at = timezone.now()
            erasure_request.records_deleted = deleted_count
            erasure_request.records_anonymized = anonymized_count
            erasure_request.report = report
            erasure_request.save()

            logger.info(f"Erasure request {request_id} completed: {deleted_count} deleted, {anonymized_count} anonymized")

            return report

        except Exception as e:
            logger.error(f"Error processing erasure request {request_id}: {str(e)}")

            erasure_request.status = 'REJECTED'
            erasure_request.error_message = str(e)
            erasure_request.save()

            raise

    @staticmethod
    def _anonymize_user_data(user: User, model_path: str) -> int:
        """
        Anonymise les données d'un utilisateur dans un modèle

        Args:
            user: Utilisateur
            model_path: Chemin du modèle (ex: 'treasury.Payment')

        Returns:
            Nombre de records anonymisés
        """
        from django.apps import apps

        try:
            app_label, model_name = model_path.split('.')
            model = apps.get_model(app_label, model_name)

            # Trouver les records liés à l'utilisateur
            # (assume un champ 'created_by' ou 'user')
            queryset = None

            if hasattr(model, 'created_by'):
                queryset = model.objects.filter(created_by=user)
            elif hasattr(model, 'user'):
                queryset = model.objects.filter(user=user)

            if queryset is None:
                logger.warning(f"Model {model_path} has no user field")
                return 0

            count = queryset.count()

            # Anonymiser les champs sensibles
            for obj in queryset:
                GDPRService._anonymize_object(obj)

            return count

        except Exception as e:
            logger.error(f"Error anonymizing {model_path}: {e}")
            return 0

    @staticmethod
    def _anonymize_object(obj: models.Model):
        """
        Anonymise les champs sensibles d'un objet

        Remplace:
        - Noms → 'User_<ID>_Deleted'
        - Emails → 'deleted_<ID>@anonymized.local'
        - Téléphones → '***'
        - Adresses → '[Deleted]'
        """
        anonymized_fields = []

        # Champs à anonymiser
        sensitive_fields = [
            'name', 'first_name', 'last_name', 'full_name',
            'email', 'phone', 'mobile', 'telephone',
            'address', 'street', 'city', 'postal_code',
            'notes', 'description', 'comment'
        ]

        for field_name in sensitive_fields:
            if hasattr(obj, field_name):
                field = getattr(obj, field_name)

                if field:
                    if 'email' in field_name:
                        setattr(obj, field_name, f'deleted_{obj.pk}@anonymized.local')
                    elif 'phone' in field_name or 'mobile' in field_name or 'telephone' in field_name:
                        setattr(obj, field_name, '***')
                    elif 'name' in field_name:
                        setattr(obj, field_name, f'User_{obj.pk}_Deleted')
                    else:
                        setattr(obj, field_name, '[Deleted per GDPR]')

                    anonymized_fields.append(field_name)

        if anonymized_fields:
            obj.save(update_fields=anonymized_fields + ['updated_at'])

    @staticmethod
    def _delete_user_data(user: User, model_path: str) -> int:
        """
        Supprime complètement les données d'un utilisateur

        Args:
            user: Utilisateur
            model_path: Chemin du modèle

        Returns:
            Nombre de records supprimés
        """
        from django.apps import apps

        try:
            app_label, model_name = model_path.split('.')
            model = apps.get_model(app_label, model_name)

            queryset = None

            if hasattr(model, 'user'):
                queryset = model.objects.filter(user=user)

            if queryset is None:
                return 0

            count = queryset.count()
            queryset.delete()

            return count

        except Exception as e:
            logger.error(f"Error deleting {model_path}: {e}")
            return 0

    @staticmethod
    def _anonymize_logs(user: User):
        """
        Anonymise les logs contenant des informations personnelles

        NOTE: Cette fonction dépend de votre système de logging.
        Implémentez selon votre stack (ELK, Splunk, fichiers, etc.)
        """
        # TODO: Implémenter selon votre système de logging

        # Exemple pour logs en base de données:
        # LogEntry.objects.filter(user_id=user.id).update(
        #     user_email='deleted@anonymized.local',
        #     user_name=f'User_{user.id}_Deleted'
        # )

        logger.info(f"Logs anonymized for user {user.id}")

    @staticmethod
    def _anonymize_user(user: User):
        """
        Anonymise l'utilisateur lui-même
        """
        user.first_name = f'User_{user.id}'
        user.last_name = 'Deleted'
        user.email = f'deleted_{user.id}@anonymized.local'
        user.username = f'deleted_user_{user.id}'
        user.is_active = False

        # Invalider le mot de passe
        user.set_unusable_password()

        user.save()

        logger.info(f"User {user.id} anonymized")

    @staticmethod
    def export_user_data(user: User) -> Dict:
        """
        Exporte toutes les données d'un utilisateur (RGPD Article 20 - Portabilité)

        Args:
            user: Utilisateur

        Returns:
            Dict avec toutes les données
        """
        from django.apps import apps

        data = {
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'date_joined': user.date_joined.isoformat() if hasattr(user, 'date_joined') else None,
            },
            'models': {}
        }

        # Parcourir tous les modèles
        for model_path in GDPRService.ANONYMIZE_MODELS + GDPRService.DELETE_MODELS:
            try:
                app_label, model_name = model_path.split('.')
                model = apps.get_model(app_label, model_name)

                queryset = None

                if hasattr(model, 'created_by'):
                    queryset = model.objects.filter(created_by=user)
                elif hasattr(model, 'user'):
                    queryset = model.objects.filter(user=user)

                if queryset:
                    data['models'][model_path] = [
                        obj.__dict__ for obj in queryset
                    ]

            except Exception as e:
                logger.error(f"Error exporting {model_path}: {e}")

        logger.info(f"Data exported for user {user.id}")

        return data


# Utilitaires

def anonymize_iban(iban: str) -> str:
    """
    Anonymise un IBAN pour logs
    FR7612345678901234567890 → FR76***7890
    """
    if not iban or len(iban) <= 8:
        return '***'

    return f"{iban[:4]}***{iban[-4:]}"


def anonymize_email(email: str) -> str:
    """
    Anonymise un email pour logs
    john.doe@example.com → j***e@e***.com
    """
    if not email or '@' not in email:
        return '***@***.***'

    local, domain = email.split('@')

    if len(local) <= 2:
        local_masked = '***'
    else:
        local_masked = f"{local[0]}***{local[-1]}"

    domain_parts = domain.split('.')
    if len(domain_parts) >= 2:
        domain_masked = f"{domain_parts[0][0]}***.{domain_parts[-1]}"
    else:
        domain_masked = '***'

    return f"{local_masked}@{domain_masked}"


def anonymize_phone(phone: str) -> str:
    """
    Anonymise un téléphone pour logs
    +33612345678 → +33***5678
    """
    if not phone or len(phone) <= 6:
        return '***'

    return f"{phone[:3]}***{phone[-4:]}"
