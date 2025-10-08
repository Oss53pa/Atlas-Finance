import json
import hmac
import hashlib
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from django.conf import settings
from django.utils import timezone
from django.core.cache import cache
from django.db import models
from django.core.serializers.json import DjangoJSONEncoder
import logging

from apps.core.models import Societe

logger = logging.getLogger(__name__)


class WebhookEvent(models.Model):
    """Modèle pour les événements webhook."""
    
    STATUTS = [
        ('pending', 'En attente'),
        ('sent', 'Envoyé'),
        ('failed', 'Échec'),
        ('retry', 'Nouvelle tentative')
    ]
    
    EVENT_TYPES = [
        ('accounting.entry.created', 'Écriture comptable créée'),
        ('accounting.entry.validated', 'Écriture comptable validée'),
        ('invoice.created', 'Facture créée'),
        ('invoice.paid', 'Facture payée'),
        ('payment.received', 'Paiement reçu'),
        ('treasury.movement', 'Mouvement de trésorerie'),
        ('budget.exceeded', 'Budget dépassé'),
        ('tax.declaration.due', 'Déclaration fiscale due'),
        ('security.alert', 'Alerte de sécurité'),
        ('ml.anomaly.detected', 'Anomalie ML détectée'),
    ]
    
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='webhook_events')
    event_type = models.CharField(max_length=100, choices=EVENT_TYPES)
    payload = models.JSONField()
    endpoint_url = models.URLField()
    statut = models.CharField(max_length=20, choices=STATUTS, default='pending')
    
    # Métadonnées d'envoi
    attempts = models.PositiveIntegerField(default=0)
    last_attempt = models.DateTimeField(null=True, blank=True)
    response_status = models.PositiveIntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    scheduled_for = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'wisebook_webhook_events'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['societe', 'event_type']),
            models.Index(fields=['statut', 'scheduled_for']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.event_type} - {self.societe.nom} ({self.statut})"


class WebhookSubscription(models.Model):
    """Modèle pour les abonnements webhook."""
    
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='webhook_subscriptions')
    endpoint_url = models.URLField()
    event_types = models.JSONField(default=list)  # Liste des types d'événements
    secret_key = models.CharField(max_length=255)  # Pour la signature HMAC
    
    # Configuration
    active = models.BooleanField(default=True)
    retry_enabled = models.BooleanField(default=True)
    max_retries = models.PositiveIntegerField(default=3)
    timeout_seconds = models.PositiveIntegerField(default=30)
    
    # Filtres optionnels
    filters = models.JSONField(default=dict)  # Filtres conditionnels
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_delivery = models.DateTimeField(null=True, blank=True)
    delivery_count = models.PositiveIntegerField(default=0)
    failure_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'wisebook_webhook_subscriptions'
        unique_together = ['societe', 'endpoint_url', 'event_types']
        indexes = [
            models.Index(fields=['societe', 'active']),
            models.Index(fields=['event_types']),
        ]
    
    def __str__(self):
        return f"{self.societe.nom} -> {self.endpoint_url}"
    
    def should_send_event(self, event_type: str, payload: Dict) -> bool:
        """Vérifier si l'événement doit être envoyé."""
        if not self.active:
            return False
        
        if event_type not in self.event_types:
            return False
        
        # Appliquer les filtres
        for filter_key, filter_value in self.filters.items():
            if filter_key in payload:
                if payload[filter_key] != filter_value:
                    return False
        
        return True


