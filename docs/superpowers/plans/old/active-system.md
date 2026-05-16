# Active Infiora System

## Authoritative Architecture

Wave 3 standardizes the default Infiora stack to:

- Node API: `infiora-backend-main/infiora-backend-main`
- Admin console: `infiora-admin-main/infiora-admin-main`
- Guest app: `infiora-app-main/infiora-app-main`

These are the only apps that should be assumed active by default for local development, linting, testing, and deployment preparation.

## Runtime Map

| Surface | Path | Port | Notes |
| --- | --- | --- | --- |
| Node API | `infiora-backend-main/infiora-backend-main` | `8000` | MongoDB-backed authoritative API |
| Admin | `infiora-admin-main/infiora-admin-main` | `4000` | Internal operations/admin UI |
| Guest app | `infiora-app-main/infiora-app-main` | `4002` | Hotel guest experience |

## Environment Ownership

### Backend

- Source of truth for auth, hotel content, rooms, orders, bookings, uploads, analytics, and email jobs.
- Required secrets are validated in `src/config/config.ts`.
- `ADMIN_URL` is the preferred env key for the internal UI URL.

### Admin

- Requires `NEXT_PUBLIC_API_URL`.
- Talks only to the Node backend.
- Runs with API rewrites for `/v1/*`.

### Guest app

- Requires `NEXT_PUBLIC_API_URL`.
- Optionally uses `GOOGLE_TRANSLATE_API_KEY` and `IMAGE_PROXY_ALLOWED_HOSTS`.
- Talks only to the Node backend.

## Non-default Codepaths

The following directories are not part of the default active system:

- `infiora-dash-main/infiora-dash-main`
- `infiora-api-main/infiora-api-main`
- `infiora-django-main/infiora-django-main`
- `archive/*`

Treat them as alternative or archived paths until explicitly reactivated by a product/engineering decision.
