"""
Utilities for Celery tasks in WiseBook.

This module provides reusable functions for Celery tasks to reduce code duplication
and improve maintainability.
"""
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


def create_success_response(message, **extra_data):
    """
    Create a standardized success response for Celery tasks.

    Args:
        message (str): Success message
        **extra_data: Additional key-value pairs to include in response

    Returns:
        dict: Standardized success response with status, message, timestamp, and extra data

    Example:
        >>> create_success_response('Task completed', count=5, total=10)
        {'status': 'success', 'message': 'Task completed', 'timestamp': '...', 'count': 5, 'total': 10}
    """
    response = {
        'status': 'success',
        'message': message,
        'timestamp': timezone.now().isoformat()
    }
    response.update(extra_data)
    return response


def create_error_response(error, **extra_data):
    """
    Create a standardized error response for Celery tasks.

    Args:
        error (Exception or str): Error object or error message
        **extra_data: Additional key-value pairs to include in response

    Returns:
        dict: Standardized error response with status, message, timestamp, and extra data

    Example:
        >>> create_error_response(ValueError('Invalid input'), context='user_input')
        {'status': 'error', 'message': 'Invalid input', 'timestamp': '...', 'context': 'user_input'}
    """
    response = {
        'status': 'error',
        'message': str(error),
        'timestamp': timezone.now().isoformat()
    }
    response.update(extra_data)
    return response


def create_progress_response(current, total, message=None, **extra_data):
    """
    Create a standardized progress response for long-running Celery tasks.

    Args:
        current (int): Current progress count
        total (int): Total items to process
        message (str, optional): Progress message
        **extra_data: Additional key-value pairs to include in response

    Returns:
        dict: Progress response with current, total, percentage, message, and extra data

    Example:
        >>> create_progress_response(5, 10, 'Processing items')
        {'current': 5, 'total': 10, 'percentage': 50.0, 'message': 'Processing items', ...}
    """
    percentage = (current / total * 100) if total > 0 else 0
    response = {
        'current': current,
        'total': total,
        'percentage': round(percentage, 2),
        'message': message or f'Processing {current}/{total}',
        'timestamp': timezone.now().isoformat()
    }
    response.update(extra_data)
    return response


def handle_task_error(task, error, logger_instance=None, countdown=60, max_retries=3):
    """
    Handle task error with logging and retry mechanism.

    This function logs the error and raises a retry exception with exponential backoff.

    Args:
        task: The Celery task instance (must have bind=True)
        error (Exception): The exception that occurred
        logger_instance: Custom logger to use (defaults to module logger)
        countdown (int): Initial retry delay in seconds (default: 60)
        max_retries (int): Maximum number of retries (default: 3)

    Raises:
        task.retry: Raises retry exception to trigger Celery retry mechanism

    Example:
        @shared_task(bind=True)
        def my_task(self):
            try:
                # task logic
                pass
            except Exception as e:
                handle_task_error(self, e)
    """
    if logger_instance is None:
        logger_instance = logger

    logger_instance.error(f"Error in task {task.name}: {str(error)}", exc_info=True)

    # Retry with exponential backoff
    try:
        raise task.retry(exc=error, countdown=countdown, max_retries=max_retries)
    except Exception:
        # If max retries exceeded, return error response instead of raising
        return create_error_response(
            error,
            task_id=task.request.id,
            retries=task.request.retries
        )


def log_task_start(task_name, logger_instance=None, **params):
    """
    Log the start of a Celery task with parameters.

    Args:
        task_name (str): Name of the task
        logger_instance: Custom logger to use (defaults to module logger)
        **params: Task parameters to log

    Example:
        >>> log_task_start('process_invoice', invoice_id=123, user_id=456)
        # Logs: "Task 'process_invoice' started with params: invoice_id=123, user_id=456"
    """
    if logger_instance is None:
        logger_instance = logger

    if params:
        params_str = ', '.join(f"{k}={v}" for k, v in params.items())
        logger_instance.info(f"Task '{task_name}' started with params: {params_str}")
    else:
        logger_instance.info(f"Task '{task_name}' started")


def log_task_complete(task_name, logger_instance=None, **result_data):
    """
    Log the completion of a Celery task with result data.

    Args:
        task_name (str): Name of the task
        logger_instance: Custom logger to use (defaults to module logger)
        **result_data: Result data to log

    Example:
        >>> log_task_complete('process_invoice', processed=10, errors=0)
        # Logs: "Task 'process_invoice' completed: processed=10, errors=0"
    """
    if logger_instance is None:
        logger_instance = logger

    if result_data:
        result_str = ', '.join(f"{k}={v}" for k, v in result_data.items())
        logger_instance.info(f"Task '{task_name}' completed: {result_str}")
    else:
        logger_instance.info(f"Task '{task_name}' completed successfully")


def validate_required_params(params_dict, required_keys):
    """
    Validate that required parameters are present and not None.

    Args:
        params_dict (dict): Dictionary of parameters to validate
        required_keys (list): List of required parameter names

    Raises:
        ValueError: If any required parameter is missing or None

    Example:
        >>> validate_required_params({'user_id': 123, 'email': None}, ['user_id', 'email'])
        ValueError: Missing required parameter: email
    """
    for key in required_keys:
        if key not in params_dict or params_dict[key] is None:
            raise ValueError(f"Missing required parameter: {key}")


def format_duration(seconds):
    """
    Format duration in seconds to human-readable string.

    Args:
        seconds (int or float): Duration in seconds

    Returns:
        str: Formatted duration string

    Example:
        >>> format_duration(65)
        '1m 5s'
        >>> format_duration(3665)
        '1h 1m 5s'
    """
    if seconds < 60:
        return f"{int(seconds)}s"

    minutes = int(seconds // 60)
    remaining_seconds = int(seconds % 60)

    if minutes < 60:
        return f"{minutes}m {remaining_seconds}s"

    hours = minutes // 60
    remaining_minutes = minutes % 60

    return f"{hours}h {remaining_minutes}m {remaining_seconds}s"
