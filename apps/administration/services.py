import os
import psutil
import logging
import subprocess
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from django.conf import settings
from django.db import connection
from django.core.cache import cache
from django.utils import timezone
from django.db.models import Count, Avg, Max
from celery import current_app as celery_app

from .models import (
    SystemHealth, SystemMetrics, MaintenanceTask, DatabaseBackup,
    SystemAlert, UserActivity, SystemConfiguration, LicenseInfo
)
from apps.core.models import Societe
from apps.security.models import Utilisateur, SessionUtilisateur

logger = logging.getLogger(__name__)


class SystemHealthService:
    """Service pour la surveillance de la santé du système."""
    
    @staticmethod
    def check_all_components() -> Dict[str, Any]:
        """Vérifie l'état de tous les composants."""
        components = {
            'database': SystemHealthService.check_database(),
            'cache': SystemHealthService.check_cache(),
            'celery': SystemHealthService.check_celery(),
            'storage': SystemHealthService.check_storage(),
            'api_external': SystemHealthService.check_external_apis(),
        }
        
        # Sauvegarder les résultats
        for component, result in components.items():
            SystemHealth.objects.create(
                component=component,
                status=result['status'],
                response_time=result.get('response_time'),
                message=result.get('message', ''),
                details=result.get('details', {})
            )
        
        # État global
        overall_status = 'healthy'
        if any(c['status'] == 'critical' for c in components.values()):
            overall_status = 'critical'
        elif any(c['status'] == 'warning' for c in components.values()):
            overall_status = 'warning'
        elif any(c['status'] == 'down' for c in components.values()):
            overall_status = 'down'
        
        return {
            'overall_status': overall_status,
            'components': components,
            'timestamp': timezone.now()
        }
    
    @staticmethod
    def check_database() -> Dict[str, Any]:
        """Vérifie l'état de la base de données."""
        try:
            start_time = timezone.now()
            
            # Test de connexion simple
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
            
            response_time = (timezone.now() - start_time).total_seconds() * 1000
            
            # Vérifier l'espace disponible
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        pg_size_pretty(pg_database_size(current_database())) as size,
                        pg_database_size(current_database()) as size_bytes
                """)
                db_size = cursor.fetchone()
            
            # Statistiques de performance
            slow_queries = connection.queries_logged if hasattr(connection, 'queries_logged') else 0
            
            status = 'healthy'
            if response_time > 1000:  # > 1 seconde
                status = 'warning'
            elif response_time > 5000:  # > 5 secondes
                status = 'critical'
            
            return {
                'status': status,
                'response_time': response_time,
                'message': f'Base de données opérationnelle - {db_size[0]}',
                'details': {
                    'size': db_size[0],
                    'size_bytes': db_size[1],
                    'slow_queries': slow_queries,
                    'connections': len(connection.queries) if hasattr(connection, 'queries') else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Erreur vérification base de données: {str(e)}")
            return {
                'status': 'down',
                'message': f'Erreur base de données: {str(e)}',
                'details': {'error': str(e)}
            }
    
    @staticmethod
    def check_cache() -> Dict[str, Any]:
        """Vérifie l'état du cache Redis."""
        try:
            start_time = timezone.now()
            
            # Test simple du cache
            test_key = 'health_check_test'
            cache.set(test_key, 'test_value', 10)
            retrieved_value = cache.get(test_key)
            cache.delete(test_key)
            
            response_time = (timezone.now() - start_time).total_seconds() * 1000
            
            if retrieved_value != 'test_value':
                raise Exception("Cache test failed")
            
            status = 'healthy'
            if response_time > 100:  # > 100ms
                status = 'warning'
            elif response_time > 500:  # > 500ms
                status = 'critical'
            
            return {
                'status': status,
                'response_time': response_time,
                'message': 'Cache Redis opérationnel',
                'details': {
                    'response_time_ms': response_time
                }
            }
            
        except Exception as e:
            logger.error(f"Erreur vérification cache: {str(e)}")
            return {
                'status': 'down',
                'message': f'Erreur cache: {str(e)}',
                'details': {'error': str(e)}
            }
    
    @staticmethod
    def check_celery() -> Dict[str, Any]:
        """Vérifie l'état des workers Celery."""
        try:
            inspect = celery_app.control.inspect()
            
            # Vérifier les workers actifs
            active_workers = inspect.active()
            registered_tasks = inspect.registered()
            
            if not active_workers:
                return {
                    'status': 'down',
                    'message': 'Aucun worker Celery actif',
                    'details': {'active_workers': 0}
                }
            
            worker_count = len(active_workers)
            total_tasks = sum(len(tasks) for tasks in active_workers.values())
            
            status = 'healthy'
            if worker_count < 2:  # Moins de 2 workers
                status = 'warning'
            
            return {
                'status': status,
                'message': f'{worker_count} workers Celery actifs',
                'details': {
                    'active_workers': worker_count,
                    'active_tasks': total_tasks,
                    'workers': list(active_workers.keys())
                }
            }
            
        except Exception as e:
            logger.error(f"Erreur vérification Celery: {str(e)}")
            return {
                'status': 'down',
                'message': f'Erreur Celery: {str(e)}',
                'details': {'error': str(e)}
            }
    
    @staticmethod
    def check_storage() -> Dict[str, Any]:
        """Vérifie l'état du stockage."""
        try:
            # Vérifier l'espace disque
            disk_usage = psutil.disk_usage(settings.BASE_DIR)
            
            free_percent = (disk_usage.free / disk_usage.total) * 100
            used_percent = 100 - free_percent
            
            status = 'healthy'
            if used_percent > 80:
                status = 'warning'
            elif used_percent > 95:
                status = 'critical'
            
            return {
                'status': status,
                'disk_usage': used_percent,
                'message': f'Stockage utilisé à {used_percent:.1f}%',
                'details': {
                    'total_gb': disk_usage.total / (1024**3),
                    'free_gb': disk_usage.free / (1024**3),
                    'used_gb': disk_usage.used / (1024**3),
                    'used_percent': used_percent
                }
            }
            
        except Exception as e:
            logger.error(f"Erreur vérification stockage: {str(e)}")
            return {
                'status': 'down',
                'message': f'Erreur stockage: {str(e)}',
                'details': {'error': str(e)}
            }
    
    @staticmethod
    def check_external_apis() -> Dict[str, Any]:
        """Vérifie l'état des APIs externes."""
        try:
            # Test simple de connectivité internet
            import requests
            
            start_time = timezone.now()
            response = requests.get('https://httpbin.org/status/200', timeout=5)
            response_time = (timezone.now() - start_time).total_seconds() * 1000
            
            status = 'healthy'
            if response_time > 2000:  # > 2 secondes
                status = 'warning'
            elif response.status_code != 200:
                status = 'critical'
            
            return {
                'status': status,
                'response_time': response_time,
                'message': 'Connectivité API externe OK',
                'details': {
                    'response_time_ms': response_time,
                    'status_code': response.status_code
                }
            }
            
        except Exception as e:
            logger.error(f"Erreur vérification APIs externes: {str(e)}")
            return {
                'status': 'warning',  # Warning car non critique
                'message': f'Connectivité externe limitée: {str(e)}',
                'details': {'error': str(e)}
            }


