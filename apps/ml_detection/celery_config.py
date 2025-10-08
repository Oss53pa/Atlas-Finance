"""
Configuration Celery Beat pour l'apprentissage automatique

Ce fichier définit les tâches périodiques à exécuter automatiquement
"""

from celery.schedules import crontab

# Configuration des tâches périodiques Celery Beat
CELERY_BEAT_SCHEDULE = {
    # Réentraînement automatique des modèles - Tous les jours à 2h du matin
    'auto-retrain-models': {
        'task': 'apps.ml_detection.tasks.auto_retrain_models',
        'schedule': crontab(hour=2, minute=0),
        'options': {
            'expires': 3600,  # Expire après 1h si pas exécuté
        }
    },

    # Détection de drift - Tous les jours à 3h du matin
    'detect-model-drift': {
        'task': 'apps.ml_detection.tasks.detect_model_drift',
        'schedule': crontab(hour=3, minute=0),
        'options': {
            'expires': 3600,
        }
    },

    # Calcul des statistiques - Toutes les heures
    'calculate-statistics': {
        'task': 'apps.ml_detection.tasks.calculate_model_statistics',
        'schedule': crontab(minute=0),  # Toutes les heures à minute 0
        'options': {
            'expires': 900,  # Expire après 15min
        }
    },

    # Réentraînement hebdomadaire (backup) - Tous les dimanches à 1h du matin
    'weekly-retrain': {
        'task': 'apps.ml_detection.tasks.auto_retrain_models',
        'schedule': crontab(day_of_week=0, hour=1, minute=0),  # 0 = Dimanche
        'options': {
            'expires': 7200,  # Expire après 2h
        }
    },
}


# Configuration des routes de tâches
CELERY_TASK_ROUTES = {
    'apps.ml_detection.tasks.train_model_task': {
        'queue': 'ml_training',
        'routing_key': 'ml.training'
    },
    'apps.ml_detection.tasks.auto_retrain_models': {
        'queue': 'ml_scheduler',
        'routing_key': 'ml.scheduler'
    },
    'apps.ml_detection.tasks.detect_model_drift': {
        'queue': 'ml_monitoring',
        'routing_key': 'ml.monitoring'
    },
    'apps.ml_detection.tasks.calculate_model_statistics': {
        'queue': 'ml_stats',
        'routing_key': 'ml.stats'
    },
}


# Limites de tâches concurrentes
CELERY_TASK_ANNOTATIONS = {
    'apps.ml_detection.tasks.train_model_task': {
        'rate_limit': '5/m',  # Max 5 entraînements par minute
        'time_limit': 7200,  # 2 heures max
        'soft_time_limit': 6600,  # Warning après 1h50
    },
    'apps.ml_detection.tasks.detect_model_drift': {
        'rate_limit': '10/m',
        'time_limit': 600,  # 10 minutes max
    },
}