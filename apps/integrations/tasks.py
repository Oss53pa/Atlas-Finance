from celery import shared_task
from datetime import datetime, timedelta
from typing import Dict, List, Any
import logging

from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

from .banking import BankingService
from .fiscal import FiscalService
from .webhooks import WebhookService
from .external_apis import ExternalAPIService
from apps.core.models import Societe
from apps.treasury.models import ComptesBancaires
from apps.taxation.models import DeclarationFiscale

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def synchronize_bank_account(self, compte_id: int) -> Dict[str, Any]:
    """Tâche de synchronisation d'un compte bancaire."""
    try:
        compte = ComptesBancaires.objects.get(id=compte_id)
        
        logger.info(f"Début synchronisation compte {compte.nom}")
        
        result = BankingService.synchronize_account(compte)
        
        if result['success']:
            logger.info(f"Synchronisation réussie: {result}")
            
            # Émettre un événement webhook si de nouvelles transactions
            if result['nouvelles_transactions'] > 0:
                WebhookService.emit_event(
                    societe=compte.societe,
                    event_type='treasury.movement',
                    payload={
                        'compte_bancaire_id': compte.id,
                        'nouvelles_transactions': result['nouvelles_transactions'],
                        'nouveau_solde': float(result['nouveau_solde'])
                    }
                )
        else:
            logger.error(f"Échec synchronisation: {result}")
            
            # Retry avec backoff exponentiel
            raise self.retry(
                countdown=60 * (2 ** self.request.retries),
                exc=Exception(result.get('error', 'Erreur inconnue'))
            )
        
        return result
        
    except ComptesBancaires.DoesNotExist:
        logger.error(f"Compte bancaire {compte_id} non trouvé")
        return {'success': False, 'error': 'Compte non trouvé'}
    except Exception as e:
        logger.error(f"Erreur synchronisation compte {compte_id}: {str(e)}")
        
        # Retry automatique
        if self.request.retries < self.max_retries:
            raise self.retry(
                countdown=60 * (2 ** self.request.retries),
                exc=e
            )
        
        return {'success': False, 'error': str(e)}


@shared_task
def synchronize_all_bank_accounts() -> Dict[str, Any]:
    """Synchroniser tous les comptes bancaires actifs."""
    try:
        comptes = ComptesBancaires.objects.filter(
            active=True,
            synchronisation_auto=True
        ).select_related('societe')
        
        stats = {
            'total_comptes': comptes.count(),
            'synchronisations_reussies': 0,
            'synchronisations_echouees': 0,
            'nouvelles_transactions_total': 0
        }
        
        for compte in comptes:
            try:
                result = BankingService.synchronize_account(compte)
                
                if result['success']:
                    stats['synchronisations_reussies'] += 1
                    stats['nouvelles_transactions_total'] += result.get('nouvelles_transactions', 0)
                else:
                    stats['synchronisations_echouees'] += 1
                    
            except Exception as e:
                logger.error(f"Erreur sync compte {compte.id}: {str(e)}")
                stats['synchronisations_echouees'] += 1
        
        logger.info(f"Synchronisation globale terminée: {stats}")
        return stats
        
    except Exception as e:
        logger.error(f"Erreur synchronisation globale: {str(e)}")
        return {'success': False, 'error': str(e)}


