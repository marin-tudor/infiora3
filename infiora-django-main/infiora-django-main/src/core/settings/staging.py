from .prod import *

# Staging specific settings
DEBUG = config('DEBUG', default=False, cast=bool)

# Less restrictive settings for staging
ALLOWED_HOSTS = ['*']  # More permissive for staging

# Reduced security for easier testing
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Staging logging
LOGGING['loggers']['django']['level'] = 'DEBUG'
LOGGING['loggers']['apps']['level'] = 'DEBUG'