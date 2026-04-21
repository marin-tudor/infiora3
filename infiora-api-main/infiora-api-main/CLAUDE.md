# Infiora API (.NET) — CLAUDE.md

## Stack
- C# / ASP.NET Core (`.NET`)
- Clean Architecture: `Api` → `Application` → `Domain` → `Infrastructure`

## Layer structure (`src/`)
| Layer | Purpose |
|-------|---------|
| `Api/` | Controllers, DTOs, Middleware, Exceptions, Extensions |
| `Application/` | Business logic, use cases, interfaces |
| `Domain/` | Entities, domain logic |
| `Infrastructure/` | Database access, external services |

## Controllers (`src/Api/Controllers/`)
| Controller | Purpose |
|-----------|---------|
| `AuthController.cs` | Authentication endpoints |
| `HealthController.cs` | Health check endpoint |
| `BaseApiController.cs` | Base class with shared behavior |

## Notes
- See `appsettings.json` / `appsettings.Development.json` for configuration
- API docs in `docs/` folder
- Docker setup via `docker-compose.yml`
