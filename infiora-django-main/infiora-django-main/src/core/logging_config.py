"""
Advanced logging configuration for Infiora backend
Provides structured logging with JSON formatting, file rotation, and environment-specific settings
"""
import os
from pathlib import Path
from decouple import config

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Create logs directory if it doesn't exist
LOGS_DIR = BASE_DIR / 'logs'
LOGS_DIR.mkdir(exist_ok=True)

# Environment settings
ENVIRONMENT = config('DJANGO_ENVIRONMENT', default='dev')
LOG_LEVEL = config('LOG_LEVEL', default='INFO')

# Log file paths
DJANGO_LOG_FILE = LOGS_DIR / 'django.log'
API_LOG_FILE = LOGS_DIR / 'api.log'
AUTH_LOG_FILE = LOGS_DIR / 'auth.log'
SECURITY_LOG_FILE = LOGS_DIR / 'security.log'
ERROR_LOG_FILE = LOGS_DIR / 'error.log'
PERFORMANCE_LOG_FILE = LOGS_DIR / 'performance.log'

def get_logging_config():
    """Get logging configuration based on environment"""

    # Base formatters
    formatters = {
        'verbose': {
            'format': '{levelname} {asctime} [{name}] {module}.{funcName}:{lineno} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {asctime} {message}',
            'style': '{',
        },
        'json': {
            '()': 'apps.common.logging.JSONFormatter',
        },
        'colored': {
            '()': 'apps.common.logging.ColoredFormatter',
        }
    }

    # Base handlers
    handlers = {
        'console': {
            'level': 'WARNING' if ENVIRONMENT == 'dev' else 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'colored' if ENVIRONMENT in ['dev', 'staging'] else 'simple',
        },
        'django_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': str(DJANGO_LOG_FILE),
            'maxBytes': 1024 * 1024 * 15,  # 15MB
            'backupCount': 10,
            'formatter': 'json' if ENVIRONMENT == 'prod' else 'verbose',
        },
        'api_file': {
            'level': 'WARNING',  # Only log warnings and errors for API
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': str(API_LOG_FILE),
            'maxBytes': 1024 * 1024 * 10,  # 10MB
            'backupCount': 5,
            'formatter': 'json',
        },
        'auth_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': str(AUTH_LOG_FILE),
            'maxBytes': 1024 * 1024 * 5,   # 5MB
            'backupCount': 10,
            'formatter': 'json',
        },
        'security_file': {
            'level': 'WARNING',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': str(SECURITY_LOG_FILE),
            'maxBytes': 1024 * 1024 * 10,  # 10MB
            'backupCount': 20,  # Keep more security logs
            'formatter': 'json',
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': str(ERROR_LOG_FILE),
            'maxBytes': 1024 * 1024 * 10,  # 10MB
            'backupCount': 15,
            'formatter': 'json',
        },
        'performance_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': str(PERFORMANCE_LOG_FILE),
            'maxBytes': 1024 * 1024 * 5,   # 5MB
            'backupCount': 5,
            'formatter': 'json',
        },
    }

    # Add Syslog handler for prod
    if ENVIRONMENT == 'prod':
        handlers['syslog'] = {
            'level': 'INFO',
            'class': 'logging.handlers.SysLogHandler',
            'address': '/dev/log',
            'formatter': 'json',
        }

    # Loggers configuration
    loggers = {
        'django': {
            'handlers': ['console', 'django_file'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'django_file', 'error_file'],
            'level': 'WARNING',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['security_file'],
            'level': 'WARNING',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['console'] if ENVIRONMENT == 'dev' else [],
            'level': 'DEBUG' if ENVIRONMENT == 'dev' else 'WARNING',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console', 'django_file'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
        'apps.api': {
            'handlers': ['console', 'api_file'],
            'level': 'WARNING',  # Only log warnings and above for API
            'propagate': False,
        },
        'apps.authentication': {
            'handlers': ['console', 'auth_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps.security': {
            'handlers': ['console', 'security_file'],
            'level': 'WARNING',
            'propagate': False,
        },
        'apps.performance': {
            'handlers': ['performance_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps.error': {
            'handlers': ['console', 'error_file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'celery': {
            'handlers': ['console', 'django_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'celery.task': {
            'handlers': ['console', 'django_file'],
            'level': 'INFO',
            'propagate': False,
        },
    }

    # Add syslog to prod loggers
    if ENVIRONMENT == 'prod':
        for logger_config in loggers.values():
            if 'console' in logger_config['handlers']:
                logger_config['handlers'].append('syslog')

    return {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': formatters,
        'handlers': handlers,
        'loggers': loggers,
        'root': {
            'handlers': ['console', 'error_file'],
            'level': LOG_LEVEL,
        },
    }


# Export the configuration
LOGGING_CONFIG = get_logging_config()