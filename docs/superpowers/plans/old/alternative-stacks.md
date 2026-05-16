# Alternative Stacks and Archives

These paths remain in the repository for reference, migration support, or manual review, but they are not part of the default active system:

| Path | Status | Reason |
| --- | --- | --- |
| `infiora-dash-main/infiora-dash-main` | Non-authoritative | Contains useful operations features, but still carries template/fake-db/demo surface and a separate auth model |
| `infiora-api-main/infiora-api-main` | Alternative backend | .NET API with separate persistence/auth assumptions |
| `infiora-django-main/infiora-django-main` | Alternative backend | Django API with separate security/runtime assumptions |
| `archive/legacy-app-main-before` | Archived | Old guest-app copy |
| `archive/legacy-static-frontend-frotnend` | Archived | Static marketing/content snapshot |
| `archive/legacy-static-frontend-frbezanimacija` | Archived | Static marketing/content snapshot |
| `archive/root-static-pages` | Archived | Loose root HTML snapshots |

Rules:

- Do not deploy these by default.
- Do not point root scripts at these paths.
- If one of them becomes active again, update `README.md`, `docs/active-system.md`, and the root scripts in the same change.
