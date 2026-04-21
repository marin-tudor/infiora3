"""
Users-specific Swagger schemas
"""
from drf_spectacular.utils import extend_schema, OpenApiExample
from drf_spectacular.utils import extend_schema


# User Examples
USER_EXAMPLES = {
    "user_detail": OpenApiExample(
        "User Detail",
        value={
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "email": "user@example.com",
            "first_name": "John",
            "last_name": "Doe",
            "full_name": "John Doe",
            "short_name": "John",
            "avatar": None,
            "is_active": True,
            "is_verified": True,
            "date_joined": "2025-01-01T00:00:00Z",
            "created_at": "2025-01-01T00:00:00Z",
            "updated_at": "2025-01-01T00:00:00Z"
        },
        response_only=True
    ),
    "user_list": OpenApiExample(
        "User List",
        value={
            "count": 25,
            "next": "http://localhost:8000/api/v1/users/?page=2",
            "previous": None,
            "results": [
                {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "email": "user1@example.com",
                    "first_name": "John",
                    "last_name": "Doe",
                    "full_name": "John Doe",
                    "short_name": "John",
                    "avatar": None,
                    "is_active": True,
                    "is_verified": True,
                    "date_joined": "2025-01-01T00:00:00Z"
                },
                {
                    "id": "456e7890-e12f-34g5-b678-901234567890",
                    "email": "user2@example.com",
                    "first_name": "Jane",
                    "last_name": "Smith",
                    "full_name": "Jane Smith",
                    "short_name": "Jane",
                    "avatar": "https://example.com/avatars/jane.jpg",
                    "is_active": True,
                    "is_verified": False,
                    "date_joined": "2025-01-02T00:00:00Z"
                }
            ]
        },
        response_only=True
    ),
    "create_user_request": OpenApiExample(
        "Create User Request",
        value={
            "email": "newuser@example.com",
            "password": "securepassword123",
            "password_confirm": "securepassword123"
        },
        request_only=True
    ),
    "update_user_request": OpenApiExample(
        "Update User Request",
        value={
            "first_name": "John",
            "last_name": "Doe",
            "is_active": True,
            "is_verified": True,
            "is_staff": False
        },
        request_only=True
    )
}

# Schema Configurations for User Views
LIST_USERS_SCHEMA = extend_schema(
    tags=['Users'],
    summary='List Users',
    description='Get a paginated list of all users. Staff only.',
    responses={
        200: {
            "description": "Paginated list of users",
            "content": {
                "application/json": {
                    "examples": {
                        "user_list": USER_EXAMPLES["user_list"]
                    }
                }
            }
        },
        **{k: v for k, v in STANDARD_RESPONSES.items() if k in [401, 403]}
    }
)

CREATE_USER_SCHEMA = extend_schema(
    tags=['Users'],
    summary='Create User',
    description='Create a new user. Staff only.',
    examples=[USER_EXAMPLES["create_user_request"]],
    responses={
        201: {
            "description": "User created successfully",
            "content": {
                "application/json": {
                    "examples": {
                        "created_user": USER_EXAMPLES["user_detail"]
                    }
                }
            }
        },
        **{k: v for k, v in STANDARD_RESPONSES.items() if k in [400, 401, 403]}
    }
)

RETRIEVE_USER_SCHEMA = extend_schema(
    tags=['Users'],
    summary='Retrieve User',
    description='Get details of a specific user. Staff only.',
    responses={
        200: {
            "description": "User details",
            "content": {
                "application/json": {
                    "examples": {
                        "user_detail": USER_EXAMPLES["user_detail"]
                    }
                }
            }
        },
        **{k: v for k, v in STANDARD_RESPONSES.items() if k in [401, 403, 404]}
    }
)

UPDATE_USER_SCHEMA = extend_schema(
    tags=['Users'],
    summary='Update User',
    description='Update a specific user. Staff only.',
    examples=[USER_EXAMPLES["update_user_request"]],
    responses={
        200: {
            "description": "User updated successfully",
            "content": {
                "application/json": {
                    "examples": {
                        "updated_user": USER_EXAMPLES["user_detail"]
                    }
                }
            }
        },
        **{k: v for k, v in STANDARD_RESPONSES.items() if k in [400, 401, 403, 404]}
    }
)

PARTIAL_UPDATE_USER_SCHEMA = extend_schema(
    tags=['Users'],
    summary='Partially Update User',
    description='Partially update a specific user. Staff only.',
    examples=[USER_EXAMPLES["update_user_request"]],
    responses={
        200: {
            "description": "User updated successfully",
            "content": {
                "application/json": {
                    "examples": {
                        "updated_user": USER_EXAMPLES["user_detail"]
                    }
                }
            }
        },
        **{k: v for k, v in STANDARD_RESPONSES.items() if k in [400, 401, 403, 404]}
    }
)

DELETE_USER_SCHEMA = extend_schema(
    tags=['Users'],
    summary='Delete User',
    description='Delete a specific user. Staff only.',
    responses={
        204: {"description": "User deleted successfully"},
        **{k: v for k, v in STANDARD_RESPONSES.items() if k in [401, 403, 404]}
    }
)