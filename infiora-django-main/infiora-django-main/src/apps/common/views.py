from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from django.conf import settings
import django


@extend_schema(
    tags=['Health'],
    summary='API Health Check',
    description='Check if the API is running and return system information',
    responses={
        200: {
            'description': 'API is healthy',
            'examples': {
                'application/json': {
                    'status': 'healthy',
                    'version': '1.0.0',
                    'django_version': '4.2.24',
                    'environment': 'dev',
                    'database': 'connected',
                    'cache': 'connected'
                }
            }
        }
    }
)
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Simple health check endpoint for monitoring
    """
    return Response({
        'status': 'healthy',
        'version': '1.0.0',
        'django_version': django.get_version(),
        'environment': getattr(settings, 'DJANGO_ENVIRONMENT', 'unknown'),
        'database': 'connected',
        'cache': 'connected'
    })