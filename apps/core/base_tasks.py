"""
Base task classes for WiseBook Celery tasks.

This module provides base task classes with common functionality like
automatic retry, error handling, logging, and monitoring.
"""
from celery import Task
from apps.core.celery_utils import (
    create_error_response,
    log_task_start,
    log_task_complete
)
from apps.core.celery_constants import (
    MAX_RETRIES_DEFAULT,
    RETRY_BACKOFF_SHORT,
    RETRY_BACKOFF_MAX
)
import logging

logger = logging.getLogger(__name__)


class BaseWiseBookTask(Task):
    """
    Base task class for all WiseBook tasks.

    Features:
    - Automatic retry with exponential backoff
    - Structured logging
    - Error handling and reporting
    - Task lifecycle hooks (on_failure, on_retry, on_success)

    Example:
        @shared_task(bind=True, base=BaseWiseBookTask)
        def my_task(self, param1, param2):
            # Your task logic here
            return {'result': 'success'}
    """

    # Retry configuration
    autoretry_for = (Exception,)  # Retry on any exception
    retry_kwargs = {
        'max_retries': MAX_RETRIES_DEFAULT,
        'countdown': RETRY_BACKOFF_SHORT
    }
    retry_backoff = True  # Enable exponential backoff
    retry_backoff_max = RETRY_BACKOFF_MAX  # Maximum backoff time
    retry_jitter = True  # Add randomness to backoff to avoid thundering herd

    # Task behavior
    acks_late = True  # Acknowledge task only after completion
    reject_on_worker_lost = True  # Reject task if worker is lost
    track_started = True  # Track when task starts

    def before_start(self, task_id, args, kwargs):
        """
        Handler called before the task starts.

        Args:
            task_id: Unique task identifier
            args: Task positional arguments
            kwargs: Task keyword arguments
        """
        log_task_start(self.name, logger_instance=logger, task_id=task_id)

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """
        Handler called when task fails (after all retries exhausted).

        Args:
            exc: Exception raised by the task
            task_id: Unique task identifier
            args: Task positional arguments
            kwargs: Task keyword arguments
            einfo: Exception info object
        """
        logger.error(
            f"Task {self.name} [{task_id}] failed after all retries: {exc}",
            exc_info=True,
            extra={
                'task_name': self.name,
                'task_id': task_id,
                'args': args,
                'kwargs': kwargs
            }
        )

        # You can add custom failure handling here:
        # - Send notification to admins
        # - Log to external monitoring service (Sentry, etc.)
        # - Update task status in database

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """
        Handler called when task is retrying.

        Args:
            exc: Exception that caused the retry
            task_id: Unique task identifier
            args: Task positional arguments
            kwargs: Task keyword arguments
            einfo: Exception info object
        """
        retry_count = self.request.retries
        max_retries = self.max_retries

        logger.warning(
            f"Task {self.name} [{task_id}] retrying ({retry_count}/{max_retries}): {exc}",
            extra={
                'task_name': self.name,
                'task_id': task_id,
                'retry_count': retry_count,
                'max_retries': max_retries,
                'args': args,
                'kwargs': kwargs
            }
        )

    def on_success(self, retval, task_id, args, kwargs):
        """
        Handler called when task succeeds.

        Args:
            retval: Return value of the task
            task_id: Unique task identifier
            args: Task positional arguments
            kwargs: Task keyword arguments
        """
        log_task_complete(
            self.name,
            logger_instance=logger,
            task_id=task_id,
            result=str(retval)[:100]  # Truncate long results
        )

    def after_return(self, status, retval, task_id, args, kwargs, einfo):
        """
        Handler called after task returns (success, failure, or retry).

        Args:
            status: Task status ('SUCCESS', 'FAILURE', 'RETRY', etc.)
            retval: Return value or exception
            task_id: Unique task identifier
            args: Task positional arguments
            kwargs: Task keyword arguments
            einfo: Exception info object (if failure)
        """
        # Cleanup code can go here
        # - Close database connections
        # - Release resources
        # - Update metrics
        pass


class CriticalTask(BaseWiseBookTask):
    """
    Base class for critical tasks that require more retries and immediate attention on failure.

    Use this for tasks that are essential for business operations.

    Example:
        @shared_task(bind=True, base=CriticalTask)
        def process_payment(self, payment_id):
            # Critical payment processing
            pass
    """

    retry_kwargs = {
        'max_retries': 5,  # More retries for critical tasks
        'countdown': RETRY_BACKOFF_SHORT
    }

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Enhanced failure handler for critical tasks."""
        super().on_failure(exc, task_id, args, kwargs, einfo)

        # Add critical task specific handling
        logger.critical(
            f"CRITICAL TASK FAILED: {self.name} [{task_id}]",
            exc_info=True,
            extra={
                'task_name': self.name,
                'task_id': task_id,
                'priority': 'CRITICAL'
            }
        )

        # TODO: Send immediate notification to ops team
        # TODO: Create incident in monitoring system
        # TODO: Trigger alert/pager


class IdempotentTask(BaseWiseBookTask):
    """
    Base class for idempotent tasks (tasks that can be safely retried multiple times).

    Idempotent tasks produce the same result even if executed multiple times with same inputs.

    Example:
        @shared_task(bind=True, base=IdempotentTask)
        def update_exchange_rates(self):
            # Fetch and update exchange rates (safe to run multiple times)
            pass
    """

    # Idempotent tasks can be retried more aggressively
    retry_kwargs = {
        'max_retries': 10,
        'countdown': 30  # Shorter initial backoff
    }


class LongRunningTask(BaseWiseBookTask):
    """
    Base class for long-running tasks with progress tracking.

    Use this for tasks that take significant time and should report progress.

    Example:
        @shared_task(bind=True, base=LongRunningTask)
        def process_large_dataset(self, dataset_id):
            for i, item in enumerate(dataset):
                # Process item
                self.update_progress(i, total_items)
    """

    track_started = True
    time_limit = 3600  # 1 hour max

    def update_progress(self, current, total, message=None):
        """
        Update task progress.

        Args:
            current (int): Current progress count
            total (int): Total items to process
            message (str): Optional progress message
        """
        from apps.core.celery_utils import create_progress_response

        progress_data = create_progress_response(current, total, message)

        self.update_state(
            state='PROGRESS',
            meta=progress_data
        )

        logger.info(
            f"Task {self.name} progress: {current}/{total} ({progress_data['percentage']}%)"
        )


class PeriodicTask(BaseWiseBookTask):
    """
    Base class for scheduled periodic tasks (cron-like tasks).

    Use this for tasks that run on a schedule via Celery Beat.

    Example:
        @shared_task(bind=True, base=PeriodicTask)
        def daily_cleanup(self):
            # Runs every day via Celery Beat
            pass
    """

    # Periodic tasks should not retry too aggressively
    # (next execution will run soon anyway)
    retry_kwargs = {
        'max_retries': 2,
        'countdown': 300  # 5 minutes
    }

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Log periodic task failures but don't escalate too much."""
        super().on_failure(exc, task_id, args, kwargs, einfo)

        logger.error(
            f"Periodic task {self.name} failed. Will retry on next schedule.",
            extra={
                'task_name': self.name,
                'task_id': task_id,
                'task_type': 'periodic'
            }
        )
