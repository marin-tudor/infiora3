"""
Simple users schemas without complex examples
"""
from drf_spectacular.utils import extend_schema

# Simple Schema Configurations for User Views
LIST_USERS_SCHEMA = extend_schema(
    tags=['Users'],
    summary='List Users',
    description='Get a paginated list of all users. Staff only.'
)

CREATE_USER_SCHEMA = extend_schema(
    tags=['Users'],
    summary='Create User',
    description='Create a new user. Staff only.'
)

RETRIEVE_USER_SCHEMA = extend_schema(
    tags=['Users'],
    summary='Retrieve User',
    description='Get details of a specific user. Staff only.'
)

UPDATE_USER_SCHEMA = extend_schema(
    tags=['Users'],
    summary='Update User',
    description='Update a specific user. Staff only.'
)

PARTIAL_UPDATE_USER_SCHEMA = extend_schema(
    tags=['Users'],
    summary='Partially Update User',
    description='Partially update a specific user. Staff only.'
)

DELETE_USER_SCHEMA = extend_schema(
    tags=['Users'],
    summary='Delete User',
    description='Delete a specific user. Staff only.'
)