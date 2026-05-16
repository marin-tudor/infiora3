import os
from decouple import config

environment = config('DJANGO_ENVIRONMENT', default=None)

if environment is None:
    raise RuntimeError('DJANGO_ENVIRONMENT must be set to dev, staging, or prod.')

if environment == 'prod':
    from .prod import *
elif environment == 'staging':
    from .staging import *
else:
    from .dev import *
