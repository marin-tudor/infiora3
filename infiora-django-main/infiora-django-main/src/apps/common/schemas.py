"""
Common Swagger/OpenAPI schemas for consistent API documentation
"""
from drf_spectacular.utils import OpenApiExample
from drf_spectacular.openapi import AutoSchema
from rest_framework import serializers


class BaseResponseSchema(serializers.Serializer):
    """Base response schema for API responses"""
    pass


class MessageResponseSchema(BaseResponseSchema):
    """Standard message response schema"""
    message = serializers.CharField(
        help_text="Response message"
    )


class ErrorResponseSchema(BaseResponseSchema):
    """Standard error response schema"""
    error = serializers.CharField(
        help_text="Error message"
    )
    details = serializers.DictField(
        help_text="Error details",
        required=False
    )


class ValidationErrorSchema(BaseResponseSchema):
    """Validation error response schema"""
    field_name = serializers.ListField(
        child=serializers.CharField(),
        help_text="Field-specific validation errors"
    )


# Authentication Schemas
class AuthTokenResponseSchema(BaseResponseSchema):
    """Authentication token response schema"""
    access = serializers.CharField(
        help_text="JWT access token"
    )
    refresh = serializers.CharField(
        help_text="JWT refresh token"
    )


class AuthUserResponseSchema(BaseResponseSchema):
    """Authentication with user data response schema"""
    access = serializers.CharField(help_text="JWT access token")
    refresh = serializers.CharField(help_text="JWT refresh token")
    user = serializers.DictField(help_text="User profile data")
    message = serializers.CharField(help_text="Success message", required=False)


# Common Examples
COMMON_EXAMPLES = {
    "success_message": OpenApiExample(
        "Success Message",
        value={"message": "Operation completed successfully"},
        response_only=True
    ),
    "error_message": OpenApiExample(
        "Error Message",
        value={"error": "Something went wrong"},
        response_only=True
    ),
    "validation_error": OpenApiExample(
        "Validation Error",
        value={
            "email": ["This field is required."],
            "password": ["This field may not be blank."]
        },
        response_only=True
    ),
    "auth_tokens": OpenApiExample(
        "Authentication Tokens",
        value={
            "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
            "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
        },
        response_only=True
    ),
    "user_profile": OpenApiExample(
        "User Profile",
        value={
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "email": "user@example.com",
            "first_name": "John",
            "last_name": "Doe",
            "avatar": None,
            "is_active": True,
            "is_verified": True,
            "date_joined": "2025-01-01T00:00:00Z"
        },
        response_only=True
    ),
    "login_success": OpenApiExample(
        "Login Success",
        value={
            "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
            "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
            "user": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "user@example.com",
                "first_name": "John",
                "last_name": "Doe",
                "avatar": None,
                "is_active": True,
                "is_verified": True,
                "date_joined": "2025-01-01T00:00:00Z"
            }
        },
        response_only=True
    ),
    "register_success": OpenApiExample(
        "Registration Success",
        value={
            "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
            "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
            "user": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "newuser@example.com",
                "first_name": "",
                "last_name": "",
                "avatar": None,
                "is_active": True,
                "is_verified": False,
                "date_joined": "2025-01-01T00:00:00Z"
            },
            "message": "User registered successfully"
        },
        response_only=True
    )
}


# Standard Response Configurations
STANDARD_RESPONSES = {
    200: {
        "description": "Success",
        "content": {
            "application/json": {
                "schema": MessageResponseSchema,
                "examples": {
                    "success": COMMON_EXAMPLES["success_message"]
                }
            }
        }
    },
    400: {
        "description": "Bad Request",
        "content": {
            "application/json": {
                "schema": ValidationErrorSchema,
                "examples": {
                    "validation_error": COMMON_EXAMPLES["validation_error"],
                    "error": COMMON_EXAMPLES["error_message"]
                }
            }
        }
    },
    401: {
        "description": "Unauthorized",
        "content": {
            "application/json": {
                "schema": ErrorResponseSchema,
                "examples": {
                    "unauthorized": OpenApiExample(
                        "Unauthorized",
                        value={"error": "Authentication credentials were not provided"},
                        response_only=True
                    )
                }
            }
        }
    },
    403: {
        "description": "Forbidden",
        "content": {
            "application/json": {
                "schema": ErrorResponseSchema,
                "examples": {
                    "forbidden": OpenApiExample(
                        "Forbidden",
                        value={"error": "You do not have permission to perform this action"},
                        response_only=True
                    )
                }
            }
        }
    },
    404: {
        "description": "Not Found",
        "content": {
            "application/json": {
                "schema": ErrorResponseSchema,
                "examples": {
                    "not_found": OpenApiExample(
                        "Not Found",
                        value={"error": "Resource not found"},
                        response_only=True
                    )
                }
            }
        }
    },
    500: {
        "description": "Internal Server Error",
        "content": {
            "application/json": {
                "schema": ErrorResponseSchema,
                "examples": {
                    "server_error": OpenApiExample(
                        "Server Error",
                        value={"error": "Internal server error occurred"},
                        response_only=True
                    )
                }
            }
        }
    }
}