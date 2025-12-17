"""
Celery configuration for WiseBook project.
"""
import os
from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wisebook.settings.development')

app = Celery('wisebook')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django app configs.
app.autodiscover_tasks()

# Configure periodic tasks
from celery.schedules import crontab

app.conf.beat_schedule = {
    # Integration tasks - high frequency
    'sync-bank-accounts': {
        'task': 'apps.integrations.tasks.synchronize_all_bank_accounts',
        'schedule': 300.0,  # Every 5 minutes
    },
    'process-webhooks': {
        'task': 'apps.integrations.tasks.process_webhooks',
        'schedule': 60.0,  # Every minute
    },
    
    # Hourly tasks
    'check-fiscal-deadlines': {
        'task': 'apps.integrations.tasks.check_fiscal_deadlines',
        'schedule': crontab(minute=0),  # Every hour
    },
    'refresh-exchange-rates': {
        'task': 'apps.integrations.tasks.refresh_exchange_rates',
        'schedule': crontab(minute=0),  # Every hour
    },
    
    # Daily tasks
    'cleanup-old-data': {
        'task': 'apps.integrations.tasks.cleanup_old_data',
        'schedule': crontab(hour=2, minute=0),  # 2:00 AM daily
    },
    'generate-periodic-reports': {
        'task': 'apps.integrations.tasks.generate_periodic_reports',
        'schedule': crontab(hour=1, minute=0),  # 1:00 AM daily
    },
    'daily-backup': {
        'task': 'apps.core.tasks.create_daily_backup',
        'schedule': crontab(hour=3, minute=0),  # 3:00 AM daily
    },
    'daily-cash-flow-forecast': {
        'task': 'apps.treasury.tasks.update_cash_flow_forecast',
        'schedule': crontab(hour=4, minute=0),  # 4:00 AM daily
    },
    
    # ML and analytics - every 12 hours
    'run-ml-anomaly-detection': {
        'task': 'apps.integrations.tasks.run_ml_anomaly_detection',
        'schedule': crontab(hour='*/12', minute=0),  # Every 12 hours
    },
    
    # Weekly tasks
    'weekly-ratio-calculation': {
        'task': 'apps.analytics.tasks.calculate_weekly_ratios',
        'schedule': crontab(hour=1, minute=0, day_of_week=1),  # Monday 1:00 AM
    },
    
    # Monthly tasks
    'monthly-closing-reminder': {
        'task': 'apps.closing.tasks.send_closing_reminders',
        'schedule': crontab(hour=9, minute=0, day=25),  # 25th of month 9:00 AM
    },
    'monthly-aging-analysis': {
        'task': 'apps.third_party.tasks.update_aging_analysis',
        'schedule': crontab(hour=10, minute=0, day=1),  # 1st of month 10:00 AM
    },

    # ==========================================
    # Paloma AI Tasks
    # ==========================================

    # Update chunk statistics for RAG relevance
    'paloma-update-chunk-stats': {
        'task': 'apps.advanced_bi.tasks.update_chunk_statistics',
        'schedule': crontab(hour=5, minute=0),  # Daily 5:00 AM
    },

    # Generate Paloma analytics - hourly for real-time insights
    'paloma-hourly-analytics': {
        'task': 'apps.advanced_bi.tasks.generate_paloma_analytics',
        'schedule': crontab(minute=30),  # Every hour at :30
        'args': (None, 'HOUR'),
    },

    # Generate daily Paloma analytics
    'paloma-daily-analytics': {
        'task': 'apps.advanced_bi.tasks.generate_paloma_analytics',
        'schedule': crontab(hour=0, minute=15),  # Midnight + 15 min
        'args': (None, 'DAY'),
    },

    # Cleanup old conversations - weekly
    'paloma-cleanup-conversations': {
        'task': 'apps.advanced_bi.tasks.cleanup_old_conversations',
        'schedule': crontab(hour=3, minute=30, day_of_week=0),  # Sunday 3:30 AM
        'kwargs': {'days_to_keep': 365},
    },

    # Reindex WiseBook codebase - weekly for Paloma knowledge
    'paloma-reindex-codebase': {
        'task': 'apps.advanced_bi.tasks.reindex_wisebook_codebase',
        'schedule': crontab(hour=4, minute=0, day_of_week=0),  # Sunday 4:00 AM
    },

    # ==========================================
    # Treasury monitoring tasks
    # ==========================================

    # Check overdraft limits - twice daily
    'treasury-overdraft-check': {
        'task': 'apps.treasury.tasks.monitor_overdraft_limits',
        'schedule': crontab(hour='9,17', minute=0),  # 9 AM and 5 PM
    },

    # Update FX exposure - daily
    'treasury-fx-exposure': {
        'task': 'apps.treasury.tasks.update_fx_exposure',
        'schedule': crontab(hour=8, minute=0),  # 8 AM daily
    },

    # Check payment deadlines - daily at 8:30 AM
    'treasury-payment-deadlines': {
        'task': 'apps.treasury.tasks.check_payment_deadlines',
        'schedule': crontab(hour=8, minute=30),
        'kwargs': {'days_ahead': 7},
    },
}

app.conf.timezone = 'Africa/Douala'

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')