class MetricsService:
    """Service pour la collecte de métriques."""
    
    @staticmethod
    def collect_system_metrics():
        """Collecte les métriques système."""
        try:
            # Métriques CPU et mémoire
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            
            SystemMetrics.objects.create(
                name='system_cpu_usage',
                type_metric='performance',
                value=cpu_percent,
                unit='%'
            )
            
            SystemMetrics.objects.create(
                name='system_memory_usage',
                type_metric='performance',
                value=memory.percent,
                unit='%',
                metadata={
                    'total_gb': memory.total / (1024**3),
                    'available_gb': memory.available / (1024**3)
                }
            )
            
        except Exception as e:
            logger.error(f"Erreur collecte métriques système: {str(e)}")
    
    @staticmethod
    def collect_business_metrics():
        """Collecte les métriques métiers."""
        try:
            # Nombre d'utilisateurs actifs
            active_users = SessionUtilisateur.objects.filter(
                active=True,
                date_derniere_activite__gte=timezone.now() - timedelta(hours=1)
            ).count()
            
            SystemMetrics.objects.create(
                name='active_users_1h',
                type_metric='usage',
                value=active_users,
                unit='count'
            )
            
            # Nombre total de sociétés
            total_companies = Societe.objects.filter(active=True).count()
            
            SystemMetrics.objects.create(
                name='total_active_companies',
                type_metric='business',
                value=total_companies,
                unit='count'
            )
            
            # Nombre de connexions par jour
            today_logins = UserActivity.objects.filter(
                action='login',
                timestamp__date=timezone.now().date()
            ).count()
            
            SystemMetrics.objects.create(
                name='daily_logins',
                type_metric='usage',
                value=today_logins,
                unit='count'
            )
            
        except Exception as e:
            logger.error(f"Erreur collecte métriques métiers: {str(e)}")
    
    @staticmethod
    def get_metrics_summary(days: int = 7) -> Dict[str, Any]:
        """Récupère un résumé des métriques."""
        try:
            start_date = timezone.now() - timedelta(days=days)
            
            metrics = SystemMetrics.objects.filter(
                timestamp__gte=start_date
            ).values('name', 'type_metric').annotate(
                avg_value=Avg('value'),
                max_value=Max('value'),
                count=Count('id'),
                latest=Max('timestamp')
            )
            
            summary = {}
            for metric in metrics:
                summary[metric['name']] = {
                    'avg': round(metric['avg_value'], 2),
                    'max': round(metric['max_value'], 2),
                    'samples': metric['count'],
                    'latest': metric['latest'],
                    'type': metric['type_metric']
                }
            
            return summary
            
        except Exception as e:
            logger.error(f"Erreur résumé métriques: {str(e)}")
            return {}


