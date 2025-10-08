"""
Custom exception handlers for WiseBook API
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that provides consistent error responses.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    # If response is None, we have an unhandled exception
    if response is None:
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return Response({
            'error': 'Une erreur interne est survenue.',
            'detail': str(exc)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Customize the response format
    if isinstance(response.data, dict):
        custom_response_data = {
            'success': False,
            'error': response.data.get('detail', 'Une erreur est survenue'),
            'status_code': response.status_code
        }

        # Add field-specific errors if they exist
        if 'detail' not in response.data:
            custom_response_data['errors'] = response.data

        response.data = custom_response_data

    return response