class WebhookService:
    """Service principal pour la gestion des webhooks."""
    
    @staticmethod
    def emit_event(
        societe: Societe,
        event_type: str,
        payload: Dict[str, Any],
        immediate: bool = False
    ) -> int:
        """Émettre un événement webhook."""
        try:
            # Récupérer les abonnements actifs
            subscriptions = WebhookSubscription.objects.filter(
                societe=societe,
                active=True,
                event_types__contains=event_type
            )
            
            events_created = 0
            for subscription in subscriptions:
                if subscription.should_send_event(event_type, payload):
                    # Enrichir le payload avec des métadonnées
                    enriched_payload = {
                        'event_type': event_type,
                        'timestamp': timezone.now().isoformat(),
                        'societe': {
                            'id': societe.id,
                            'nom': societe.nom,
                            'siret': societe.siret
                        },
                        'data': payload
                    }
                    
                    # Créer l'événement
                    event = WebhookEvent.objects.create(
                        societe=societe,
                        event_type=event_type,
                        payload=enriched_payload,
                        endpoint_url=subscription.endpoint_url,
                        scheduled_for=timezone.now() if immediate else None
                    )
                    
                    events_created += 1
                    
                    # Envoyer immédiatement si demandé
                    if immediate:
                        WebhookService.send_webhook(event, subscription)
            
            logger.info(f"Événement webhook créé: {event_type} pour {societe.nom} ({events_created} abonnements)")
            return events_created
            
        except Exception as e:
            logger.error(f"Erreur création événement webhook: {str(e)}")
            return 0
    
    @staticmethod
    def send_webhook(event: WebhookEvent, subscription: WebhookSubscription) -> bool:
        """Envoyer un webhook."""
        try:
            # Préparer les headers
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'WiseBook-Webhook/3.0',
                'X-WiseBook-Event': event.event_type,
                'X-WiseBook-Delivery': str(event.id),
                'X-WiseBook-Timestamp': str(int(timezone.now().timestamp()))
            }
            
            # Calculer la signature HMAC
            payload_bytes = json.dumps(event.payload, cls=DjangoJSONEncoder).encode('utf-8')
            signature = hmac.new(
                subscription.secret_key.encode('utf-8'),
                payload_bytes,
                hashlib.sha256
            ).hexdigest()
            headers['X-WiseBook-Signature-256'] = f'sha256={signature}'
            
            # Mettre à jour les tentatives
            event.attempts += 1
            event.last_attempt = timezone.now()
            event.statut = 'pending'
            
            # Envoyer la requête
            response = requests.post(
                subscription.endpoint_url,
                json=event.payload,
                headers=headers,
                timeout=subscription.timeout_seconds
            )
            
            # Traiter la réponse
            event.response_status = response.status_code
            event.response_body = response.text[:1000]  # Limiter la taille
            
            if response.status_code in [200, 201, 202, 204]:
                event.statut = 'sent'
                subscription.delivery_count += 1
                subscription.last_delivery = timezone.now()
                subscription.failure_count = 0  # Reset compteur échecs
                success = True
            else:
                event.statut = 'failed'
                subscription.failure_count += 1
                success = False
            
            event.save()
            subscription.save()
            
            logger.info(f"Webhook envoyé: {event.event_type} -> {subscription.endpoint_url} (status: {response.status_code})")
            return success
            
        except requests.exceptions.Timeout:
            event.statut = 'failed'
            event.response_body = 'Timeout'
            event.save()
            subscription.failure_count += 1
            subscription.save()
            logger.error(f"Timeout webhook: {subscription.endpoint_url}")
            return False
            
        except requests.exceptions.RequestException as e:
            event.statut = 'failed'
            event.response_body = str(e)[:1000]
            event.save()
            subscription.failure_count += 1
            subscription.save()
            logger.error(f"Erreur webhook: {subscription.endpoint_url} - {str(e)}")
            return False
            
        except Exception as e:
            event.statut = 'failed'
            event.response_body = f'Erreur interne: {str(e)}'
            event.save()
            logger.error(f"Erreur webhook interne: {str(e)}")
            return False
    
    @staticmethod
    def process_pending_webhooks(limit: int = 100) -> Dict[str, int]:
        """Traiter les webhooks en attente."""
        stats = {
            'processed': 0,
            'sent': 0,
            'failed': 0,
            'retry_scheduled': 0
        }
        
        try:
            # Récupérer les événements à traiter
            pending_events = WebhookEvent.objects.filter(
                statut__in=['pending', 'retry'],
                attempts__lt=models.F('webhooksubscription__max_retries')
            ).select_related('societe')[:limit]
            
            for event in pending_events:
                # Récupérer l'abonnement correspondant
                try:
                    subscription = WebhookSubscription.objects.get(
                        societe=event.societe,
                        endpoint_url=event.endpoint_url,
                        active=True
                    )
                except WebhookSubscription.DoesNotExist:
                    event.statut = 'failed'
                    event.response_body = 'Abonnement non trouvé ou inactif'
                    event.save()
                    stats['failed'] += 1
                    continue
                
                # Vérifier si on doit attendre avant le retry
                if event.attempts > 0 and subscription.retry_enabled:
                    # Backoff exponentiel: 2^attempt minutes
                    wait_minutes = 2 ** (event.attempts - 1)
                    next_attempt = event.last_attempt + timedelta(minutes=wait_minutes)
                    
                    if timezone.now() < next_attempt:
                        continue  # Pas encore temps pour le retry
                
                # Envoyer le webhook
                success = WebhookService.send_webhook(event, subscription)
                
                if success:
                    stats['sent'] += 1
                else:
                    if event.attempts < subscription.max_retries and subscription.retry_enabled:
                        event.statut = 'retry'
                        event.save()
                        stats['retry_scheduled'] += 1
                    else:
                        stats['failed'] += 1
                
                stats['processed'] += 1
            
            logger.info(f"Webhooks traités: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Erreur traitement webhooks: {str(e)}")
            return stats
    
    @staticmethod
    def cleanup_old_events(days: int = 30) -> int:
        """Nettoyer les anciens événements."""
        try:
            cutoff_date = timezone.now() - timedelta(days=days)
            
            deleted_count = WebhookEvent.objects.filter(
                created_at__lt=cutoff_date,
                statut__in=['sent', 'failed']
            ).delete()[0]
            
            logger.info(f"Webhooks nettoyés: {deleted_count} événements supprimés")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Erreur nettoyage webhooks: {str(e)}")
            return 0


