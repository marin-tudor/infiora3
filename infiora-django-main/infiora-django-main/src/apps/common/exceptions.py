from rest_framework.views import exception_handler
from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        logger.error(f"API Error: {exc}", exc_info=True, extra={
            'request': context.get('request'),
            'view': context.get('view'),
        })
        
        custom_response_data = {
            'error': True,
            'message': 'An error occurred',
            'details': response.data
        }
        
        if hasattr(exc, 'detail'):
            if isinstance(exc.detail, str):
                custom_response_data['message'] = exc.detail
            elif isinstance(exc.detail, dict):
                custom_response_data['message'] = 'Validation error'
                custom_response_data['details'] = exc.detail
        
        response.data = custom_response_data

    return response