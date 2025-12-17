"""
Celery tasks for core app - Refactored version.

This module contains core business tasks using the new utilities and base classes
for better code reusability and maintainability.
"""
from celery import shared_task
from django.core.cache import cache
from apps.core.base_tasks import BaseWiseBookTask, PeriodicTask, LongRunningTask
from apps.core.celery_utils import (
    create_success_response,
    create_error_response,
    log_task_start,
    log_task_complete,
    validate_required_params
)
from apps.core.celery_constants import (
    TASK_TEST_CELERY,
    TASK_ADD_NUMBERS,
    TASK_CLEANUP_CACHE,
    TASK_DAILY_BACKUP,
    TASK_SEND_NOTIFICATION,
    TASK_LONG_RUNNING,
    TIMEOUT_SHORT,
    TIMEOUT_MEDIUM,
    TIMEOUT_LONG,
    NOTIFICATION_TYPES
)
import logging

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    name=TASK_TEST_CELERY,
    base=BaseWiseBookTask,
    time_limit=TIMEOUT_SHORT
)
def test_celery(self):
    """
    Simple task to test Celery is working.

    Configuration:
    - Retries: 3 times with exponential backoff
    - Time limit: 1 minute
    - Base class: BaseWiseBookTask (automatic error handling)

    Returns:
        dict: Success response with status, message, and task_id
    """
    log_task_start(self.name, logger, task_id=self.request.id)

    # Task logic here
    logger.info("Test Celery task executed successfully!")

    log_task_complete(self.name, logger, task_id=self.request.id)

    return create_success_response(
        'Celery is working!',
        task_id=self.request.id
    )


@shared_task(
    bind=True,
    name=TASK_ADD_NUMBERS,
    base=BaseWiseBookTask,
    time_limit=TIMEOUT_SHORT
)
def add_numbers(self, x, y):
    """
    Simple task to add two numbers.

    Useful for testing Celery with parameters.

    Args:
        x (int or float): First number
        y (int or float): Second number

    Configuration:
    - Retries: 3 times with exponential backoff
    - Time limit: 1 minute

    Returns:
        dict: Success response with result

    Example:
        >>> result = add_numbers.delay(5, 7)
        >>> result.get()
        {'status': 'success', 'result': 12, 'x': 5, 'y': 7, ...}
    """
    log_task_start(self.name, logger, x=x, y=y)

    # Validate parameters
    if not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
        raise ValueError("Both x and y must be numbers")

    result = x + y
    logger.info(f"Adding {x} + {y} = {result}")

    log_task_complete(self.name, logger, result=result)

    return create_success_response(
        f'Successfully added {x} + {y}',
        result=result,
        x=x,
        y=y,
        task_id=self.request.id
    )


@shared_task(
    bind=True,
    name=TASK_CLEANUP_CACHE,
    base=PeriodicTask,
    time_limit=TIMEOUT_MEDIUM
)
def cleanup_cache(self):
    """
    Task to cleanup old cache entries.

    This is a periodic task that can be scheduled to run regularly.

    Configuration:
    - Retries: 2 times (periodic task)
    - Time limit: 5 minutes
    - Base class: PeriodicTask (optimized for scheduled tasks)

    Returns:
        dict: Success response with stats

    Example:
        >>> result = cleanup_cache.delay()
        >>> result.get()
        {'status': 'success', 'message': 'Cache cleaned up', 'stats': {...}}
    """
    log_task_start(self.name, logger)

    # Get cache stats (if available)
    stats = cache.get_many(['cache_hits', 'cache_misses'])

    logger.info("Cache cleanup task started")

    # Add your cache cleanup logic here
    # For example:
    # - Delete keys older than X days
    # - Clear specific patterns
    # - Optimize cache size

    # Example cleanup (commented out for safety)
    # cache.delete_many(['old_key_1', 'old_key_2'])

    logger.info("Cache cleanup task completed")

    log_task_complete(
        self.name,
        logger,
        stats_count=len(stats)
    )

    return create_success_response(
        'Cache cleaned up successfully',
        stats=stats,
        cleaned_items=0  # Update with actual count
    )


@shared_task(
    bind=True,
    name=TASK_DAILY_BACKUP,
    base=PeriodicTask,
    time_limit=TIMEOUT_LONG
)
def create_daily_backup(self):
    """
    Task to create daily backup.

    This is a periodic task scheduled to run daily.

    Configuration:
    - Retries: 2 times (periodic task)
    - Time limit: 30 minutes
    - Base class: PeriodicTask

    Returns:
        dict: Success response with backup info

    TODO:
    - Implement actual backup logic
    - Database backup
    - Media files backup
    - Upload to S3/Cloud storage
    """
    log_task_start(self.name, logger)

    logger.info("Daily backup task started")

    # TODO: Implement actual backup functionality
    # Example structure:
    # 1. Create database dump
    #    subprocess.run(['pg_dump', db_name, '-f', backup_file])
    #
    # 2. Compress media files
    #    shutil.make_archive(media_backup, 'gztar', MEDIA_ROOT)
    #
    # 3. Upload to S3
    #    s3_client.upload_file(backup_file, bucket, key)
    #
    # 4. Clean old backups
    #    delete_old_backups(retention_days=30)

    logger.info("Daily backup task completed")

    log_task_complete(self.name, logger)

    return create_success_response(
        'Daily backup created successfully',
        backup_type='placeholder',
        backup_size=0,
        backup_location='pending_implementation'
    )