class MaintenanceService:
    """Service pour la gestion des tâches de maintenance."""
    
    @staticmethod
    def schedule_backup(
        backup_type: str = 'full',
        scheduled_for: datetime = None,
        assigned_to: Utilisateur = None
    ) -> MaintenanceTask:
        """Planifie une sauvegarde."""
        if not scheduled_for:
            scheduled_for = timezone.now() + timedelta(minutes=5)
        
        task = MaintenanceTask.objects.create(
            nom=f"Sauvegarde {backup_type} - {scheduled_for.strftime('%Y-%m-%d %H:%M')}",
            description=f"Sauvegarde {backup_type} de la base de données",
            type_task='backup',
            priority='high' if backup_type == 'full' else 'medium',
            scheduled_for=scheduled_for,
            estimated_duration=timedelta(minutes=30 if backup_type == 'full' else 10),
            assigned_to=assigned_to,
            parameters={
                'backup_type': backup_type,
                'compress': True,
                'cleanup_old': True
            }
        )
        
        return task
    
    @staticmethod
    def execute_maintenance_task(task_id: int) -> bool:
        """Exécute une tâche de maintenance."""
        try:
            task = MaintenanceTask.objects.get(id=task_id)
            
            if task.status != 'scheduled':
                return False
            
            # Marquer comme en cours
            task.status = 'running'
            task.started_at = timezone.now()
            task.save()
            
            success = False
            error_message = ""
            
            try:
                if task.type_task == 'backup':
                    success = MaintenanceService._execute_backup(task)
                elif task.type_task == 'cleanup':
                    success = MaintenanceService._execute_cleanup(task)
                elif task.type_task == 'optimization':
                    success = MaintenanceService._execute_optimization(task)
                else:
                    success = MaintenanceService._execute_custom_task(task)
            
            except Exception as e:
                error_message = str(e)
                logger.error(f"Erreur exécution tâche {task_id}: {error_message}")
            
            # Marquer comme terminée
            task.completed_at = timezone.now()
            if success:
                task.status = 'completed'
                task.success_message = "Tâche exécutée avec succès"
            else:
                task.status = 'failed'
                task.error_message = error_message or "Échec de l'exécution"
            
            task.save()
            
            return success
            
        except MaintenanceTask.DoesNotExist:
            logger.error(f"Tâche de maintenance {task_id} non trouvée")
            return False
        except Exception as e:
            logger.error(f"Erreur exécution maintenance: {str(e)}")
            return False
    
    @staticmethod
    def _execute_backup(task: MaintenanceTask) -> bool:
        """Exécute une sauvegarde."""
        try:
            backup_type = task.parameters.get('backup_type', 'full')
            compress = task.parameters.get('compress', True)
            
            # Générer le nom du fichier
            timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
            filename = f"wisebook_backup_{backup_type}_{timestamp}.sql"
            if compress:
                filename += ".gz"
            
            backup_dir = getattr(settings, 'BACKUP_DIR', '/tmp/backups')
            os.makedirs(backup_dir, exist_ok=True)
            filepath = os.path.join(backup_dir, filename)
            
            # Commande pg_dump
            db_config = settings.DATABASES['default']
            cmd = [
                'pg_dump',
                f"--host={db_config['HOST']}",
                f"--port={db_config['PORT']}",
                f"--username={db_config['USER']}",
                f"--dbname={db_config['NAME']}",
                '--verbose',
                '--no-password'
            ]
            
            if compress:
                cmd.append('--compress=9')
            
            # Variables d'environnement
            env = os.environ.copy()
            env['PGPASSWORD'] = db_config['PASSWORD']
            
            # Exécuter la commande
            with open(filepath, 'w') as f:
                result = subprocess.run(
                    cmd,
                    stdout=f,
                    stderr=subprocess.PIPE,
                    env=env,
                    timeout=3600  # 1 heure max
                )
            
            if result.returncode == 0:
                # Créer l'enregistrement de backup
                file_size = os.path.getsize(filepath)
                
                DatabaseBackup.objects.create(
                    nom=f"Backup {backup_type} - {timestamp}",
                    type_backup=backup_type,
                    status='completed',
                    file_path=filepath,
                    file_size=file_size,
                    compressed=compress,
                    started_at=task.started_at,
                    completed_at=timezone.now(),
                    success=True
                )
                
                task.logs = f"Sauvegarde créée: {filepath} ({file_size} bytes)"
                return True
            else:
                task.logs = result.stderr.decode()
                return False
                
        except Exception as e:
            logger.error(f"Erreur sauvegarde: {str(e)}")
            return False
    
    @staticmethod
    def _execute_cleanup(task: MaintenanceTask) -> bool:
        """Exécute un nettoyage."""
        try:
            cleanup_type = task.parameters.get('cleanup_type', 'logs')
            days_to_keep = task.parameters.get('days_to_keep', 30)
            
            cleanup_date = timezone.now() - timedelta(days=days_to_keep)
            deleted_count = 0
            
            if cleanup_type == 'logs':
                # Nettoyer les logs d'activité
                deleted_count = UserActivity.objects.filter(
                    timestamp__lt=cleanup_date
                ).delete()[0]
                
            elif cleanup_type == 'metrics':
                # Nettoyer les anciennes métriques
                deleted_count = SystemMetrics.objects.filter(
                    timestamp__lt=cleanup_date
                ).delete()[0]
                
            elif cleanup_type == 'health':
                # Nettoyer les anciens checks de santé
                deleted_count = SystemHealth.objects.filter(
                    timestamp__lt=cleanup_date
                ).delete()[0]
            
            task.logs = f"Nettoyage terminé: {deleted_count} enregistrements supprimés"
            return True
            
        except Exception as e:
            logger.error(f"Erreur nettoyage: {str(e)}")
            return False
    
    @staticmethod
    def _execute_optimization(task: MaintenanceTask) -> bool:
        """Exécute une optimisation."""
        try:
            optimization_type = task.parameters.get('optimization_type', 'database')
            
            if optimization_type == 'database':
                # VACUUM et ANALYZE sur PostgreSQL
                with connection.cursor() as cursor:
                    cursor.execute("VACUUM ANALYZE;")
                
                task.logs = "Optimisation base de données terminée (VACUUM ANALYZE)"
                return True
                
            elif optimization_type == 'cache':
                # Nettoyer le cache
                cache.clear()
                task.logs = "Cache nettoyé"
                return True
            
            return True
            
        except Exception as e:
            logger.error(f"Erreur optimisation: {str(e)}")
            return False
    
    @staticmethod
    def _execute_custom_task(task: MaintenanceTask) -> bool:
        """Exécute une tâche personnalisée."""
        try:
            script_path = task.script_path
            if not script_path:
                return False
            
            # Exécuter le script personnalisé
            result = subprocess.run(
                ['python', script_path],
                capture_output=True,
                text=True,
                timeout=3600
            )
            
            task.logs = result.stdout
            if result.stderr:
                task.logs += f"\nErreurs:\n{result.stderr}"
            
            return result.returncode == 0
            
        except Exception as e:
            logger.error(f"Erreur tâche personnalisée: {str(e)}")
            return False


