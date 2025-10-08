from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.administration.services import SystemHealthService, MetricsService


class Command(BaseCommand):
    help = 'Effectue une vérification complète de la santé du système'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--component',
            type=str,
            help='Vérifier un composant spécifique (database, cache, celery, storage, api_external)'
        )
        parser.add_argument(
            '--collect-metrics',
            action='store_true',
            help='Collecter également les métriques système'
        )
        parser.add_argument(
            '--alert-on-failure',
            action='store_true',
            help='Créer des alertes en cas de problème'
        )
    
    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('=== WiseBook System Health Check ===')
        )
        self.stdout.write(f"Heure: {timezone.now()}\n")
        
        try:
            if options['component']:
                # Vérifier un composant spécifique
                component = options['component']
                self.stdout.write(f"Vérification du composant: {component}")
                
                if hasattr(SystemHealthService, f'check_{component}'):
                    method = getattr(SystemHealthService, f'check_{component}')
                    result = method()
                    self.display_component_result(component, result)
                else:
                    self.stdout.write(
                        self.style.ERROR(f"Composant inconnu: {component}")
                    )
                    return
            else:
                # Vérification complète
                self.stdout.write("Vérification de tous les composants...")
                results = SystemHealthService.check_all_components()
                
                self.stdout.write(
                    f"\n--- État global: {results['overall_status'].upper()} ---"
                )
                
                for component, result in results['components'].items():
                    self.display_component_result(component, result)
                
                # Créer des alertes si nécessaire
                if options['alert_on_failure']:
                    self.create_alerts_if_needed(results['components'])
            
            # Collecter les métriques si demandé
            if options['collect_metrics']:
                self.stdout.write("\nCollecte des métriques...")
                MetricsService.collect_system_metrics()
                MetricsService.collect_business_metrics()
                self.stdout.write(
                    self.style.SUCCESS("✓ Métriques collectées")
                )
            
            self.stdout.write(
                self.style.SUCCESS("\n=== Vérification terminée ===")
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Erreur lors de la vérification: {str(e)}")
            )
            raise
    
    def display_component_result(self, component, result):
        """Affiche le résultat d'un composant."""
        status = result['status']
        
        # Couleur selon le statut
        if status == 'healthy':
            style = self.style.SUCCESS
            icon = "✓"
        elif status == 'warning':
            style = self.style.WARNING
            icon = "⚠"
        elif status == 'critical':
            style = self.style.ERROR
            icon = "✗"
        else:  # down
            style = self.style.ERROR
            icon = "●"
        
        # Affichage principal
        self.stdout.write(
            style(f"{icon} {component.upper()}: {status.upper()}")
        )
        
        # Message
        if result.get('message'):
            self.stdout.write(f"   Message: {result['message']}")
        
        # Temps de réponse
        if result.get('response_time'):
            response_time = result['response_time']
            time_str = f"{response_time:.1f}ms"
            if response_time > 1000:
                time_str = self.style.WARNING(time_str)
            elif response_time > 5000:
                time_str = self.style.ERROR(time_str)
            
            self.stdout.write(f"   Temps de réponse: {time_str}")
        
        # Utilisation CPU/Mémoire/Disque
        for metric in ['cpu_usage', 'memory_usage', 'disk_usage']:
            if result.get(metric):
                value = result[metric]
                value_str = f"{value:.1f}%"
                if value > 80:
                    value_str = self.style.WARNING(value_str)
                elif value > 95:
                    value_str = self.style.ERROR(value_str)
                
                self.stdout.write(f"   {metric.replace('_', ' ').title()}: {value_str}")
        
        # Détails additionnels
        details = result.get('details', {})
        if details:
            for key, value in details.items():
                if key not in ['error']:  # Ne pas afficher les erreurs ici
                    self.stdout.write(f"   {key}: {value}")
        
        self.stdout.write("")  # Ligne vide
    
    def create_alerts_if_needed(self, components):
        """Crée des alertes pour les composants en échec."""
        from apps.administration.services import AlertService
        
        for component, result in components.items():
            status = result['status']
            
            if status in ['critical', 'down']:
                AlertService.create_alert(
                    title=f"Composant {component} en échec",
                    description=result.get('message', f"Le composant {component} est {status}"),
                    severity='critical' if status == 'down' else 'error',
                    component=component,
                    metadata={
                        'health_check': True,
                        'details': result.get('details', {})
                    }
                )
                
                self.stdout.write(
                    self.style.SUCCESS(f"→ Alerte créée pour {component}")
                )
            
            elif status == 'warning':
                AlertService.create_alert(
                    title=f"Composant {component} dégradé",
                    description=result.get('message', f"Le composant {component} montre des signes de dégradation"),
                    severity='warning',
                    component=component,
                    metadata={
                        'health_check': True,
                        'details': result.get('details', {})
                    }
                )
                
                self.stdout.write(
                    self.style.WARNING(f"→ Alerte créée pour {component}")
                )