@shared_task(bind=True, max_retries=2)
def submit_fiscal_declaration(self, declaration_id: int) -> Dict[str, Any]:
    """Tâche de dépôt d'une déclaration fiscale."""
    try:
        declaration = DeclarationFiscale.objects.get(id=declaration_id)
        
        logger.info(f"Début dépôt déclaration {declaration.type_declaration} - {declaration.societe.nom}")
        
        result = FiscalService.submit_declaration(declaration)
        
        if result['success']:
            logger.info(f"Déclaration déposée: {result}")
            
            # Émettre un événement webhook
            WebhookService.emit_event(
                societe=declaration.societe,
                event_type='tax.declaration.submitted',
                payload={
                    'declaration_id': declaration.id,
                    'type_declaration': declaration.type_declaration,
                    'reference': result.get('reference'),
                    'montant_du': float(declaration.montant_du)
                }
            )
            
            # Envoyer une notification email
            send_fiscal_notification.delay(
                declaration_id=declaration.id,
                notification_type='depot_reussi',
                reference=result.get('reference')
            )
        else:
            logger.error(f"Échec dépôt déclaration: {result}")
            
            # Retry en cas d'erreur
            raise self.retry(
                countdown=300,  # 5 minutes
                exc=Exception(result.get('error', 'Erreur inconnue'))
            )
        
        return result
        
    except DeclarationFiscale.DoesNotExist:
        logger.error(f"Déclaration {declaration_id} non trouvée")
        return {'success': False, 'error': 'Déclaration non trouvée'}
    except Exception as e:
        logger.error(f"Erreur dépôt déclaration {declaration_id}: {str(e)}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=300, exc=e)
        
        return {'success': False, 'error': str(e)}


@shared_task
def check_fiscal_deadlines() -> Dict[str, Any]:
    """Vérifier les échéances fiscales."""
    try:
        # Chercher les déclarations dues dans les 7 prochains jours
        date_limite = timezone.now().date() + timedelta(days=7)
        
        declarations_dues = DeclarationFiscale.objects.filter(
            statut__in=['preparee', 'validee'],
            date_limite_depot__lte=date_limite,
            date_depot__isnull=True
        ).select_related('societe')
        
        stats = {
            'declarations_dues': declarations_dues.count(),
            'notifications_envoyees': 0,
            'webhooks_emis': 0
        }
        
        for declaration in declarations_dues:
            try:
                # Calculer les jours restants
                jours_restants = (declaration.date_limite_depot - timezone.now().date()).days
                
                # Émettre un événement webhook
                WebhookService.emit_event(
                    societe=declaration.societe,
                    event_type='tax.declaration.due',
                    payload={
                        'declaration_id': declaration.id,
                        'type_declaration': declaration.type_declaration,
                        'jours_restants': jours_restants,
                        'date_limite': declaration.date_limite_depot.isoformat(),
                        'montant_du': float(declaration.montant_du)
                    }
                )
                stats['webhooks_emis'] += 1
                
                # Envoyer une notification email
                send_fiscal_notification.delay(
                    declaration_id=declaration.id,
                    notification_type='echeance_proche',
                    jours_restants=jours_restants
                )
                stats['notifications_envoyees'] += 1
                
            except Exception as e:
                logger.error(f"Erreur traitement déclaration {declaration.id}: {str(e)}")
        
        logger.info(f"Vérification échéances fiscales: {stats}")
        return stats
        
    except Exception as e:
        logger.error(f"Erreur vérification échéances: {str(e)}")
        return {'success': False, 'error': str(e)}


@shared_task
def process_webhooks() -> Dict[str, Any]:
    """Traiter les webhooks en attente."""
    try:
        stats = WebhookService.process_pending_webhooks(limit=200)
        
        if stats['processed'] > 0:
            logger.info(f"Webhooks traités: {stats}")
        
        return stats
        
    except Exception as e:
        logger.error(f"Erreur traitement webhooks: {str(e)}")
        return {'success': False, 'error': str(e)}


@shared_task
def cleanup_old_data() -> Dict[str, Any]:
    """Nettoyer les anciennes données."""
    try:
        stats = {
            'webhooks_supprimés': 0,
            'logs_supprimés': 0,
            'sessions_supprimées': 0
        }
        
        # Nettoyer les anciens webhooks
        stats['webhooks_supprimés'] = WebhookService.cleanup_old_events(days=30)
        
        # Nettoyer les anciennes sessions inactives
        from apps.security.models import SessionUtilisateur
        cutoff_date = timezone.now() - timedelta(days=7)
        
        sessions_deleted = SessionUtilisateur.objects.filter(
            active=False,
            date_deconnexion__lt=cutoff_date
        ).delete()[0]
        stats['sessions_supprimées'] = sessions_deleted
        
        # Nettoyer les anciens logs de sécurité
        from apps.security.models import JournalSecurite
        log_cutoff_date = timezone.now() - timedelta(days=90)
        
        logs_deleted = JournalSecurite.objects.filter(
            date_evenement__lt=log_cutoff_date,
            niveau_gravite='INFO'
        ).delete()[0]
        stats['logs_supprimés'] = logs_deleted
        
        logger.info(f"Nettoyage terminé: {stats}")
        return stats
        
    except Exception as e:
        logger.error(f"Erreur nettoyage: {str(e)}")
        return {'success': False, 'error': str(e)}


@shared_task
def refresh_exchange_rates() -> Dict[str, Any]:
    """Rafraîchir les taux de change."""
    try:
        from apps.core.models import Devise, TauxChange
        
        # Récupérer toutes les devises actives
        devises = Devise.objects.filter(active=True)
        
        stats = {
            'devises_traitées': 0,
            'taux_mis_à_jour': 0,
            'erreurs': 0
        }
        
        for devise in devises:
            try:
                rates = ExternalAPIService.get_exchange_rates(devise.code)
                
                if rates:
                    # Mettre à jour les taux de change
                    for target_currency, rate in rates.items():
                        try:
                            devise_cible = Devise.objects.get(code=target_currency)
                            
                            taux_change, created = TauxChange.objects.update_or_create(
                                devise_source=devise,
                                devise_cible=devise_cible,
                                date_taux=timezone.now().date(),
                                defaults={
                                    'taux': rate,
                                    'source': 'API_ExchangeRate'
                                }
                            )
                            
                            if created or taux_change.taux != rate:
                                stats['taux_mis_à_jour'] += 1
                                
                        except Devise.DoesNotExist:
                            # Devise cible non configurée, ignorer
                            pass
                
                stats['devises_traitées'] += 1
                
            except Exception as e:
                logger.error(f"Erreur refresh devise {devise.code}: {str(e)}")
                stats['erreurs'] += 1
        
        logger.info(f"Taux de change rafraîchis: {stats}")
        return stats
        
    except Exception as e:
        logger.error(f"Erreur refresh taux de change: {str(e)}")
        return {'success': False, 'error': str(e)}


@shared_task
def send_fiscal_notification(
    declaration_id: int,
    notification_type: str,
    **kwargs
) -> Dict[str, Any]:
    """Envoyer une notification fiscale."""
    try:
        declaration = DeclarationFiscale.objects.select_related('societe', 'cree_par').get(id=declaration_id)
        
        # Préparer le contenu selon le type
        if notification_type == 'echeance_proche':
            jours_restants = kwargs.get('jours_restants', 0)
            subject = f"Échéance fiscale proche - {declaration.type_declaration}"
            message = f"""
            Bonjour,
            
            La déclaration {declaration.type_declaration} pour {declaration.societe.nom} 
            arrive à échéance dans {jours_restants} jour(s).
            
            Date limite: {declaration.date_limite_depot}
            Montant dû: {declaration.montant_du} {declaration.societe.devise_principale.code}
            
            Veuillez procéder au dépôt via WiseBook.
            
            Cordialement,
            L'équipe WiseBook
            """
        
        elif notification_type == 'depot_reussi':
            reference = kwargs.get('reference', '')
            subject = f"Déclaration déposée - {declaration.type_declaration}"
            message = f"""
            Bonjour,
            
            La déclaration {declaration.type_declaration} pour {declaration.societe.nom} 
            a été déposée avec succès.
            
            Référence: {reference}
            Date de dépôt: {declaration.date_depot}
            Montant dû: {declaration.montant_du} {declaration.societe.devise_principale.code}
            
            Cordialement,
            L'équipe WiseBook
            """
        
        elif notification_type == 'depot_echoue':
            erreur = kwargs.get('erreur', 'Erreur inconnue')
            subject = f"Échec dépôt déclaration - {declaration.type_declaration}"
            message = f"""
            Bonjour,
            
            Le dépôt de la déclaration {declaration.type_declaration} pour {declaration.societe.nom} 
            a échoué.
            
            Erreur: {erreur}
            
            Veuillez vérifier la déclaration et réessayer.
            
            Cordialement,
            L'équipe WiseBook
            """
        
        else:
            return {'success': False, 'error': 'Type de notification inconnu'}
        
        # Envoyer l'email
        recipient_list = [declaration.cree_par.email]
        
        # Ajouter les destinataires additionnels si configurés
        if hasattr(declaration.societe, 'emails_fiscalite'):
            recipient_list.extend(declaration.societe.emails_fiscalite)
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_list,
            fail_silently=False
        )
        
        logger.info(f"Notification fiscale envoyée: {notification_type} pour déclaration {declaration_id}")
        
        return {
            'success': True,
            'notification_type': notification_type,
            'recipients': len(recipient_list)
        }
        
    except DeclarationFiscale.DoesNotExist:
        logger.error(f"Déclaration {declaration_id} non trouvée pour notification")
        return {'success': False, 'error': 'Déclaration non trouvée'}
    except Exception as e:
        logger.error(f"Erreur envoi notification fiscale: {str(e)}")
        return {'success': False, 'error': str(e)}


