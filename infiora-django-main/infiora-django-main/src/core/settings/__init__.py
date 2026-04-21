import os
from decouple import config

environment = config('DJANGO_ENVIRONMENT', default='dev')

if environment == 'prod':
    from .prod import *
elif environment == 'staging':
    from .staging import *
else:
    from .dev import *