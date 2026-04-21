# API Endpoints

This document covers all available API endpoints, their request/response formats, and usage examples.

## Base URL

| Environment | URL |
|-------------|-----|
| Local (HTTP) | `http://localhost:5108/api` |
| Local (HTTPS) | `https://localhost:7018/api` |
| Docker | `http://localhost:8080/api` |

## Response Format

All endpoints return a consistent response format:

```json
{
  "success": true,
  "message": "Optional message",
  "data": { },
  "errors": null
}
```

### Success Response
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "userId": "...",
    "accessToken": "..."
  },
  "errors": null
}
```

### Error Response
```json
{
  "success": false,
  "message": "Invalid email or password.",
  "data": null,
  "errors": ["Additional error details"]
}
```

---

## Authentication Endpoints

### POST `/api/auth/register`

Register a new user account.

**Request:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| email | Required, valid email format, max 256 chars |
| password | Required, min 8 chars, max 128 chars |
| firstName | Required, max 100 chars |
| lastName | Required, max 100 chars |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Registration successful.",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "fullName": "John Doe",
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
    "expiresAt": "2024-01-15T12:00:00Z"
  }
}
```

**Error Responses:**
| Status | Reason |
|--------|--------|
| 400 | Validation errors |
| 409 | Email already exists |

---

### POST `/api/auth/login`

Authenticate and receive tokens.

**Request:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "fullName": "John Doe",
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
    "expiresAt": "2024-01-15T12:00:00Z"
  }
}
```

**Error Responses:**
| Status | Reason |
|--------|--------|
| 401 | Invalid email or password |
| 403 | Account deactivated |

---

### POST `/api/auth/refresh-token`

Get a new access token using a refresh token.

**Request:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully.",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "fullName": "John Doe",
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "bmV3IHJlZnJlc2ggdG9rZW4...",
    "expiresAt": "2024-01-15T13:00:00Z"
  }
}
```

**Error Responses:**
| Status | Reason |
|--------|--------|
| 401 | Invalid or expired tokens |

---

### POST `/api/auth/logout` 🔒

Revoke the current user's refresh token. Requires authentication.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

**Error Responses:**
| Status | Reason |
|--------|--------|
| 401 | Not authenticated |

---

### GET `/api/auth/me` 🔒

Get current authenticated user's information. Requires authentication.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "isAuthenticated": true
  }
}
```

---

## Health Endpoints

### GET `/api/health`

Health check endpoint for monitoring and load balancers.

**Success Response (200):**
```json
{
  "status": "Healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

---

## Using Authentication

### Step 1: Get Access Token
Login or register to receive tokens:
```bash
curl -X POST http://localhost:5108/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

### Step 2: Use Access Token
Include the token in the Authorization header:
```bash
curl http://localhost:5108/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Step 3: Refresh When Expired
When the access token expires, use the refresh token:
```bash
curl -X POST http://localhost:5108/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"expired-token","refreshToken":"refresh-token"}'
```

---

## Swagger UI

Interactive API documentation is available at the root URL in development:

- Local: http://localhost:5108
- Docker: http://localhost:8080

Features:
- Try out endpoints directly
- See request/response schemas
- Authenticate with JWT (click "Authorize" button)

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not authenticated) |
| 403 | Forbidden (authenticated but not allowed) |
| 404 | Not Found |
| 409 | Conflict (e.g., duplicate email) |
| 500 | Internal Server Error |
