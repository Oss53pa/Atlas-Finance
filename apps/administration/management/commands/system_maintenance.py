from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.administration.services import MaintenanceService
from apps.administration.models import MaintenanceTask


class Command(BaseCommand):
    help = 'Gestion des tâches de maintenance système'
    
    def add_arguments(self, parser):
        parser.add_argument(
            'action',
            choices=['list', 'run', 'schedule', 'cleanup'],
            help='Action à effectuer'
        )
        
        parser.add_argument(
            '--task-id',
            type=int,
            help='ID de la tâche (pour run)'
        )
        
        parser.add_argument(
            '--task-type',
            choices=['backup', 'cleanup', 'optimization'],
            help='Type de tâche (pour schedule)'
        )
        
        parser.add_argument(
            '--schedule-in',
            type=int,
            default=5,
            help='Planifier dans X minutes (défaut: 5)'
        )
        
        parser.add_argument(
            '--backup-type',
            choices=['full', 'incremental'],
            default='full',
            help='Type de sauvegarde (défaut: full)'
        )
        
        parser.add_argument(
            '--cleanup-type',
            choices=['logs', 'metrics', 'health'],
            default='logs',
            help='Type de nettoyage (défaut: logs)'
        )
        
        parser.add_argument(
            '--days-to-keep',
            type=int,
            default=30,
            help='Jours à conserver pour le nettoyage (défaut: 30)'
        )
        
        parser.add_argument(
            '--force',
            action='store_true',
            help='Forcer l\'exécution même si la tâche n\'est pas planifiée'
        )
    
    def handle(self, *args, **options):
        action = options['action']
        
        if action == 'list':
            self.list_tasks()
        elif action == 'run':
            self.run_task(options)
        elif action == 'schedule':
            self.schedule_task(options)
        elif action == 'cleanup':
            self.cleanup_tasks(options)
    
    def list_tasks(self):
        """Liste les tâches de maintenance."""
        self.stdout.write(self.style.SUCCESS('=== Tâches de Maintenance ===\n'))
        
        # Tâches en attente
        pending_tasks = MaintenanceTask.objects.filter(
            status='scheduled',
            scheduled_for__gte=timezone.now() - timedelta(hours=1)
        ).order_by('scheduled_for')
        
        if pending_tasks:
            self.stdout.write(self.style.WARNING('Tâches planifiées:'))
            for task in pending_tasks:
                scheduled_str = task.scheduled_for.strftime('%Y-%m-%d %H:%M')
                priority_icon = {
                    'low': '○',
                    'medium': '●',
                    'high': '◉',
                    'critical': '🔥'
                }.get(task.priority, '●')
                
                self.stdout.write(
                    f"  {priority_icon} [{task.id}] {task.nom} ({scheduled_str})"
                )
            self.stdout.write("")
        
        # Tâches en cours
        running_tasks = MaintenanceTask.objects.filter(status='running')
        
        if running_tasks:
            self.stdout.write(self.style.WARNING('Tâches en cours:'))
            for task in running_tasks:
                started_str = task.started_at.strftime('%Y-%m-%d %H:%M') if task.started_at else 'N/A'
                self.stdout.write(
                    f"  🔄 [{task.id}] {task.nom} (depuis {started_str})"
                )
            self.stdout.write("")
        
        # Tâches récentes
        recent_tasks = MaintenanceTask.objects.filter(
            status__in=['completed', 'failed'],
            completed_at__gte=timezone.now() - timedelta(days=7)
        ).order_by('-completed_at')[:10]
        
        if recent_tasks:
            self.stdout.write('Tâches récentes (7 derniers jours):')
            for task in recent_tasks:
                status_icon = '✓' if task.status == 'completed' else '✗'
                completed_str = task.completed_at.strftime('%Y-%m-%d %H:%M') if task.completed_at else 'N/A'
                duration = task.get_duration()
                duration_str = str(duration).split('.')[0] if duration else 'N/A'
                
                style = self.style.SUCCESS if task.status == 'completed' else self.style.ERROR
                self.stdout.write(
                    style(f"  {status_icon} [{task.id}] {task.nom} ({completed_str}, durée: {duration_str})")
                )
        
        if not pending_tasks and not running_tasks and not recent_tasks:
            self.stdout.write("Aucune tâche de maintenance trouvée.")
    
    def run_task(self, options):
        """Exécute une tâche de maintenance."""
        task_id = options.get('task_id')
        force = options.get('force', False)
        
        if not task_id:
            self.stdout.write(
                self.style.ERROR('--task-id requis pour l\'action run')
            )
            return
        
        try:
            task = MaintenanceTask.objects.get(id=task_id)
        except MaintenanceTask.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Tâche {task_id} non trouvée')
            )
            return
        
        # Vérifier si la tâche peut être exécutée
        if task.status != 'scheduled' and not force:
            self.stdout.write(
                self.style.ERROR(f'Tâche {task_id} n\'est pas planifiée (statut: {task.status})')
            )
            self.stdout.write('Utilisez --force pour forcer l\'exécution')
            return
        
        if task.scheduled_for > timezone.now() and not force:
            scheduled_str = task.scheduled_for.strftime('%Y-%m-%d %H:%M')
            self.stdout.write(
                self.style.ERROR(f'Tâche {task_id} planifiée pour {scheduled_str}')
            )
            self.stdout.write('Utilisez --force pour forcer l\'exécution')
            return
        
        # Exécuter la tâche
        self.stdout.write(f'Exécution de la tâche: {task.nom}')
        self.stdout.write(f'Type: {task.get_type_task_display()}')
        self.stdout.write(f'Priorité: {task.get_priority_display()}')
        
        if task.estimated_duration:
            self.stdout.write(f'Durée estimée: {task.estimated_duration}')
        
        self.stdout.write('')
        
        success = MaintenanceService.execute_maintenance_task(task_id)
        
        # Recharger la tâche pour voir les résultats
        task.refresh_from_db()
        
        if success:
            self.stdout.write(
                self.style.SUCCESS(f'✓ Tâche {task_id} terminée avec succès')
            )
            if task.success_message:
                self.stdout.write(f'Message: {task.success_message}')
        else:
            self.stdout.write(
                self.style.ERROR(f'✗ Tâche {task_id} échouée')
            )
            if task.error_message:
                self.stdout.write(f'Erreur: {task.error_message}')
        
        if task.logs:
            self.stdout.write('\nLogs:')
            self.stdout.write(task.logs)
        
        # Afficher la durée
        duration = task.get_duration()
        if duration:
            duration_str = str(duration).split('.')[0]
            self.stdout.write(f'Durée d\'exécution: {duration_str}')
    
    def schedule_task(self, options):
        """Planifie une nouvelle tâche de maintenance."""
        task_type = options.get('task_type')
        schedule_in = options.get('schedule_in', 5)
        
        if not task_type:
            self.stdout.write(
                self.style.ERROR('--task-type requis pour l\'action schedule')
            )
            return
        
        scheduled_for = timezone.now() + timedelta(minutes=schedule_in)
        
        if task_type == 'backup':
            backup_type = options.get('backup_type', 'full')
            task = MaintenanceService.schedule_backup(
                backup_type=backup_type,
                scheduled_for=scheduled_for
            )
            
            self.stdout.write(
                self.style.SUCCESS(f'✓ Sauvegarde {backup_type} planifiée')
            )
        
        elif task_type == 'cleanup':
            cleanup_type = options.get('cleanup_type', 'logs')
            days_to_keep = options.get('days_to_keep', 30)
            
            task = MaintenanceTask.objects.create(
                nom=f"Nettoyage {cleanup_type} - {scheduled_for.strftime('%Y-%m-%d %H:%M')}",
                description=f"Nettoyage des {cleanup_type} (conserver {days_to_keep} jours)",
                type_task='cleanup',
                priority='medium',
                scheduled_for=scheduled_for,
                estimated_duration=timedelta(minutes=15),
                parameters={
                    'cleanup_type': cleanup_type,
                    'days_to_keep': days_to_keep
                }
            )
            
            self.stdout.write(
                self.style.SUCCESS(f'✓ Nettoyage {cleanup_type} planifié')
            )
        
        elif task_type == 'optimization':
            task = MaintenanceTask.objects.create(
                nom=f"Optimisation système - {scheduled_for.strftime('%Y-%m-%d %H:%M')}",
                description="Optimisation de la base de données et du cache",
                type_task='optimization',
                priority='low',
                scheduled_for=scheduled_for,
                estimated_duration=timedelta(minutes=20),
                parameters={
                    'optimization_type': 'database'
                }
            )
            
            self.stdout.write(
                self.style.SUCCESS('✓ Optimisation système planifiée')
            )
        
        self.stdout.write(f'ID de la tâche: {task.id}')
        scheduled_str = scheduled_for.strftime('%Y-%m-%d %H:%M')
        self.stdout.write(f'Planifiée pour: {scheduled_str}')
        
        if task.estimated_duration:
            self.stdout.write(f'Durée estimée: {task.estimated_duration}')
    
    def cleanup_tasks(self, options):
        """Nettoie les anciennes tâches de maintenance."""
        days_to_keep = options.get('days_to_keep', 30)
        cleanup_date = timezone.now() - timedelta(days=days_to_keep)
        
        # Nettoyer les tâches terminées anciennes
        old_tasks = MaintenanceTask.objects.filter(
            status__in=['completed', 'failed', 'cancelled'],
            completed_at__lt=cleanup_date
        )
        
        count = old_tasks.count()
        if count > 0:
            old_tasks.delete()
            self.stdout.write(
                self.style.SUCCESS(f'✓ {count} anciennes tâches supprimées')
            )
        else:
            self.stdout.write('Aucune ancienne tâche à nettoyer')
        
        # Nettoyer les tâches planifiées expirées
        expired_tasks = MaintenanceTask.objects.filter(
            status='scheduled',
            scheduled_for__lt=timezone.now() - timedelta(days=1)
        )
        
        expired_count = expired_tasks.count()
        if expired_count > 0:
            expired_tasks.update(
                status='cancelled',
                error_message='Tâche expirée - annulée automatiquement'
            )
            self.stdout.write(
                self.style.WARNING(f'⚠ {expired_count} tâches expirées annulées')
            )
        else:
            self.stdout.write('Aucune tâche expirée trouvée')