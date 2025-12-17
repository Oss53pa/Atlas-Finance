"""
Constants for Celery tasks in WiseBook.

This module contains all constants used by Celery tasks to avoid hardcoding
strings and numbers throughout the codebase.
"""

# =============================================================================
# TASK TIMEOUTS (in seconds)
# =============================================================================

TIMEOUT_VERY_SHORT = 30  # 30 seconds - Quick tasks
TIMEOUT_SHORT = 60  # 1 minute - Fast operations
TIMEOUT_MEDIUM = 300  # 5 minutes - Standard tasks
TIMEOUT_LONG = 1800  # 30 minutes - Complex operations
TIMEOUT_VERY_LONG = 3600  # 1 hour - Heavy processing

# =============================================================================
# RETRY SETTINGS
# =============================================================================

MAX_RETRIES_DEFAULT = 3  # Default max retries for tasks
MAX_RETRIES_CRITICAL = 5  # Max retries for critical tasks
MAX_RETRIES_NONE = 0  # No retries

RETRY_BACKOFF_SHORT = 60  # 1 minute
RETRY_BACKOFF_MEDIUM = 300  # 5 minutes
RETRY_BACKOFF_LONG = 900  # 15 minutes

RETRY_BACKOFF_MAX = 600  # 10 minutes max backoff

# =============================================================================
# TASK NAMES - CORE TASKS
# =============================================================================

TASK_TEST_CELERY = 'apps.core.tasks.test_celery'
TASK_ADD_NUMBERS = 'apps.core.tasks.add_numbers'
TASK_CLEANUP_CACHE = 'apps.core.tasks.cleanup_cache'
TASK_DAILY_BACKUP = 'apps.core.tasks.create_daily_backup'
TASK_SEND_NOTIFICATION = 'apps.core.tasks.send_notification'
TASK_LONG_RUNNING = 'apps.core.tasks.long_running_task'

# =============================================================================
# TASK NAMES - INTEGRATION TASKS
# =============================================================================

TASK_SYNC_BANK_ACCOUNTS = 'apps.integrations.tasks.synchronize_all_bank_accounts'
TASK_PROCESS_WEBHOOKS = 'apps.integrations.tasks.process_webhooks'
TASK_CHECK_FISCAL_DEADLINES = 'apps.integrations.tasks.check_fiscal_deadlines'
TASK_REFRESH_EXCHANGE_RATES = 'apps.integrations.tasks.refresh_exchange_rates'
TASK_CLEANUP_OLD_DATA = 'apps.integrations.tasks.cleanup_old_data'
TASK_GENERATE_REPORTS = 'apps.integrations.tasks.generate_periodic_reports'
TASK_ML_ANOMALY_DETECTION = 'apps.integrations.tasks.run_ml_anomaly_detection'

# =============================================================================
# TASK NAMES - TREASURY TASKS
# =============================================================================

TASK_CASH_FLOW_FORECAST = 'apps.treasury.tasks.update_cash_flow_forecast'

# =============================================================================
# TASK NAMES - ANALYTICS TASKS
# =============================================================================

TASK_WEEKLY_RATIOS = 'apps.analytics.tasks.calculate_weekly_ratios'

# =============================================================================
# TASK NAMES - CLOSING TASKS
# =============================================================================

TASK_CLOSING_REMINDERS = 'apps.closing.tasks.send_closing_reminders'

# =============================================================================
# TASK NAMES - THIRD PARTY TASKS
# =============================================================================

TASK_AGING_ANALYSIS = 'apps.third_party.tasks.update_aging_analysis'

# =============================================================================
# TASK PRIORITIES
# =============================================================================

PRIORITY_CRITICAL = 0  # Highest priority
PRIORITY_HIGH = 3
PRIORITY_NORMAL = 5  # Default
PRIORITY_LOW = 7
PRIORITY_VERY_LOW = 9  # Lowest priority

# =============================================================================
# NOTIFICATION TYPES
# =============================================================================

NOTIFICATION_TYPE_EMAIL = 'email'
NOTIFICATION_TYPE_SMS = 'sms'
NOTIFICATION_TYPE_PUSH = 'push'
NOTIFICATION_TYPE_WEBHOOK = 'webhook'

NOTIFICATION_TYPES = [
    NOTIFICATION_TYPE_EMAIL,
    NOTIFICATION_TYPE_SMS,
    NOTIFICATION_TYPE_PUSH,
    NOTIFICATION_TYPE_WEBHOOK,
]

# =============================================================================
# TASK STATUS
# =============================================================================

STATUS_SUCCESS = 'success'
STATUS_ERROR = 'error'
STATUS_PENDING = 'pending'
STATUS_PROCESSING = 'processing'
STATUS_COMPLETED = 'completed'
STATUS_FAILED = 'failed'

# =============================================================================
# CACHE KEYS
# =============================================================================

CACHE_KEY_PREFIX = 'wisebook'
CACHE_KEY_TASK_RESULT = f'{CACHE_KEY_PREFIX}:task:result'
CACHE_KEY_TASK_PROGRESS = f'{CACHE_KEY_PREFIX}:task:progress'
CACHE_KEY_CELERY_STATS = f'{CACHE_KEY_PREFIX}:celery:stats'

# =============================================================================
# SCHEDULE INTERVALS (in seconds)
# =============================================================================

INTERVAL_1_MINUTE = 60
INTERVAL_5_MINUTES = 300
INTERVAL_15_MINUTES = 900
INTERVAL_30_MINUTES = 1800
INTERVAL_1_HOUR = 3600
INTERVAL_6_HOURS = 21600
INTERVAL_12_HOURS = 43200
INTERVAL_24_HOURS = 86400

# =============================================================================
# ERROR MESSAGES
# =============================================================================

ERROR_TASK_TIMEOUT = 'Task exceeded time limit'
ERROR_TASK_FAILED = 'Task execution failed'
ERROR_INVALID_PARAMS = 'Invalid task parameters'
ERROR_RETRY_EXCEEDED = 'Maximum retry attempts exceeded'

# =============================================================================
# SUCCESS MESSAGES
# =============================================================================

SUCCESS_TASK_COMPLETED = 'Task completed successfully'
SUCCESS_TASK_SCHEDULED = 'Task scheduled for execution'
SUCCESS_TASK_RETRYING = 'Task retrying after error'