class WebhookEventMixin:
    """Mixin pour les modèles qui émettent des événements webhook."""
    
    WEBHOOK_EVENTS = {}  # À définir dans les classes filles
    
    def emit_webhook_event(self, event_type: str, extra_data: Dict = None):
        """Émettre un événement webhook pour ce modèle."""
        if not hasattr(self, 'societe') or not self.societe:
            return
        
        # Préparer le payload de base
        payload = {
            'id': self.id,
            'model': self._meta.label_lower,
        }
        
        # Ajouter les champs configurés
        if event_type in self.WEBHOOK_EVENTS:
            fields = self.WEBHOOK_EVENTS[event_type]
            for field in fields:
                if hasattr(self, field):
                    value = getattr(self, field)
                    # Sérialiser les valeurs complexes
                    if hasattr(value, 'isoformat'):  # DateTime
                        payload[field] = value.isoformat()
                    elif hasattr(value, 'id'):  # Relations
                        payload[field] = {'id': value.id, 'name': str(value)}
                    else:
                        payload[field] = value
        
        # Ajouter les données extra
        if extra_data:
            payload.update(extra_data)
        
        # Émettre l'événement
        WebhookService.emit_event(
            societe=self.societe,
            event_type=event_type,
            payload=payload
        )


# Mixins spécialisés pour différents types d'événements

class AccountingWebhookMixin(WebhookEventMixin):
    """Mixin pour les événements comptables."""
    
    WEBHOOK_EVENTS = {
        'accounting.entry.created': ['numero_piece', 'date_comptable', 'montant_total', 'journal'],
        'accounting.entry.validated': ['numero_piece', 'date_validation', 'validee_par'],
    }


class InvoiceWebhookMixin(WebhookEventMixin):
    """Mixin pour les événements de facturation."""
    
    WEBHOOK_EVENTS = {
        'invoice.created': ['numero', 'date_facture', 'montant_ttc', 'client', 'type_facture'],
        'invoice.paid': ['numero', 'date_paiement', 'montant_paye', 'mode_paiement'],
    }


class TreasuryWebhookMixin(WebhookEventMixin):
    """Mixin pour les événements de trésorerie."""
    
    WEBHOOK_EVENTS = {
        'treasury.movement': ['reference_externe', 'date_valeur', 'montant', 'compte_bancaire'],
        'payment.received': ['montant', 'date_valeur', 'libelle'],
    }


class BudgetWebhookMixin(WebhookEventMixin):
    """Mixin pour les événements budgétaires."""
    
    WEBHOOK_EVENTS = {
        'budget.exceeded': ['nom', 'montant_depasse', 'pourcentage_realisation'],
    }


class SecurityWebhookMixin(WebhookEventMixin):
    """Mixin pour les événements de sécurité."""
    
    WEBHOOK_EVENTS = {
        'security.alert': ['type_evenement', 'niveau_gravite', 'description', 'adresse_ip'],
    }


# Fonctions utilitaires pour l'intégration

def validate_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Valider la signature d'un webhook entrant."""
    try:
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        # Signature au format sha256=hash
        if signature.startswith('sha256='):
            provided_signature = signature[7:]
        else:
            provided_signature = signature
        
        return hmac.compare_digest(expected_signature, provided_signature)
        
    except Exception:
        return False


def webhook_required(secret_header: str = 'X-WiseBook-Signature-256'):
    """Décorateur pour valider les webhooks entrants."""
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            # Récupérer la signature
            signature = request.META.get(f'HTTP_{secret_header.upper().replace("-", "_")}')
            if not signature:
                return JsonResponse({'error': 'Signature manquante'}, status=401)
            
            # Récupérer le secret (à implémenter selon votre logique)
            # secret = get_webhook_secret_for_request(request)
            secret = settings.WEBHOOK_SECRET  # Temporaire
            
            # Valider la signature
            if not validate_webhook_signature(request.body, signature, secret):
                return JsonResponse({'error': 'Signature invalide'}, status=401)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator