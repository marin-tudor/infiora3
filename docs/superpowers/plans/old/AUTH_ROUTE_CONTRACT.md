# Auth Route Contract

Canonical `wave 2` auth contract for the active Node backend and current frontends.

Base API:

- `POST /v1/auth/register`
  - Body: `{ "name": string, "email": string, "password": string }`
  - Response: `{ "user": User, "tokens": AuthTokens }`
- `POST /v1/auth/login`
  - Body: `{ "email": string, "password": string }`
  - Response: `{ "user": User, "tokens": AuthTokens }`
  - Cookie-based clients should send `credentials: "include"`.
- `POST /v1/auth/logout`
  - Preferred mode: cookie session logout with `credentials: "include"`.
  - Optional body for token-based clients: `{ "refreshToken": string }`
  - Response: `204 No Content`
- `POST /v1/auth/refresh-tokens`
  - Preferred mode: cookie refresh with `credentials: "include"`.
  - Optional body for token-based clients: `{ "refreshToken": string }`
  - Response: `{ "user": User, "tokens": AuthTokens }`
- `GET /v1/auth/refresh-tokens`
  - Cookie-only refresh fallback used by current dashboard/admin fetch wrappers.
  - Response: `{ "user": User, "tokens": AuthTokens }`
- `POST /v1/auth/forgot-password`
  - Body: `{ "email": string }`
  - Response: `204 No Content`
- `POST /v1/auth/reset-password?token=...`
  - Body: `{ "password": string }`
  - Response: `204 No Content`
- `POST /v1/auth/send-verification-email`
  - Auth required.
  - Body: none.
  - Response: `204 No Content`
- `POST /v1/auth/verify-email?token=...`
  - Body: none.
  - Response: `204 No Content`
- `GET /v1/users/me`
  - Auth required.
  - Response: `User`

Frontend alignment:

- `infiora-admin-main` login/register normalize backend auth responses to `result.user`.
- `infiora-admin-main` and `infiora-dash-main` refresh/logout use cookie-aware flows.
- `infiora-app-main` verify/reset pages use `POST` plus `token` query param, matching backend validation.
- `infiora-dash-main` NextAuth bridge derives session proof from backend-verified `user`, not from client-trusted payload shape.
