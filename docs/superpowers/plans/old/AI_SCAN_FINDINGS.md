# Infiora Scan Findings: Bugs, Risks, And Security Issues

Comparison date: 2026-05-08

Old deployed baseline: `C:\Users\Tudor\infiora 27022026`

New AI-assisted codebase: `C:\Users\Tudor\infiora`

This file lists issues found while comparing the old deployed code against the new code. These are separate from the feature inventory and should be reviewed/fixed before production deployment.

## Critical

### 1. Real `.env` files exist in the working tree

Where:

- `infiora-admin-main\infiora-admin-main\.env`
- `infiora-app-main\infiora-app-main\.env`
- `infiora-backend-main\infiora-backend-main\.env`
- `infiora-dash-main\infiora-dash-main\.env`
- `archive\legacy-app-main-before\infiora-app-main\.env`

Problem:

Environment files can contain secrets, API URLs, SMTP credentials, JWT secrets, cookie secrets, or database URLs. Even if some are local-only, they should not be committed or shared as source.

Recommended fix:

- Move real values to local machine/deployment secret storage.
- Keep only `.env.example` in the repository.
- Add `.env` patterns to all relevant `.gitignore` files.
- Rotate any secrets that were committed or shared.

### 2. Old `infiora-main` app is absent from the new active root

Where:

- Old: `C:\Users\Tudor\infiora 27022026\infiora-main\infiora-main`
- New: no active `C:\Users\Tudor\infiora\infiora-main`

Problem:

The old deployed folder contains a full Vite/Supabase application. The new root does not include it as an active app. If production still depends on that project, the new codebase may be missing an application or deployment target.

Recommended fix:

- Confirm whether `infiora-main` is intentionally replaced by the new Next/Node/Dashboard structure.
- If yes, document the migration and deployment mapping.
- If no, restore or migrate the missing app before deployment.

## High

### 3. Mojibake/encoding corruption appears in new TypeScript/TSX files

Where examples:

- `infiora-app-main\infiora-app-main\src\views\orders\GuestOrderPage.tsx`
- `infiora-app-main\infiora-app-main\src\views\bookings\GuestBookingsBrowsePage.tsx`
- `infiora-app-main\infiora-app-main\src\views\status\GuestStatusLookupPage.tsx`
- `infiora-app-main\infiora-app-main\src\views\rooms\details\components\RoomView.tsx`
- `infiora-backend-main\infiora-backend-main\src\modules\orders\orders.controller.ts`
- `infiora-backend-main\infiora-backend-main\src\routes\v1\orders.route.ts`
- `infiora-dash-main\infiora-dash-main\src\views\bookings\pages\BookingsPage.tsx`

Problem:

Several files display corrupted characters such as `â‚¬`, `â€”`, `đź`, `â†`, `Â·`, and box-drawing comment artifacts. This will show broken symbols in the UI and makes source comments hard to read.

Recommended fix:

- Re-save affected files as UTF-8.
- Replace corrupted symbols with valid text or ASCII fallbacks.
- Run a repository-wide search for common mojibake markers: `â`, `Â`, `đź`, `Ă`.
- Add an editorconfig/formatting check if possible.

### 4. Public guest endpoints depend heavily on rate limiting and proof checks

Where:

- `infiora-backend-main\infiora-backend-main\src\routes\v1\orders.route.ts`
- `src\routes\v1\booking.route.ts`
- `src\routes\v1\housekeeping.route.ts`
- `src\routes\v1\maintenance.route.ts`

Problem:

Several endpoints intentionally allow unauthenticated guest access. This is valid for QR/public flows, but it raises abuse risk if rate limits or proof checks are misconfigured.

Examples:

- Public order placement: `POST /v1/orders/rooms/:roomId`
- Public booking creation: `POST /v1/hotels/:hotelId/bookings`
- Public housekeeping create: `POST /v1/housekeeping`
- Public maintenance create: `POST /v1/maintenance`

Recommended fix:

- Keep rate limiters enabled in production.
- Verify `trust proxy` configuration if deployed behind a proxy/load balancer, otherwise IP-based rate limiting can be inaccurate.
- Consider CAPTCHA/Turnstile for high-abuse deployments.
- Ensure reservation-code/table-PIN enforcement is enabled for hotels that require proof.

### 5. Guest booking time-slot endpoint is public and may expose availability data

Where:

- `infiora-backend-main\infiora-backend-main\src\routes\v1\booking.route.ts`
- Route: `GET /v1/hotels/:hotelId/bookings/timeslots`

Problem:

The endpoint is public with a guest read rate limiter. It returns slot availability for a hotel/item. This is probably intentional for guest booking, but it exposes operational availability data to anyone with hotel/item IDs.

Recommended fix:

- Confirm this is acceptable business behavior.
- Restrict output to only fields needed by the guest app.
- Consider requiring `roomId` or public room context for guest slot lookup.
- Keep admin-only fields out of the response.

### 6. Guest booking browse page gets `hotelId` from public room API

Where:

- `infiora-app-main\infiora-app-main\src\views\bookings\GuestBookingsBrowsePage.tsx`
- `infiora-app-main\infiora-app-main\src\views\orders\GuestOrderPage.tsx`

Problem:

The guest app fetches `/v1/rooms/:roomId`, extracts `hotel.id`, then calls hotel-scoped booking endpoints. This couples public guest flows to exposed internal IDs.

Recommended fix:

- Prefer room-scoped public endpoints such as `/v1/bookings/rooms/:roomId/...`.
- If hotel IDs are intentionally public, document that assumption.

## Medium

### 7. Python `__pycache__` files are present in the Django source tree

