"""
Authentication-specific Swagger schemas
"""
from drf_spectacular.utils import extend_schema, OpenApiExample
from apps.common.schemas import (
    BaseResponseSchema, MessageResponseSchema, ErrorResponseSchema,
    STANDARD_RESPONSES
)


# Authentication Examples
AUTH_EXAMPLES = {
    "login_request": OpenApiExample(
        "Login Request",
        value={
            "email": "user@example.com",
            "password": "securepassword123"
        },
        request_only=True
    ),
    "register_request": OpenApiExample(
        "Register Request", 
        value={
            "email": "newuser@example.com",
            "password": "securepassword123",
            "password_confirm": "securepassword123"
        },
        request_only=True
    ),
    "refresh_token_request": OpenApiExample(
        "Refresh Token Request",
        value={
            "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
        },
        request_only=True
    ),
    "logout_request": OpenApiExample(
        "Logout Request",
        value={
            "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
        },
        request_only=True
    ),
    "forgot_password_request": OpenApiExample(
        "Forgot Password Request",
        value={
            "email": "user@example.com"
        },
        request_only=True
    ),
    "reset_password_request": OpenApiExample(
        "Reset Password Request",
        value={
            "new_password": "newsecurepassword123",
            "confirm_password": "newsecurepassword123",
            "token": "abc123token",
            "uid": "user123"
        },
        request_only=True
    ),
    "update_profile_request": OpenApiExample(
        "Update Profile Request",
        value={
            "first_name": "John",
            "last_name": "Doe"
        },
        request_only=True
    ),
    "delete_account_request": OpenApiExample(
        "Delete Account Request",
        value={
            "password": "currentpassword123",
            "confirm_deletion": True
        },
        request_only=True
    ),
    "deactivate_account_request": OpenApiExample(
        "Deactivate Account Request",
        value={
            "password": "currentpassword123"
        },
        request_only=True
    ),
    "email_verification_request": OpenApiExample(
        "Email Verification Request",
        value={
            "email": "user@example.com"
        },
        request_only=True
    ),
    "verify_email_request": OpenApiExample(
        "Verify Email Request",
        value={
            "token": "verification_token_123",
            "uid": "user123"
        },
        request_only=True
    )
}

# Authentication Response Examples  
AUTH_RESPONSE_EXAMPLES = {
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
    ),
    "logout_success": OpenApiExample(
        "Logout Success",
        value={"message": "Logged out successfully"},
        response_only=True
    ),
    "token_refresh_success": OpenApiExample(
        "Token Refresh Success",
        value={
            "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
            "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
        },
        response_only=True
    ),
    "profile_updated": OpenApiExample(
        "Profile Updated",
        value={
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "email": "user@example.com",
            "first_name": "John",
            "last_name": "Doe",
            "avatar": "https://example.com/avatars/avatar.jpg",
            "is_active": True,
            "is_verified": True,
            "date_joined": "2025-01-01T00:00:00Z"
        },
        response_only=True
    ),
    "account_deleted": OpenApiExample(
        "Account Deleted",
        value={"message": "Your account has been permanently deleted."},
        response_only=True
    ),
    "account_deactivated": OpenApiExample(
        "Account Deactivated",
        value={"message": "Your account has been deactivated."},
        response_only=True
    ),
    "verification_email_sent": OpenApiExample(
        "Verification Email Sent",
        value={"message": "Verification email has been sent."},
        response_only=True
    ),
    "email_verified": OpenApiExample(
        "Email Verified",
        value={"message": "Email has been verified successfully."},
        response_only=True
    ),
    "password_reset_sent": OpenApiExample(
        "Password Reset Sent",
        value={"message": "If an account with that email exists, a password reset email has been sent."},
        response_only=True
    ),
    "password_reset_success": OpenApiExample(
        "Password Reset Success",
        value={"message": "Password has been reset successfully."},
        response_only=True
    )
}

# Schema Configurations for Authentication Views
LOGIN_SCHEMA = extend_schema(
    tags=['Authentication'],
    summary='User Login',
    description='Authenticate user with email and password, returns JWT tokens',
    examples=[AUTH_EXAMPLES["login_request"]],
    responses={
        200: {
            "description": "Login successful",
            "content": {
                "application/json": {
                    "examples": {
                        "success": AUTH_RESPONSE_EXAMPLES["login_success"]
                    }
                }
            }
        },
        **{k: v for k, v in STANDARD_RESPONSES.items() if k in [400, 401]}
    }
)

REGISTER_SCHEMA = extend_schema(
    tags=['Authentication'],
    summary='User Registration',
    description='Create a new user account with email and password',
    examples=[AUTH_EXAMPLES["register_request"]],
    responses={
        201: {
            "description": "User registered successfully",
            "content": {
                "application/json": {
                    "examples": {
                        "success": AUTH_RESPONSE_EXAMPLES["register_success"]
                    }
                }
            }
        },
        **{k: v for k, v in STANDARD_RESPONSES.items() if k in [400]}
    }
)

LOGOUT_SCHEMA = extend_schema(
    tags=['Authentication'],
    summary='User Logout',
    description='Logout user by blacklisting the refresh token',
    examples=[AUTH_EXAMPLES["logout_request"]],
    responses={
        200: {
            "description": "Logged out successfully",
            "content": {
                "application/json": {
                    "schema": MessageResponseSchema,
                    "examples": {
                        "success": AUTH_RESPONSE_EXAMPLES["logout_success"]
                    }
                }
            }
        },
        **{k: v for k, v in STANDARD_RESPONSES.items() if k in [400, 401]}
    }
)

