# Infiora Django Service — CLAUDE.md

## Stack
- Python, Django REST Framework
- Django Filters + DRF filters (SearchFilter, OrderingFilter)
- JWT authentication

## Purpose
Separate service for user management and authentication. Runs alongside the main Node.js backend.

## App structure (`src/apps/`)
| App | Purpose |
|-----|---------|
| `authentication` | Login, token refresh, JWT handling. Files: `views.py`, `serializers.py`, `urls.py`, `schemas.py` |
| `users` | User CRUD. `UserViewSet` with full CRUD + filtering. Pagination via `StandardResultsSetPagination` |
| `common` | Shared utilities — `pagination.py` and other helpers |

## Key patterns
- Views use `ModelViewSet` or `generics` class-based views
- All views use `StandardResultsSetPagination` from `apps.common.pagination`
- Filtering via `DjangoFilterBackend`, `SearchFilter`, `OrderingFilter`
- API schemas documented in `schemas_simple.py` per app

## Running
See `docker-compose.yml` / `docker-compose.prod.yml`. Uses `Makefile` for common operations.