@shared_task
def generate_periodic_reports() -> Dict[str, Any]:
    """Générer les rapports périodiques."""
    try:
        from apps.reporting.services import ReportingService
        
        stats = {
            'rapports_générés': 0,
            'erreurs': 0
        }
        
        # Récupérer toutes les sociétés actives
        societes = Societe.objects.filter(active=True)
        
        for societe in societes:
            try:
                # Générer le rapport mensuel si c'est le début du mois
                if timezone.now().day == 1:
                    ReportingService.generer_rapport_mensuel(societe)
                    stats['rapports_générés'] += 1
                
                # Générer les alertes budgétaires
                ReportingService.verifier_alertes_budgetaires(societe)
                
            except Exception as e:
                logger.error(f"Erreur génération rapports pour {societe.nom}: {str(e)}")
                stats['erreurs'] += 1
        
        logger.info(f"Rapports périodiques générés: {stats}")
        return stats
        
    except Exception as e:
        logger.error(f"Erreur génération rapports périodiques: {str(e)}")
        return {'success': False, 'error': str(e)}


@shared_task
def run_ml_anomaly_detection() -> Dict[str, Any]:
    """Exécuter la détection d'anomalies ML."""
    try:
        from apps.ml_detection.services import MLDetectionService
        
        stats = {
            'societes_analysées': 0,
            'anomalies_détectées': 0,
            'erreurs': 0
        }
        
        # Analyser toutes les sociétés actives
        societes = Societe.objects.filter(active=True)
        
        for societe in societes:
            try:
                resultats = MLDetectionService.detecter_anomalies_comptables(
                    societe=societe,
                    periode_jours=30
                )
                
                if resultats['anomalies']:
                    stats['anomalies_détectées'] += len(resultats['anomalies'])
                    
                    # Émettre des événements webhook pour chaque anomalie
                    for anomalie in resultats['anomalies']:
                        WebhookService.emit_event(
                            societe=societe,
                            event_type='ml.anomaly.detected',
                            payload={
                                'type_anomalie': anomalie['type'],
                                'score_confiance': anomalie['score'],
                                'description': anomalie['description'],
                                'donnees_concernees': anomalie['data']
                            }
                        )
                
                stats['societes_analysées'] += 1
                
            except Exception as e:
                logger.error(f"Erreur ML pour {societe.nom}: {str(e)}")
                stats['erreurs'] += 1
        
        logger.info(f"Détection ML terminée: {stats}")
        return stats
        
    except Exception as e:
        logger.error(f"Erreur détection ML: {str(e)}")
        return {'success': False, 'error': str(e)}