REFRESH_TOKEN_SCHEMA = extend_schema(
    tags=['Authentication'],
    summary='Refresh Access Token',
    description='Generate a new access token using refresh token',
    examples=[AUTH_EXAMPLES["refresh_token_request"]],
    responses={
        200: {
            "description": "Token refreshed successfully",
            "content": {
                "application/json": {
                    "examples": {
                        "success": AUTH_RESPONSE_EXAMPLES["token_refresh_success"]
                    }
                }
            }
        },
        **{k: v for k, v in STANDARD_RESPONSES.items() if k in [400, 401]}
    }
)

ME_SCHEMA = extend_schema(
    tags=['Authentication'],
    summary='Get Current User Profile',
    description='Get the authenticated user\'s profile information',
    responses={
        200: {
            "description": "Current user profile data",
            "content": {
                "application/json": {
                    "examples": {
                        "profile": OpenApiExample(
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
                        )
                    }
                }
            }
        },
        **{k: v for k, v in STANDARD_RESPONSES.items() if k in [401]}
    }
)

UPDATE_ME_SCHEMA = extend_schema(
    tags=['Authentication'],
    summary='Update Current User Profile',
    description='Update the authenticated user\'s profile information',
    examples=[AUTH_EXAMPLES["update_profile_request"]],
    responses={
        200: {
            "description": "Profile updated successfully",
            "content": {
                "application/json": {
                    "examples": {
                        "updated": AUTH_RESPONSE_EXAMPLES["profile_updated"]
                    }
                }
            }
        },
        **{k: v for k, v in STANDARD_RESPONSES.items() if k in [400, 401]}
    }
)

DELETE_ACCOUNT_SCHEMA = extend_schema(
    tags=['Authentication'],
    summary='Delete User Account',
    description='Permanently delete the authenticated user\'s account',
    examples=[AUTH_EXAMPLES["delete_account_request"]],
    responses={
        200: {
            "description": "Account deleted successfully",
            "content": {
                "application/json": {
                    "schema": MessageResponseSchema,
                    "examples": {
                        "success": AUTH_RESPONSE_EXAMPLES["account_deleted"]
                    }
                }
            }
        },
        **{k: v for k, v in STANDARD_RESPONSES.items() if k in [400, 401]}
    }
)

DEACTIVATE_ACCOUNT_SCHEMA = extend_schema(
    tags=['Authentication'], 
    summary='Deactivate User Account',
    description='Deactivate the authenticated user\'s account (can be reactivated)',
    examples=[AUTH_EXAMPLES["deactivate_account_request"]],
    responses={
        200: {
            "description": "Account deactivated successfully",
            "content": {
                "application/json": {
                    "schema": MessageResponseSchema,
                    "examples": {
                        "success": AUTH_RESPONSE_EXAMPLES["account_deactivated"]
                    }
                }
            }
        },
        **{k: v for k, v in STANDARD_RESPONSES.items() if k in [400, 401]}
    }
)

FORGOT_PASSWORD_SCHEMA = extend_schema(
    tags=['Authentication'],
    summary='Forgot Password',
    description='Send password reset email to user',
    examples=[AUTH_EXAMPLES["forgot_password_request"]],
    responses={
        200: {
            "description": "Password reset email sent (if email exists)",
            "content": {
                "application/json": {
                    "schema": MessageResponseSchema,
                    "examples": {
                        "success": AUTH_RESPONSE_EXAMPLES["password_reset_sent"]
                    }
                }
            }
        },
        **{k: v for k, v in STANDARD_RESPONSES.items() if k in [400]}
    }
)

RESET_PASSWORD_SCHEMA = extend_schema(
    tags=['Authentication'],
    summary='Reset Password',
    description='Reset user password using token from email',
    examples=[AUTH_EXAMPLES["reset_password_request"]],
    responses={
        200: {
            "description": "Password reset successfully",
            "content": {
                "application/json": {
                    "schema": MessageResponseSchema,
                    "examples": {
                        "success": AUTH_RESPONSE_EXAMPLES["password_reset_success"]
                    }
                }
            }
        },
        **{k: v for k, v in STANDARD_RESPONSES.items() if k in [400]}
    }
)

SEND_VERIFICATION_EMAIL_SCHEMA = extend_schema(
    tags=['Authentication'],
    summary='Send Email Verification',
    description='Send email verification to current user or specified email',
    examples=[AUTH_EXAMPLES["email_verification_request"]],
    responses={
        200: {
            "description": "Verification email sent",
            "content": {
                "application/json": {
                    "schema": MessageResponseSchema,
                    "examples": {
                        "success": AUTH_RESPONSE_EXAMPLES["verification_email_sent"]
                    }
                }
            }
        },
        **{k: v for k, v in STANDARD_RESPONSES.items() if k in [400, 401]}
    }
)

VERIFY_EMAIL_SCHEMA = extend_schema(
    tags=['Authentication'],
    summary='Verify Email Address',
    description='Verify email address using token from verification email',
    examples=[AUTH_EXAMPLES["verify_email_request"]],
    responses={
        200: {
            "description": "Email verified successfully",
            "content": {
                "application/json": {
                    "schema": MessageResponseSchema,
                    "examples": {
                        "success": AUTH_RESPONSE_EXAMPLES["email_verified"]
                    }
                }
            }
        },
        **{k: v for k, v in STANDARD_RESPONSES.items() if k in [400]}
    }
)