class AlertService:
    """Service pour la gestion des alertes."""
    
    @staticmethod
    def create_alert(
        title: str,
        description: str,
        severity: str,
        component: str,
        societe: Societe = None,
        user: Utilisateur = None,
        metadata: Dict = None
    ) -> SystemAlert:
        """Crée une nouvelle alerte."""
        alert = SystemAlert.objects.create(
            titre=title,
            description=description,
            severity=severity,
            component=component,
            societe=societe,
            utilisateur=user,
            metadata=metadata or {}
        )
        
        # Si critique, notifier immédiatement
        if severity == 'critical':
            AlertService.notify_critical_alert(alert)
        
        return alert
    
    @staticmethod
    def notify_critical_alert(alert: SystemAlert):
        """Notifie une alerte critique."""
        try:
            # Ici, on pourrait envoyer des emails, SMS, webhooks, etc.
            logger.critical(f"ALERTE CRITIQUE: {alert.titre} - {alert.description}")
            
            # Exemple d'envoi d'email
            from django.core.mail import send_mail
            
            send_mail(
                subject=f"[CRITIQUE] WiseBook Alert: {alert.titre}",
                message=f"""
                Une alerte critique a été détectée sur WiseBook:
                
                Titre: {alert.titre}
                Composant: {alert.component}
                Description: {alert.description}
                
                Heure: {alert.created_at}
                
                Veuillez intervenir immédiatement.
                """,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=settings.ADMIN_EMAILS,
                fail_silently=True
            )
            
        except Exception as e:
            logger.error(f"Erreur notification alerte critique: {str(e)}")
    
    @staticmethod
    def acknowledge_alert(alert_id: int, user: Utilisateur) -> bool:
        """Accuse réception d'une alerte."""
        try:
            alert = SystemAlert.objects.get(id=alert_id)
            
            if alert.status == 'new':
                alert.status = 'acknowledged'
                alert.acknowledged_at = timezone.now()
                alert.acknowledged_by = user
                alert.save()
                
                return True
            
            return False
            
        except SystemAlert.DoesNotExist:
            return False
    
    @staticmethod
    def resolve_alert(alert_id: int, user: Utilisateur, notes: str = "") -> bool:
        """Résout une alerte."""
        try:
            alert = SystemAlert.objects.get(id=alert_id)
            
            alert.status = 'resolved'
            alert.resolved_at = timezone.now()
            alert.resolved_by = user
            alert.resolution_notes = notes
            alert.save()
            
            return True
            
        except SystemAlert.DoesNotExist:
            return False