Where:

- `infiora-django-main\infiora-django-main\src\__pycache__`
- `infiora-django-main\infiora-django-main\src\apps\...\__pycache__`
- `infiora-django-main\infiora-django-main\src\core\...\__pycache__`

Problem:

Compiled Python cache files are runtime artifacts and should not be part of source control or code reviews. They also inflate diffs and make comparisons noisy.

Recommended fix:

- Delete `__pycache__` folders.
- Ensure `__pycache__/` and `*.pyc` are ignored.

### 8. Build/runtime artifacts are present in active app folders

Where examples:

- `infiora-dash-main\infiora-dash-main\.next`
- `infiora-backend-main\infiora-backend-main\dist`
- `infiora-backend-main\infiora-backend-main\logs`
- `infiora-app-main\infiora-app-main\app-dev.log`
- `infiora-dash-main\infiora-dash-main\dash-dev.log`
- `infiora-backend-main\infiora-backend-main\backend-dev.log`

Problem:

Generated output and logs should not be reviewed as source changes and should not be deployed accidentally as authored code.

Recommended fix:

- Keep these ignored.
- Clean them before handoff or commit.
- Confirm build artifacts are generated by CI/deployment, not copied from local machines.

### 9. Source files contain comments with corrupted Unicode separators

Where:

- `infiora-backend-main\infiora-backend-main\src\modules\orders\orders.controller.ts`
- `infiora-backend-main\infiora-backend-main\src\routes\v1\orders.route.ts`
- `infiora-app-main\infiora-app-main\src\views\orders\GuestOrderPage.tsx`

Problem:

Large decorative comments appear corrupted. This does not usually break runtime, but it damages maintainability and can indicate broader encoding handling problems.

Recommended fix:

- Replace decorative comment blocks with simple ASCII comments.
- Avoid box-drawing characters in source comments.

### 10. Public image proxy must be monitored as SSRF-sensitive code

Where:

- `infiora-app-main\infiora-app-main\src\app\api\image-proxy\route.ts`

Problem:

The image proxy is implemented with allowlisted hosts, protocol checks, content-type checks, max size, timeout, and no redirects, which is good. However, any server-side URL fetcher is SSRF-sensitive and must stay tightly controlled.

Recommended fix:

- Keep `IMAGE_PROXY_ALLOWED_HOSTS` minimal.
- Do not allow arbitrary user-provided hosts.
- Consider blocking private/reserved IP ranges if hostnames can be configured by admins.
- Add tests for disallowed hosts, redirects, oversized images, and non-image content.

### 11. Some dashboard code still uses browser `alert` and `window.confirm`

Where examples:

- `infiora-dash-main\infiora-dash-main\src\views\bookings\pages\BookingsPage.tsx`
- `infiora-dash-main\infiora-dash-main\src\views\staff\pages\StaffPage.tsx`
- `infiora-dash-main\infiora-dash-main\src\views\staff\pages\DispatchRulesPage.tsx`

Problem:

Native browser dialogs are functional but inconsistent with the MUI dashboard UX and are harder to internationalize/test.

Recommended fix:

- Replace with MUI confirmation dialogs and toast notifications.

### 12. Feature flags can hide UI, but backend must also enforce entitlements

Where:

- Dashboard pages use `FeatureLocked`.
- Backend hotel feature fields are in `infiora-backend-main\infiora-backend-main\src\modules\hotel`.

Problem:

UI feature locks prevent normal dashboard access, but backend routes should also enforce premium/module entitlements for protected paid modules. Otherwise a user with API access could call endpoints directly.

Recommended fix:

- Add backend entitlement middleware or service checks for orders, bookings, housekeeping, maintenance, staff RBAC, smart dispatching, and analytics endpoints.
- Keep UI locking as a convenience, not the only control.

## Low

### 13. Root contains temporary payload files

Where:

- `tmp_room_payload.json`
- `tmp_room_payload_after.json`

Problem:

Temporary JSON files may contain room/hotel payload data and are not source features.

Recommended fix:

- Move to `archive` or delete if no longer needed.
- Ensure temporary files are ignored.

### 14. Multiple framework stacks now coexist

Where:

- Next guest app
- Next dashboard
- Next admin app
- Node/Express backend
- .NET API
- Django API
- Archived/static frontend assets

Problem:

The codebase is operationally complex. Developers need clear service ownership and deployment mapping to avoid deploying the wrong app or missing a dependency.

Recommended fix:

- Maintain a single "active system" deployment document.
- Document ports, env vars, build commands, and production hosts per service.
- Clarify which apps are legacy, active, or experimental.

### 15. Root Git status shows many deleted legacy paths and untracked additions

Where:

- Root repository `C:\Users\Tudor\infiora`

Problem:

The current worktree contains many deleted legacy paths and many untracked files. This increases risk of accidentally committing unrelated artifacts or missing required new files.

Recommended fix:

- Review `git status --short` before handoff.
- Stage only intentional source/docs changes.
- Keep archive moves explicit.

## Suggested Verification Before Deployment

1. Run backend unit tests for `infiora-backend-main\infiora-backend-main`.
2. Run TypeScript builds for `infiora-app-main\infiora-app-main` and `infiora-dash-main\infiora-dash-main`.
3. Run dashboard and guest app E2E tests from the root Playwright setup.
4. Manually test public QR room page, order flow, booking flow, housekeeping request, maintenance request, and guest status link.
5. Test staff PIN login, tablet order acceptance, SSE notifications, and dispatch routing.
6. Review all `.env` files and rotate any shared secrets.
7. Fix mojibake before UI review or production release.