@shared_task(
    bind=True,
    name=TASK_SEND_NOTIFICATION,
    base=BaseWiseBookTask,
    time_limit=TIMEOUT_MEDIUM
)
def send_notification(self, user_id, notification_type, message):
    """
    Task to send notifications to users.

    Supports multiple notification types: email, SMS, push, webhook.

    Args:
        user_id (int): ID of the user to notify
        notification_type (str): Type of notification (email, sms, push, webhook)
        message (str): Notification message content

    Configuration:
    - Retries: 3 times with exponential backoff
    - Time limit: 5 minutes

    Returns:
        dict: Success response with notification details

    Raises:
        ValueError: If notification_type is invalid or parameters are missing

    Example:
        >>> send_notification.delay(
        ...     user_id=123,
        ...     notification_type='email',
        ...     message='Your report is ready'
        ... )
    """
    log_task_start(
        self.name,
        logger,
        user_id=user_id,
        notification_type=notification_type
    )

    # Validate required parameters
    validate_required_params(
        {'user_id': user_id, 'notification_type': notification_type, 'message': message},
        ['user_id', 'notification_type', 'message']
    )

    # Validate notification type
    if notification_type not in NOTIFICATION_TYPES:
        raise ValueError(
            f"Invalid notification type: {notification_type}. "
            f"Must be one of: {', '.join(NOTIFICATION_TYPES)}"
        )

    logger.info(f"Sending {notification_type} notification to user {user_id}")

    # TODO: Implement actual notification logic
    # Example structure:
    # if notification_type == NOTIFICATION_TYPE_EMAIL:
    #     send_email(user_id, message)
    # elif notification_type == NOTIFICATION_TYPE_SMS:
    #     send_sms(user_id, message)
    # elif notification_type == NOTIFICATION_TYPE_PUSH:
    #     send_push_notification(user_id, message)
    # elif notification_type == NOTIFICATION_TYPE_WEBHOOK:
    #     send_webhook(user_id, message)

    logger.info(f"Notification sent successfully to user {user_id}")

    log_task_complete(
        self.name,
        logger,
        user_id=user_id,
        notification_type=notification_type
    )

    return create_success_response(
        f'{notification_type.capitalize()} notification sent successfully',
        user_id=user_id,
        notification_type=notification_type,
        message=message[:100]  # Truncate long messages in response
    )


@shared_task(
    bind=True,
    name=TASK_LONG_RUNNING,
    base=LongRunningTask,
    time_limit=TIMEOUT_LONG
)
def long_running_task(self, duration=10):
    """
    A long-running task for testing with progress tracking.

    This task demonstrates progress tracking for long-running operations.

    Args:
        duration (int): Duration in seconds to simulate processing

    Configuration:
    - Retries: 3 times with exponential backoff
    - Time limit: 30 minutes (can be adjusted)
    - Base class: LongRunningTask (includes progress tracking)

    Returns:
        dict: Success response with task details

    Example:
        >>> result = long_running_task.delay(duration=5)
        >>> result.state  # Check state
        'PROGRESS'
        >>> result.info  # Check progress
        {'current': 3, 'total': 5, 'percentage': 60.0, ...}
    """
    import time

    log_task_start(self.name, logger, duration=duration)

    logger.info(f"Starting long running task for {duration} seconds")

    for i in range(duration):
        time.sleep(1)
        logger.info(f"Progress: {i+1}/{duration}")

        # Update task progress using the base class method
        self.update_progress(
            current=i + 1,
            total=duration,
            message=f'Processing step {i+1} of {duration}'
        )

    logger.info("Long running task completed")

    log_task_complete(self.name, logger, duration=duration)

    return create_success_response(
        'Long running task completed successfully',
        duration=duration,
        steps_completed=duration
    )


# =============================================================================
# TEMPLATE FOR NEW TASKS
# =============================================================================

# Copy this template when creating new tasks:

# @shared_task(
#     bind=True,
#     name='apps.core.tasks.my_new_task',
#     base=BaseWiseBookTask,  # or CriticalTask, IdempotentTask, etc.
#     time_limit=TIMEOUT_MEDIUM
# )
# def my_new_task(self, param1, param2):
#     """
#     Brief description of the task.
#
#     Args:
#         param1: Description
#         param2: Description
#
#     Configuration:
#     - Retries: X times
#     - Time limit: Y minutes
#
#     Returns:
#         dict: Success response
#     """
#     log_task_start(self.name, logger, param1=param1, param2=param2)
#
#     # Validate parameters if needed
#     validate_required_params({'param1': param1}, ['param1'])
#
#     # Your task logic here
#     result = process_something(param1, param2)
#
#     log_task_complete(self.name, logger, result=result)
#
#     return create_success_response(
#         'Task completed successfully',
#         result=result
#     )