# Planification des tâches périodiques (à ajouter dans settings/celery.py)
CELERY_BEAT_SCHEDULE = {
    'sync-bank-accounts': {
        'task': 'apps.integrations.tasks.synchronize_all_bank_accounts',
        'schedule': 300.0,  # Toutes les 5 minutes
    },
    'check-fiscal-deadlines': {
        'task': 'apps.integrations.tasks.check_fiscal_deadlines',
        'schedule': 3600.0,  # Toutes les heures
    },
    'process-webhooks': {
        'task': 'apps.integrations.tasks.process_webhooks',
        'schedule': 60.0,  # Toutes les minutes
    },
    'cleanup-old-data': {
        'task': 'apps.integrations.tasks.cleanup_old_data',
        'schedule': 86400.0,  # Tous les jours
    },
    'refresh-exchange-rates': {
        'task': 'apps.integrations.tasks.refresh_exchange_rates',
        'schedule': 3600.0,  # Toutes les heures
    },
    'generate-periodic-reports': {
        'task': 'apps.integrations.tasks.generate_periodic_reports',
        'schedule': 86400.0,  # Tous les jours
    },
    'run-ml-anomaly-detection': {
        'task': 'apps.integrations.tasks.run_ml_anomaly_detection',
        'schedule': 43200.0,  # Toutes les 12 heures
    },
}