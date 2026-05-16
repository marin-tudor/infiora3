# Infiora Full Project Audit and Upgrade Plan

## 0. Executive Summary

Overall project health score: 4/10

Security score: 2/10

Maintainability score: 3/10

Scalability score: 4/10

Product readiness score: 4/10

Biggest risks:

- The dashboard authentication layer can be forged through the NextAuth credentials provider because it trusts client-provided user JSON.
- The guest application exposes a server-side image proxy that can fetch arbitrary URLs, creating SSRF and open proxy risk.
- Several guest and staff operational routes are public or insufficiently scoped, including booking cancellation, maintenance status updates, housekeeping status updates, and guest booking listings.
- Secrets, default secrets, `.env` files, local setup credentials, uploaded user content, and generated/vendor files are committed or insufficiently ignored.
- The codebase has multiple competing backends, multiple frontend apps, duplicate legacy folders, committed `node_modules`, and inconsistent authentication/session models.

Biggest opportunities:

- Consolidate the product around one authoritative backend and one dashboard/admin surface.
- Convert the current hotel/guest/order/booking system into a stronger hospitality operating platform with secure guest self-service, staff workflows, analytics, automation, and upsell modules.
- Add a security baseline that future agents cannot accidentally bypass: tested auth, ownership middleware, env validation, rate limits, upload validation, CSRF protection, and CI checks.
- Improve user trust with audit logs, clearer reservation verification, operational status timelines, better empty/error states, and reliable guest order/booking tracking.

Recommended first action:

- Start with Wave 1 and fix only the authentication, authorization, SSRF, upload, secret, and public route issues before adding product features.

## 1. Repository Scan Coverage

Total folders reviewed: 489 non-vendor/build folders were inventoried.

Total files reviewed: 1605 non-vendor/build files were inventoried. High-risk source, config, route, model, service, auth, environment, script, and documentation files were inspected directly. Vendor/build/generated trees were identified and sampled where relevant but not line-reviewed.

Main technologies detected:

- TypeScript
- JavaScript
- React
- Next.js
- Node.js
- Express
- MongoDB
- Mongoose
- Redux Toolkit Query
- NextAuth
- Prisma
- SQLite
- Django
- Django REST Framework
- PostgreSQL configuration
- .NET 8
- ASP.NET Core
- Entity Framework Core
- Docker
- Tailwind CSS
- MUI
- Sass

Frameworks detected:

- `infiora-backend-main/infiora-backend-main`: Express/Mongoose API.
- `infiora-dash-main/infiora-dash-main`: Next.js App Router dashboard.
- `infiora-admin-main/infiora-admin-main`: Next.js Pages Router admin.
- `infiora-app-main/infiora-app-main`: Next.js guest app.
- `infiora-django-main/infiora-django-main`: Django/DRF backend scaffold.
- `infiora-api-main`: ASP.NET Core API scaffold.
- `app main before`, `frbezanimacija`, `frotnend`, root HTML files: legacy/static/frontend copies.

Database, auth, payment, storage, email, AI integrations detected:

- MongoDB via Mongoose in the main Node backend.
- Prisma/SQLite for NextAuth in the dashboard.
- Django ORM/PostgreSQL configuration in the Django backend.
- EF Core InMemory/PostgreSQL configuration in the .NET API.
- Cookie/JWT auth in the Node backend.
- NextAuth in the dashboard.
- JWT/refresh token auth in the .NET API.
- SimpleJWT in the Django backend.
- AWS S3 utility code in the Node backend.
- SMTP/Nodemailer style email configuration in the Node backend.
- Google Translate API proxy in the guest app.
- No production-grade payment gateway integration was found for order checkout.

Important config files reviewed:

- `.gitignore`
- `package.json` files across frontend/backend apps
- `yarn.lock`, `package-lock.json` presence across apps
- `.env` and `.env.example` files across apps
- `next.config.mjs`, `next.config.js`
- `tsconfig.json`
- `Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml`
- `appsettings.json`, `appsettings.Development.json`
- Django `settings/base.py`, `dev.py`, `staging.py`, `prod.py`
- backend `src/config/config.ts`, `src/config/roles.ts`
- route, controller, service, model, middleware, and auth files in the main Node backend
- dashboard auth, API, Redux, Prisma, and view files
- guest app API proxy, translation, room, order, blog, and tracking files
- admin app auth guard, login, API, and rewrite config
- root local setup and seed scripts
- prior docs including `FULL_DEEP_SCAN_AUDIT.md`, `ORDERS_HARDENING_NOTES.md`, and superpowers planning files

Files or folders that could not be fully inspected:

- `.git/objects` and binary Git internals were not line-reviewed.
- Committed `node_modules` folders were inventoried as repository hygiene risks, but package source was not line-reviewed.
- Generated/build outputs such as `.next`, `dist`, `build`, `coverage`, `bin`, `obj`, `tsconfig.tsbuildinfo`, and caches were excluded from direct line review.
- Binary media, PDFs, images, and uploaded files were inventoried by path and presence, but their binary contents were not semantically audited.
- The working tree is dirty. Existing modifications and untracked planning files were treated as user/workspace state and were not reverted.

## 2. Critical Findings Overview

| ID | Priority | Category | File/Area | Short Description | Suggested Wave |
|---|---|---|---|---|---|
| INF-AUDIT-001 | P0 | Auth | Dashboard NextAuth | Credentials provider trusts client JSON and allows forged sessions. | Wave 1 |
| INF-AUDIT-002 | P0 | Security | Guest image proxy | Public server-side proxy fetches arbitrary URLs. | Wave 1 |
| INF-AUDIT-003 | P0 | API | Booking cancellation | Public booking cancel route has no guest token or ownership proof. | Wave 1 |
| INF-AUDIT-004 | P0 | Security | Secrets and git hygiene | `.env`, default secrets, local passwords, uploads, and weak `.gitignore` create exposure risk. | Wave 1 |
| INF-AUDIT-005 | P0 | Auth | Cookie auth and CSRF | Cookie auth lacks explicit SameSite/CSRF controls while CORS credentials are enabled. | Wave 1 |
| INF-AUDIT-006 | P0 | Security | File uploads | Upload middleware accepts all file types using original filenames and serves uploads statically. | Wave 1 |
| INF-AUDIT-007 | P0 | Authorization | Maintenance/housekeeping status | Authenticated users can update issue status without hotel ownership checks. | Wave 1 |
| INF-AUDIT-008 | P1 | Auth | Passport JWT strategy | Bearer token extraction is effectively disabled by a function truthiness bug. | Wave 1 |
| INF-AUDIT-009 | P1 | Database/API | Booking hotel scoping | Booking service does not consistently verify item, room, slot, and booking hotel ownership. | Wave 1 |
| INF-AUDIT-010 | P1 | Privacy | Guest bookings | Public guest booking listing can leak booking and guest metadata. | Wave 1 |
| INF-AUDIT-011 | P1 | Security | Translation API | Public Google Translate proxy lacks auth, rate limits, and size caps. | Wave 1 |
| INF-AUDIT-012 | P1 | Authorization | Device/staff routes | Device and staff token scope is not consistently tied to route hotel/group IDs. | Wave 1 |
| INF-AUDIT-013 | P1 | Authorization | Role model | Manager role and ownership middleware are too broad and can cross tenant boundaries. | Wave 1 |
| INF-AUDIT-014 | P1 | Security | `/v1/config` | Unauthenticated config file exposure route exists in the backend. | Wave 1 |
| INF-AUDIT-015 | P1 | Product Flow | Auth endpoints | Frontends and backend disagree on verify, reset, logout, refresh, and token flows. | Wave 2 |
| INF-AUDIT-016 | P1 | Architecture | Multi-backend drift | Node, Django, .NET, admin, dashboard, and guest apps have divergent auth/data assumptions. | Wave 3 |
| INF-AUDIT-017 | P1 | Security | Abuse controls | Public guest/order/booking/contact/NPS routes lack systematic rate limiting. | Wave 1 |
| INF-AUDIT-018 | P1 | Security | NPS tokens | NPS defaults to a forgeable secret and sends email/token data in query strings. | Wave 1 |
| INF-AUDIT-019 | P1 | Privacy | Uploaded content | User/dev upload content is committed and publicly served by local backend. | Wave 1 |
| INF-AUDIT-020 | P1 | Deployment | Production defaults | Django, .NET, Docker, CORS, DB, JWT, and Sentry defaults are unsafe if misdeployed. | Wave 1 |

## 3. Full Findings, Sorted by Priority

## Finding ID: INF-AUDIT-001

**Priority:** P0 - Critical  
**Category:** Auth  
**Affected File(s):**
- `infiora-dash-main/infiora-dash-main/src/libs/auth.ts`
- `infiora-dash-main/infiora-dash-main/src/views/Login.tsx`
- `infiora-dash-main/infiora-dash-main/src/app/api/auth/[...nextauth]/route.ts`

**Affected Area:** Dashboard session creation

**Problem:**  
The NextAuth credentials provider accepts a serialized `data` payload from the client and returns it as the authenticated user when it contains an `id` and `email`. It does not call the backend, verify a JWT, verify backend cookies, or check a password server-side.

**Why It Matters:**  
Any caller who can reach the credentials callback can forge a dashboard session with arbitrary user fields.

**Risk If Ignored:**  
Dashboard authentication can be bypassed, leading to unauthorized access to hotel, guest, order, booking, analytics, or admin-like UI depending on what the dashboard exposes.

**Suggested Fix:**  
Remove client-trusted credentials authorization. Make NextAuth authorize by calling the backend login endpoint server-side, forwarding and validating backend cookies or JWTs, and deriving the session only from a verified backend identity. Add tests that prove arbitrary credentials payloads are rejected.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
The existing `Login.tsx` flow logs into the backend first and then passes returned user data to NextAuth. That is not sufficient because the NextAuth endpoint remains directly callable.

## Finding ID: INF-AUDIT-002

**Priority:** P0 - Critical  
**Category:** Security  
**Affected File(s):**
- `infiora-app-main/infiora-app-main/src/app/api/image-proxy/route.ts`
- `infiora-app-main/infiora-app-main/next.config.mjs`

**Affected Area:** Guest app image proxy

**Problem:**  
The image proxy accepts an arbitrary URL, fetches it server-side, and returns arbitrary content with permissive CORS. There is no hostname allowlist, private IP blocking, content-type allowlist, response size cap, redirect policy, or abuse limit.

**Why It Matters:**  
This is an SSRF and open proxy primitive. It can be used to scan internal networks, reach metadata endpoints, proxy abusive traffic, or consume server resources.

**Risk If Ignored:**  
Production infrastructure and private services may be exposed through the app server. The service can also be abused for bandwidth and reputation damage.

**Suggested Fix:**  
Disable the proxy unless it is absolutely required. If required, allowlist known CDN/S3/image hosts, block private/link-local/localhost ranges, enforce image MIME types, cap content length, limit redirects, cache safely, and rate limit.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
The guest app also permits broad remote image patterns, which should be tightened at the same time.

## Finding ID: INF-AUDIT-003

**Priority:** P0 - Critical  
**Category:** API  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/routes/v1/booking.route.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/booking/booking.controller.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/booking/booking.service.ts`

**Affected Area:** Guest booking cancellation

**Problem:**  
`PATCH /bookings/:bookingId/cancel` is public and cancels by booking ID only. It does not require a guest cancellation token, email verification, reservation code, signed link, room context, or hotel ownership proof.

**Why It Matters:**  
Booking IDs can leak through logs, URLs, browser history, support messages, or public guest booking listings.

**Risk If Ignored:**  
Anyone who obtains or guesses a booking ID can cancel another guest's booking and release capacity.

**Suggested Fix:**  
Require a signed cancellation token generated at booking creation, or require authenticated hotel ownership for staff cancellation. Make cancellation atomic with a status precondition and verify the booking belongs to the route hotel when a hotel route is used.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
Guest cancellation should be separate from hotel/staff cancellation and have a narrow, revocable proof.

## Finding ID: INF-AUDIT-004

**Priority:** P0 - Critical  
**Category:** Security  
**Affected File(s):**
- `.gitignore`
- `infiora-backend-main/infiora-backend-main/.env`
- `infiora-dash-main/infiora-dash-main/.env`
- `infiora-app-main/infiora-app-main/.env`
- `app main before/app main before/.env`
- `infiora-admin-main/infiora-admin-main/.env`
- `infiora-api-main/appsettings.json`
- `infiora-api-main/appsettings.Development.json`
- `infiora-django-main/infiora-django-main/src/core/settings/base.py`
- `seed.js`
- `start-infiora-all.bat`

**Affected Area:** Secrets, local credentials, and repository hygiene

**Problem:**  
The root `.gitignore` only ignores `.worktrees/`. Multiple `.env` files, local JWT/NextAuth/cookie secrets, SMTP-style values, default appsettings secrets, Django fallback secrets, local test passwords, and path-specific startup scripts are present in the repository.

**Why It Matters:**  
Committed secrets and weak default secrets often get copied into staging or production. A weak ignore file also makes it easy to commit future secrets, uploads, database files, and build artifacts.

**Risk If Ignored:**  
Credentials may leak, deployments may accidentally reuse local secrets, and future agents may commit sensitive data.

**Suggested Fix:**  
Rotate every secret that may have been committed. Replace committed `.env` files with `.env.example`. Expand `.gitignore` for env files, uploads, logs, DB files, build outputs, caches, and `node_modules`. Add startup checks that reject known placeholder secrets outside local development.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
Even placeholder-looking secrets should be treated as compromised once committed.

## Finding ID: INF-AUDIT-005

**Priority:** P0 - Critical  
**Category:** Auth  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/app.ts`
- `infiora-backend-main/infiora-backend-main/src/config/config.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/auth/auth.controller.ts`

**Affected Area:** Cookie-based authentication

**Problem:**  
The backend sets signed HTTP-only access and refresh token cookies, but cookie options do not explicitly set `sameSite`, max age, domain, or path. CORS is configured with credentials. No CSRF protection or double-submit token pattern was found for state-changing routes.

**Why It Matters:**  
HTTP-only cookies protect against direct JavaScript token theft but do not automatically protect state-changing requests from CSRF.

**Risk If Ignored:**  
Authenticated users can be tricked into performing unwanted actions if browser cookies are sent cross-site.

**Suggested Fix:**  
Set explicit cookie policies, preferably `SameSite=Lax` or `Strict` where compatible. Add CSRF protection for cookie-auth state changes, document local/prod cookie differences, and test cross-origin credential behavior.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
If cross-site dashboard/app deployments require cookies, use a deliberate CSRF token design rather than relying on default browser behavior.

## Finding ID: INF-AUDIT-006

**Priority:** P0 - Critical  
**Category:** Security  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/utils/multerUpload.ts`
- `infiora-backend-main/infiora-backend-main/src/app.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/utils/awsS3Utils.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/routes/v1/maintenance.route.ts`

**Affected Area:** Upload handling and static file serving

**Problem:**  
The upload middleware writes files using `file.originalname`, accepts all file types, has no central size/type validation, and the backend serves `/uploads` statically. Some later checks occur after the file is already written.

**Why It Matters:**  
File upload is a high-risk boundary. Original filenames can collide or contain unsafe names, arbitrary files can be stored, and publicly served upload directories increase exposure.

**Risk If Ignored:**  
Attackers may upload malicious content, overwrite/collide files, fill disk, expose PII, or abuse the server as file hosting.

**Suggested Fix:**  
Generate safe random filenames, reject by MIME and extension before persistence where possible, enforce size limits, store outside the web root, remove temp files on validation failure, scan if needed, and serve only through authorized or signed URLs.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
S3 upload code should enforce the same validation instead of relying on callers.

## Finding ID: INF-AUDIT-007

**Priority:** P0 - Critical  
**Category:** Authorization  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/routes/v1/maintenance.route.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/maintenance/maintenance.controller.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/routes/v1/housekeeping.route.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/housekeeping/housekeeping.controller.ts`

**Affected Area:** Operational issue status updates

**Problem:**  
Status update routes for maintenance and housekeeping require authentication but do not enforce hotel ownership or staff scope for the issue being modified.

**Why It Matters:**  
Any authenticated account may be able to update issue status if it can obtain an issue ID.

**Risk If Ignored:**  
Cross-hotel tampering can corrupt operational workflows, hide unresolved maintenance problems, and damage guest trust.

**Suggested Fix:**  
Load the issue, verify its hotel belongs to the authenticated user/manager/staff token, and only then update status. Add tests for cross-hotel denial.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
The check should live in a shared ownership helper to prevent route-by-route drift.

## Finding ID: INF-AUDIT-008

**Priority:** P1 - High  
**Category:** Auth  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/auth/passport.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/middleware/auth.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/middleware/staffAuth.ts`

**Affected Area:** JWT extraction

**Problem:**  
The Passport JWT strategy sets `jwtFromRequest` using `cookieExtractor || ExtractJwt.fromAuthHeaderAsBearerToken()`. Because `cookieExtractor` is a function and therefore always truthy, the bearer token extractor is never used.

**Why It Matters:**  
Routes, clients, or tools that rely on `Authorization: Bearer` for the main auth strategy will fail silently or behave inconsistently with staff/device token flows.

**Risk If Ignored:**  
Authentication behavior remains inconsistent, future API clients break, and agents may add bearer-token code that never works.

**Suggested Fix:**  
Use `ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()])`. Add tests for signed cookie auth and bearer header auth.

**Estimated Difficulty:** Easy

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
This is a small code fix with high reliability impact.

## Finding ID: INF-AUDIT-009

**Priority:** P1 - High  
**Category:** Database  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/booking/booking.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/booking/booking.controller.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/booking/booking.model.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/routes/v1/booking.route.ts`

**Affected Area:** Booking hotel ownership and data integrity

**Problem:**  
Booking creation checks that an item exists but does not consistently verify that the item, room, hotel, slot, and booking all belong to the same hotel. Block/unblock and owner cancellation routes verify ownership of a route hotel but then operate by slot or booking ID without checking the target belongs to that hotel.

**Why It Matters:**  
Public or authenticated callers can create or modify records that cross tenant boundaries if they know IDs.

**Risk If Ignored:**  
Capacity, bookings, and guest data can become corrupted across hotels.

**Suggested Fix:**  
Enforce hotel consistency in every booking service method. Query by both object ID and hotel ID, or join/populate and reject mismatches before mutation. Add compound indexes that match these checks.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
This should be fixed before expanding booking features.

## Finding ID: INF-AUDIT-010

**Priority:** P1 - High  
**Category:** Security  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/booking/booking.controller.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/routes/v1/booking.route.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/booking/booking.model.ts`

**Affected Area:** Guest booking visibility

**Problem:**  
The public guest booking listing by hotel and room can return booking documents for a room. Booking documents include guest metadata such as email, room number, party size, notes, and status unless explicitly projected away.

**Why It Matters:**  
Guest booking data is personal and operationally sensitive.

**Risk If Ignored:**  
Anyone who knows a room ID may enumerate future bookings and guest details.

**Suggested Fix:**  
Return only availability-safe fields needed by the guest UI, or require a room-scoped signed token. Never return guest PII from public availability endpoints.

**Estimated Difficulty:** Easy

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
Availability and guest booking management should be separate endpoints.

## Finding ID: INF-AUDIT-011

**Priority:** P1 - High  
**Category:** Security  
**Affected File(s):**
- `infiora-app-main/infiora-app-main/src/app/api/translate/route.ts`

**Affected Area:** Translation proxy

**Problem:**  
The guest app exposes an unauthenticated Google Translate proxy that accepts arbitrary text arrays and target languages. It lacks rate limits, input size caps, language allowlists, abuse controls, and caching.

**Why It Matters:**  
This can be used to burn paid API quota, degrade app performance, or proxy arbitrary user content through a paid service.

**Risk If Ignored:**  
Unexpected API bills, service throttling, and unreliable guest translations.

**Suggested Fix:**  
Add rate limiting, payload limits, target language validation, caching by normalized content/language, and preferably move translation generation to an authenticated admin/backend workflow.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** Yes

**Notes:**  
Human decision needed on whether guest-time live translation is a product requirement or whether precomputed translations are acceptable.

## Finding ID: INF-AUDIT-012

**Priority:** P1 - High  
**Category:** Authorization  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/routes/v1/orders.route.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/middleware/staffAuth.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.controller.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.service.ts`

**Affected Area:** Device, tablet, staff, and group-scoped order routes

**Problem:**  
Some staff/device routes verify token type and hotel ID but do not consistently verify that route `hotelId` or `groupId` belongs to the token's hotel and permissions. The SSE group events route adds clients by `groupId` after token verification without an obvious group-to-hotel ownership check.

**Why It Matters:**  
Device and staff tokens are often deployed on shared tablets and long-lived screens. Their scope must be narrow and enforced server-side.

**Risk If Ignored:**  
A token for one hotel or group may receive or affect another hotel's order stream if IDs are known.

**Suggested Fix:**  
For every staff/device endpoint, compare route hotel/group IDs to token claims and database ownership. Add deny-by-default middleware and tests for cross-hotel/group access.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
Do not rely on frontend routing to isolate tablets.

## Finding ID: INF-AUDIT-013

**Priority:** P1 - High  
**Category:** Authorization  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/config/roles.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/middleware/custom.middleware.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/routes/v1/hotel.route.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/routes/v1/user.route.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/routes/v1/tag.route.ts`

**Affected Area:** Role and ownership model

**Problem:**  
The `manager` role has broad rights similar to admin, and `isOwner` allows any manager to pass regardless of route/query ownership. Some routes combine broad rights with missing per-resource ownership.

**Why It Matters:**  
Multi-tenant hotel systems must distinguish platform admin, hotel owner, hotel manager, staff, and guest scopes.

**Risk If Ignored:**  
Managers may view, mutate, or delete resources outside their assigned hotels.

**Suggested Fix:**  
Redesign roles around platform-level and hotel-level permissions. Replace generic manager bypasses with resource-scoped checks. Add authorization tests for every role/resource pair.

**Estimated Difficulty:** Hard

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** Yes

**Notes:**  
Human decision needed for exact manager capabilities.

## Finding ID: INF-AUDIT-014

**Priority:** P1 - High  
**Category:** Security  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/app.ts`
- `infiora-backend-main/infiora-backend-main/src/keys/config.json`

**Affected Area:** Backend config exposure

**Problem:**  
The backend exposes an unauthenticated `/v1/config` route that reads `./src/keys/config.json` and returns it. If this file exists or is added later with credentials, config will be public.

**Why It Matters:**  
Config files often accumulate secrets, API keys, tenant metadata, or service URLs.

**Risk If Ignored:**  
Sensitive configuration can be leaked by a single file addition.

**Suggested Fix:**  
Remove the route or protect it behind platform-admin authorization. Never return raw config files. If frontend config is needed, expose an explicit safe whitelist.

**Estimated Difficulty:** Easy

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
This is a latent footgun even if the current file is absent or harmless.

## Finding ID: INF-AUDIT-015

**Priority:** P1 - High  
**Category:** Frontend  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/routes/v1/auth.route.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/auth/auth.controller.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/auth/auth.validation.ts`
- `infiora-dash-main/infiora-dash-main/src/redux/api/customFetchBase.ts`
- `infiora-admin-main/infiora-admin-main/src/redux/api/customFetchBase.ts`
- `infiora-app-main/infiora-app-main/src/app/verify-email/page.tsx`
- `infiora-dash-main/infiora-dash-main/src/redux/api/authApi.ts`
- `infiora-admin-main/infiora-admin-main/src/redux/api/authApi.ts`

**Affected Area:** Auth product flow

**Problem:**  
Frontend and backend expectations differ for auth routes. Examples include logout validation expecting a body while controller reads signed cookies, refresh using `GET /refresh-tokens` while docs and common conventions expect POST, verify-email pages using GET/path variants while the backend route uses POST with a query token, and inconsistent reset-token URL shapes.

**Why It Matters:**  
Auth flows are fragile and user-facing. Inconsistent contracts create silent failures and future security regressions.

**Risk If Ignored:**  
Email verification, logout, refresh, and password reset can break across apps or be "fixed" insecurely by future agents.

**Suggested Fix:**  
Define a single auth API contract document. Update backend validation/controllers and every frontend client to match. Add integration tests for login, logout, refresh, forgot password, reset password, and verify email.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 2

**Needs Human Product Decision:** No

**Notes:**  
Use one canonical client helper per frontend to avoid drift.

## Finding ID: INF-AUDIT-016

**Priority:** P1 - High  
**Category:** Architecture  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main`
- `infiora-django-main/infiora-django-main`
- `infiora-api-main`
- `infiora-admin-main/infiora-admin-main`
- `infiora-dash-main/infiora-dash-main`
- `infiora-app-main/infiora-app-main`

**Affected Area:** System architecture

**Problem:**  
The repository contains at least three backend implementations and multiple frontend/admin surfaces with different auth, database, environment, and routing assumptions.

**Why It Matters:**  
Architectural duplication makes it unclear which app is authoritative, increases security review cost, and encourages fixes in the wrong codepath.

**Risk If Ignored:**  
Production behavior will drift from development, agents may patch unused apps, and vulnerabilities will remain in active services.

**Suggested Fix:**  
Declare the authoritative production architecture. Archive or move inactive prototypes out of the deployable repo. If multiple apps remain, document ownership, ports, databases, auth boundaries, and deployment status.

**Estimated Difficulty:** Hard

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** Yes

**Notes:**  
This is a CTO-level product/engineering decision, not only a refactor.

## Finding ID: INF-AUDIT-017

**Priority:** P1 - High  
**Category:** Security  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/app.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/routes/v1/orders.route.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/routes/v1/booking.route.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/routes/v1/maintenance.route.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/routes/v1/housekeeping.route.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/routes/v1/nps.route.ts`
- `infiora-app-main/infiora-app-main/src/app/api/translate/route.ts`

**Affected Area:** Abuse controls

**Problem:**  
Only selected auth routes receive rate limiting, and some limits are production-only. Public guest routes for orders, booking, maintenance, housekeeping, NPS, tracking, translation, and visit analytics lack systematic rate limits and payload quotas.

**Why It Matters:**  
Public hospitality guest endpoints are easy abuse targets because they often require no login.

**Risk If Ignored:**  
Spam orders, spam tickets, quota exhaustion, database growth, noisy analytics, and degraded service.

**Suggested Fix:**  
Add route-specific rate limits by IP, hotel, room, reservation code, visitor ID, and email where appropriate. Use a distributed store for production instead of in-memory limits.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
Limits should be tuned to avoid blocking legitimate hotel guests on shared networks.

## Finding ID: INF-AUDIT-018

**Priority:** P1 - High  
**Category:** Security  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/nps/nps.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/nps/nps.controller.ts`

**Affected Area:** NPS link signing and feedback

**Problem:**  
NPS token generation defaults to `change_me_in_env` if the secret is missing. Rating links place email/token/rating data in query strings. The update path can return success even if no target entity was updated.

**Why It Matters:**  
Signed guest feedback links must not be forgeable or leak personal data through logs, referrers, and analytics.

**Risk If Ignored:**  
Feedback can be spoofed, private emails can leak, and analytics can become untrustworthy.

**Suggested Fix:**  
Make the NPS secret mandatory in all non-test environments, use opaque one-time feedback tokens stored server-side, avoid email in query strings, and verify update results.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
This also improves customer trust and review quality.

## Finding ID: INF-AUDIT-019

**Priority:** P1 - High  
**Category:** Security  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/uploads`
- `infiora-backend-main/infiora-backend-main/src/app.ts`
- `.gitignore`

**Affected Area:** Uploaded content and privacy

**Problem:**  
The repository contains uploaded/dev media under the backend `uploads` tree, and the backend serves `/uploads` statically.

**Why It Matters:**  
Uploaded files can include guest, hotel, operational, or staff data. Committing them increases repo size and creates privacy exposure.

**Risk If Ignored:**  
Private or copyrighted content can be distributed through the repository, and production-like uploads may leak.

**Suggested Fix:**  
Remove committed uploads after confirming they are not needed, add upload paths to `.gitignore`, and use object storage or a controlled local storage folder outside source control.

**Estimated Difficulty:** Easy

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
Do not delete files automatically until the project owner confirms whether any assets are canonical.

## Finding ID: INF-AUDIT-020

**Priority:** P1 - High  
**Category:** Deployment  
**Affected File(s):**
- `infiora-api-main/appsettings.json`
- `infiora-api-main/appsettings.Development.json`
- `infiora-api-main/Program.cs`
- `infiora-api-main/Extensions/ServiceCollectionExtensions.cs`
- `infiora-django-main/infiora-django-main/src/core/settings/base.py`
- `infiora-django-main/infiora-django-main/src/core/settings/dev.py`
- `infiora-django-main/infiora-django-main/src/core/settings/staging.py`
- `infiora-django-main/infiora-django-main/src/core/settings/prod.py`
- `infiora-backend-main/infiora-backend-main/Dockerfile`
- `infiora-backend-main/infiora-backend-main/docker-compose.yml`

**Affected Area:** Deployment defaults

**Problem:**  
The .NET API defaults to InMemory DB and permissive hosts with default JWT secrets. Django defaults to dev settings when environment is absent, has staging `ALLOWED_HOSTS=['*']`, and sends PII to Sentry in prod. The Node Dockerfile uses old Node 14 and Mongo 4.2 compose defaults.

**Why It Matters:**  
Deployment mistakes are common. Unsafe defaults turn configuration omissions into production incidents.

**Risk If Ignored:**  
Data loss, host header risk, weak JWT secrets, debug/staging behavior in production, and unsupported runtime exposure.

**Suggested Fix:**  
Fail fast on missing production env, remove unsafe fallbacks outside local dev, pin supported runtime versions, and create a deployment checklist with CI validation.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
Even inactive services should not contain deployable unsafe defaults in the main repo.

## Finding ID: INF-AUDIT-021

**Priority:** P2 - Medium  
**Category:** Testing  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/**/*.test.ts`
- `infiora-django-main/infiora-django-main/src/apps/authentication/tests.py`
- `infiora-dash-main/infiora-dash-main`
- `infiora-admin-main/infiora-admin-main`
- `infiora-app-main/infiora-app-main`
- `infiora-api-main`

**Affected Area:** Test coverage

**Problem:**  
The Node backend has some tests for auth, users, tokens, pagination, and errors. The Django app has basic auth tests. The critical product flows, frontend auth flows, booking/order ownership checks, SSRF defenses, upload validation, CSRF, and end-to-end guest flows are not covered.

**Why It Matters:**  
The riskiest code lacks regression protection.

**Risk If Ignored:**  
Future agents can reintroduce auth bypasses, cross-hotel bugs, and broken guest flows without detection.

**Suggested Fix:**  
Add security and integration tests first, then frontend E2E tests for login, room view, ordering, booking, issue submission, staff tablet, and dashboard management.

**Estimated Difficulty:** Hard

**Suggested Wave:** Wave 4

**Needs Human Product Decision:** No

**Notes:**  
Test additions should accompany fixes in Wave 1 and Wave 2 where practical.

## Finding ID: INF-AUDIT-022

**Priority:** P2 - Medium  
**Category:** Product  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.model.ts`
- `infiora-app-main/infiora-app-main/src/app/[id]/order/page.tsx`
- `infiora-app-main/infiora-app-main/src/app/[id]/order/GuestOrderPage.tsx`

**Affected Area:** Payment and order lifecycle

**Problem:**  
Order payment appears to be a label/config value rather than a real payment workflow. No payment provider, webhook verification, idempotency key, settlement state, refund handling, or reconciliation logic was found.

**Why It Matters:**  
If the UI suggests online payment, the backend must enforce a real payment state machine.

**Risk If Ignored:**  
Hotels may treat unpaid orders as paid, or guests may see unsupported payment options.

**Suggested Fix:**  
Treat current payment choices as "pay at hotel" unless a real provider is integrated. Add payment-method validation against hotel settings, then design provider-backed payment with signed webhooks and idempotency.

**Estimated Difficulty:** Hard

**Suggested Wave:** Wave 5

**Needs Human Product Decision:** Yes

**Notes:**  
Do not add payment UI polish before product chooses the payment model.

## Finding ID: INF-AUDIT-023

**Priority:** P2 - Medium  
**Category:** Database  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/reservation-code/reservation-code.model.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/staff/staff.service.ts`

**Affected Area:** Reservation codes, PINs, and guest verification

**Problem:**  
Reservation codes have indexes but no obvious unique active-code constraint. Some guest request flows report matched/unmatched but do not reject unmatched reservation codes. PIN/rate-limit logic is in-memory in places and not distributed.

**Why It Matters:**  
Reservation codes and PINs are the lightweight trust boundary for guest and staff actions.

**Risk If Ignored:**  
Duplicate codes, brute force attempts, false guest identity, and inconsistent behavior in multi-instance deployments.

**Suggested Fix:**  
Add scoped unique constraints for active reservation codes, define which flows require a valid code, use distributed rate limiting, and add audit logs for repeated failures.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 2

**Needs Human Product Decision:** Yes

**Notes:**  
Product must decide whether guests can submit service requests without a valid reservation code.

## Finding ID: INF-AUDIT-024

**Priority:** P2 - Medium  
**Category:** Database  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/booking/booking.model.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/booking/booking.service.ts`

**Affected Area:** Booking references and capacity updates

**Problem:**  
Booking references are generated by counting bookings for the day in a pre-save hook. Concurrent creates can generate duplicate references. Cancellation releases capacity after status checks that are not fully atomic against repeat cancellation.

**Why It Matters:**  
Booking systems must handle concurrency and clear references reliably.

**Risk If Ignored:**  
Duplicate references, failed saves under load, inaccurate capacity, or negative capacity counters.

**Suggested Fix:**  
Use an atomic counter or retry-on-duplicate strategy for references. Update cancellation with a status precondition and capacity decrement in a transaction or carefully ordered atomic update.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 2

**Needs Human Product Decision:** No

**Notes:**  
Mongo transactions may require replica set configuration.

## Finding ID: INF-AUDIT-025

**Priority:** P2 - Medium  
**Category:** API  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/room/room.controller.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/link/link.controller.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/hotel/hotel.controller.ts`
- `infiora-app-main/infiora-app-main/src/app/[id]/RoomContext.tsx`

**Affected Area:** Analytics writes and GET side effects

**Problem:**  
Some view/social tracking behavior appears to be triggered by query parameters or public GET-like interactions. The room context creates activity using client-side visitor IDs.

**Why It Matters:**  
GET requests should be safe where possible, and analytics identifiers are easy to forge.

**Risk If Ignored:**  
Caches, crawlers, previews, and malicious visitors can create noisy analytics or unintended writes.

**Suggested Fix:**  
Move tracking writes to explicit POST endpoints with rate limits, bot filtering, and normalized visitor/session handling.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 4

**Needs Human Product Decision:** No

**Notes:**  
Analytics should be useful enough for business decisions, not just easy to increment.

## Finding ID: INF-AUDIT-026

**Priority:** P2 - Medium  
**Category:** Performance  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/booking/booking.controller.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/booking/booking.model.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/orders/order-visit.model.ts`

**Affected Area:** Query bounds and indexes

**Problem:**  
Some analytics and guest-facing queries are unbounded or weakly bounded, and booking/order data lacks enough visible compound indexes for common hotel/time/status queries.

**Why It Matters:**  
Hospitality data grows by hotel, room, guest, order, and day. Unbounded queries become production latency problems.

**Risk If Ignored:**  
Slow dashboards, high database load, timeouts, and noisy production incidents.

**Suggested Fix:**  
Add pagination and date limits to analytics queries. Add indexes for hotel/time/status/item/room access patterns. Add query explain checks for high-volume endpoints.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 4

**Needs Human Product Decision:** No

**Notes:**  
Index changes should be paired with migration/deployment planning.

## Finding ID: INF-AUDIT-027

**Priority:** P2 - Medium  
**Category:** Architecture  
**Affected File(s):**
- `node_modules` folders across `app main before`, `infiora-admin-main`, `infiora-app-main`, `infiora-backend-main`, `infiora-dash-main`
- root app folders
- `.gitignore`
- package manifests and locks across apps

**Affected Area:** Repository structure

**Problem:**  
The repository contains committed dependency trees, duplicate app copies, and no clear workspace/package manager boundary.

**Why It Matters:**  
Large committed vendor trees make audits noisy, slow down repository operations, and hide the real source surface.

**Risk If Ignored:**  
Future dependency upgrades, security scans, and code reviews become unreliable.

**Suggested Fix:**  
Remove committed `node_modules`, use lockfiles only, add root workspace tooling or document independent apps, and enforce repository hygiene through `.gitignore` and CI.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** No

**Notes:**  
Clean this after Wave 1 security fixes so diffs remain reviewable.

## Finding ID: INF-AUDIT-028

**Priority:** P2 - Medium  
**Category:** Frontend  
**Affected File(s):**
- `infiora-dash-main/infiora-dash-main/next.config.mjs`

**Affected Area:** React runtime checks

**Problem:**  
The dashboard disables `reactStrictMode`.

**Why It Matters:**  
Strict mode helps expose unsafe effects, render assumptions, and lifecycle bugs during development.

**Risk If Ignored:**  
State and effect bugs remain hidden until production.

**Suggested Fix:**  
Re-enable Strict Mode after fixing any surfaced double-effect issues.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 4

**Needs Human Product Decision:** No

**Notes:**  
Do this after auth/session cleanup to avoid mixing concerns.

## Finding ID: INF-AUDIT-029

**Priority:** P2 - Medium  
**Category:** Architecture  
**Affected File(s):**
- `infiora-dash-main/infiora-dash-main/tsconfig.json`
- `infiora-app-main/infiora-app-main/tsconfig.json`
- `infiora-admin-main/infiora-admin-main/tsconfig.json`
- frontend source files with `any` and loose API shapes

**Affected Area:** Type safety

**Problem:**  
The frontends use many loose `any` shapes, permissive TypeScript settings, and inconsistent API response types. One app mixes React 18 with React 19 type packages.

**Why It Matters:**  
Type drift hides broken backend/frontend assumptions.

**Risk If Ignored:**  
Runtime errors, broken forms, and silently missing fields will continue after refactors.

**Suggested Fix:**  
Generate or centralize API types, tighten TS settings gradually, remove unnecessary `any`, and align React/runtime type versions.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** No

**Notes:**  
Do not attempt a full type strictness migration in the same PR as security fixes.

## Finding ID: INF-AUDIT-030

**Priority:** P2 - Medium  
**Category:** Security  
**Affected File(s):**
- `infiora-app-main/infiora-app-main/src/app/[id]/BlogDrawer.tsx`

**Affected Area:** Guest blog/content rendering

**Problem:**  
The guest app renders rich content with `dangerouslySetInnerHTML`.

**Why It Matters:**  
Hotel/admin-provided content can become an XSS vector if it is not sanitized before storage or rendering.

**Risk If Ignored:**  
Guest browsers can execute injected scripts, exposing local tracking tokens and guest state.

**Suggested Fix:**  
Sanitize rich HTML on input and output with an allowlist, or replace raw HTML with structured blocks/Markdown rendered through a safe renderer.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 2

**Needs Human Product Decision:** No

**Notes:**  
This pairs with the localStorage token finding.

## Finding ID: INF-AUDIT-031

**Priority:** P2 - Medium  
**Category:** Security  
**Affected File(s):**
- `infiora-app-main/infiora-app-main/src/app/[id]/order/GuestOrderPage.tsx`
- `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.service.ts`

**Affected Area:** Guest order tracking tokens

**Problem:**  
Guest order tracking tokens are stored in `localStorage`. XSS or shared device access can expose them.

**Why It Matters:**  
Tracking tokens gate access to order status and rating flows.

**Risk If Ignored:**  
Guests on shared hotel devices may expose order tokens, and XSS impact increases.

**Suggested Fix:**  
Prefer short-lived, order-specific signed links or HTTP-only cookies where feasible. At minimum, shorten token lifetime, bind tokens to order/room context, and harden against XSS.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 2

**Needs Human Product Decision:** Yes

**Notes:**  
The right design depends on whether guests use personal phones or shared hotel tablets.

## Finding ID: INF-AUDIT-032

**Priority:** P2 - Medium  
**Category:** API  
**Affected File(s):**
- `infiora-dash-main/infiora-dash-main/src/app/api/apps/*`
- `infiora-dash-main/infiora-dash-main/src/app/api/pages/*`
- `infiora-dash-main/infiora-dash-main/src/app/server/actions.ts`

**Affected Area:** Dashboard template/demo APIs

**Problem:**  
The dashboard still contains template/fake-db API routes and server actions from a starter/admin template.

**Why It Matters:**  
Demo routes increase attack surface and confuse future agents about real data sources.

**Risk If Ignored:**  
Users or developers may rely on fake data, and unaudited endpoints may expose sample structures or unintended behavior.

**Suggested Fix:**  
Remove demo APIs from production builds or guard them behind explicit development-only flags.

**Estimated Difficulty:** Easy

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** No

**Notes:**  
Do this after confirming no live pages still depend on template data.

## Finding ID: INF-AUDIT-033

**Priority:** P2 - Medium  
**Category:** Security  
**Affected File(s):**
- `infiora-django-main/infiora-django-main/src/apps/authentication/views.py`
- `infiora-django-main/infiora-django-main/src/core/settings/staging.py`
- `infiora-django-main/infiora-django-main/src/core/settings/prod.py`
- `infiora-django-main/infiora-django-main/src/core/settings/base.py`

**Affected Area:** Django backend hardening

**Problem:**  
The Django backend has auth endpoints without visible rate limiting, staging allows all hosts, production sends default PII to Sentry, and settings include insecure development fallbacks.

**Why It Matters:**  
Even if secondary, this backend is deployable code in the repository.

**Risk If Ignored:**  
If deployed accidentally, it can expose auth abuse, host misconfiguration, and PII leakage.

**Suggested Fix:**  
Add rate limiting, close staging host/CORS policies, disable Sentry PII unless required, and fail production startup on placeholder secrets.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** No

**Notes:**  
If Django is inactive, archive it instead of hardening it.

## Finding ID: INF-AUDIT-034

**Priority:** P2 - Medium  
**Category:** Security  
**Affected File(s):**
- `infiora-api-main/Services/AuthService.cs`
- `infiora-api-main/Services/JwtService.cs`
- `infiora-api-main/appsettings.json`
- `infiora-api-main/Extensions/ServiceCollectionExtensions.cs`

**Affected Area:** .NET API auth and persistence

**Problem:**  
The .NET API stores refresh tokens directly on the user record, defaults to InMemory persistence unless configured, and ships default JWT secret values.

**Why It Matters:**  
Refresh tokens are bearer secrets and InMemory persistence is not production-safe.

**Risk If Ignored:**  
Token theft impact is higher, sessions are fragile, and deployment can lose all data.

**Suggested Fix:**  
Hash refresh tokens, support multiple revocable sessions, remove unsafe defaults outside development, and add migrations/tests if the .NET API remains active.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** Yes

**Notes:**  
The first decision is whether this API is part of the future architecture.

## Finding ID: INF-AUDIT-035

**Priority:** P2 - Medium  
**Category:** Deployment  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/Dockerfile`
- `infiora-backend-main/infiora-backend-main/docker-compose.yml`
- `infiora-backend-main/infiora-backend-main/docker-compose.prod.yml`
- `infiora-api-main/Dockerfile`

**Affected Area:** Runtime versions and container reliability

**Problem:**  
The Node backend Dockerfile uses Node 14, compose uses old Mongo 4.2 defaults, and the .NET Dockerfile healthcheck uses `curl` without clear installation in the runtime image.

**Why It Matters:**  
Unsupported or mismatched runtime environments cause security and reliability issues.

**Risk If Ignored:**  
Security patches may be missing, healthchecks may fail, and local/prod behavior may diverge.

**Suggested Fix:**  
Upgrade Node and Mongo versions after testing, align package engines, and verify container healthchecks in CI.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 4

**Needs Human Product Decision:** No

**Notes:**  
Runtime upgrades can surface dependency issues, so schedule after Wave 1.

## Finding ID: INF-AUDIT-036

**Priority:** P3 - Low  
**Category:** Other  
**Affected File(s):**
- `seed.js`
- `infiora-backend-main/infiora-backend-main/setup-local.mjs`
- frontend and backend files with `console.log` or `console.error`

**Affected Area:** Logging and local scripts

**Problem:**  
Local scripts print credentials and use hard-coded emails/passwords. Some app code logs raw errors.

**Why It Matters:**  
Logs often end up in terminals, CI, support screenshots, or external logging tools.

**Risk If Ignored:**  
Sensitive values and implementation details may leak.

**Suggested Fix:**  
Remove credential printing, use generated dev passwords or documented setup prompts, and standardize sanitized logging.

**Estimated Difficulty:** Easy

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** No

**Notes:**  
The root `seed.js` also uses role `superAdmin`, which does not match the Node backend role enum.

## Finding ID: INF-AUDIT-037

**Priority:** P3 - Low  
**Category:** Maintainability  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/package.json`
- `infiora-admin-main/infiora-admin-main/package.json`
- dashboard/admin template files
- Django Swagger settings

**Affected Area:** Naming and leftover template metadata

**Problem:**  
Several files still contain old project names, boilerplate package names, template code, or unrelated production URLs such as old admin template branding and `fulfillx` Swagger server data.

**Why It Matters:**  
Stale names reduce trust and make deployment ownership unclear.

**Risk If Ignored:**  
Future agents and humans may configure the wrong app or ship inconsistent branding.

**Suggested Fix:**  
Normalize package names, API docs, app titles, and metadata to Infiora.

**Estimated Difficulty:** Easy

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** No

**Notes:**  
This is lower priority than security, but useful before external demos.

## Finding ID: INF-AUDIT-038

**Priority:** P3 - Low  
**Category:** Architecture  
**Affected File(s):**
- `app main before`
- `frbezanimacija`
- `frotnend`
- `ind.html`
- `indexold.html`
- `infiora-website-new.html`
- legal/static docs duplicated across apps

**Affected Area:** Legacy and duplicate frontend content

**Problem:**  
The repo contains legacy app copies, typo-named folders, static HTML marketing variants, and duplicate legal/static content.

**Why It Matters:**  
Duplicate source surfaces confuse audits and create stale public content risk.

**Risk If Ignored:**  
Fixes may be applied to inactive copies, and stale legal/marketing content may be shipped accidentally.

**Suggested Fix:**  
Archive legacy snapshots outside the deployable repo or move them under a clearly labeled `archive/` folder excluded from builds.

**Estimated Difficulty:** Easy

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** Yes

**Notes:**  
Confirm whether any static pages are still used for production marketing.

## Finding ID: INF-AUDIT-039

**Priority:** P3 - Low  
**Category:** Frontend  
**Affected File(s):**
- `infiora-app-main/infiora-app-main/src/app/[id]/page.tsx`

**Affected Area:** Static params and room pages

**Problem:**  
`generateStaticParams` fetches only the first 100 rooms from the API.

**Why It Matters:**  
Hotels or deployments with more than 100 rooms may have missing static paths or inconsistent rendering behavior.

**Risk If Ignored:**  
Some guest room pages may not be pre-rendered or may rely on fallback behavior unexpectedly.

**Suggested Fix:**  
Use dynamic rendering for room pages, paginate all static params, or explicitly disable static generation if room pages are highly dynamic.

**Estimated Difficulty:** Easy

**Suggested Wave:** Wave 4

**Needs Human Product Decision:** No

**Notes:**  
Room availability and hotel active status are dynamic, so fully static generation may not be the best fit.

## Finding ID: INF-AUDIT-040

**Priority:** P3 - Low  
**Category:** UX  
**Affected File(s):**
- `seed.js`
- frontend display strings across apps
- backend local seed/setup scripts

**Affected Area:** Encoding and localization

**Problem:**  
Some files show mojibake such as `â‚¬` and `âś“`, indicating encoding issues in scripts or copied content.

**Why It Matters:**  
Broken currency symbols and characters reduce polish and can confuse hotel operators.

**Risk If Ignored:**  
Incorrect display strings may appear in seeded data or UI.

**Suggested Fix:**  
Normalize files to UTF-8, replace corrupted literals, and add a quick check for common mojibake sequences.

**Estimated Difficulty:** Easy

**Suggested Wave:** Wave 4

**Needs Human Product Decision:** No

**Notes:**  
This is a polish and data-quality cleanup.

## Finding ID: INF-AUDIT-041

**Priority:** P3 - Low  
**Category:** Product  
**Affected File(s):**
- `infiora-app-main/infiora-app-main/src/app/[id]/RoomContext.tsx`
- `infiora-app-main/infiora-app-main/src/components/ActivityTracker.tsx`
- `infiora-backend-main/infiora-backend-main/src/modules/activity/*`
- `infiora-backend-main/infiora-backend-main/src/modules/orders/order-visit.model.ts`

**Affected Area:** Visitor identity and analytics quality

**Problem:**  
Visitor IDs are stored inconsistently in session storage and local storage across guest app flows.

**Why It Matters:**  
Analytics, visit tracking, and personalization need consistent identity semantics.

**Risk If Ignored:**  
Metrics will be noisy and user journeys will be hard to understand.

**Suggested Fix:**  
Define a single anonymous visitor ID strategy with privacy limits, TTL, reset behavior, and consent considerations.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 4

**Needs Human Product Decision:** Yes

**Notes:**  
This can become a product advantage if done well.

## Finding ID: INF-AUDIT-042

**Priority:** P3 - Low  
**Category:** Architecture  
**Affected File(s):**
- `infiora-admin-main/infiora-admin-main`
- `infiora-dash-main/infiora-dash-main`

**Affected Area:** Admin/dashboard split

**Problem:**  
The repo contains two admin-like frontends with different routing, state, auth, UI libraries, and API assumptions.

**Why It Matters:**  
Feature work and security fixes can land in one admin surface while users use the other.

**Risk If Ignored:**  
Product behavior diverges and maintenance cost doubles.

**Suggested Fix:**  
Choose one primary operator dashboard and archive or migrate the other.

**Estimated Difficulty:** Hard

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** Yes

**Notes:**  
The dashboard currently has the higher-risk auth issue, so security must precede consolidation.

## Finding ID: INF-AUDIT-043

**Priority:** P3 - Low  
**Category:** Configuration  
**Affected File(s):**
- frontend `.env` files
- backend `.env.example`
- `infiora-dash-main/infiora-dash-main/src/redux/api/customFetchBase.ts`
- `infiora-app-main/infiora-app-main/src/utils/api.ts`
- admin API config files

**Affected Area:** Environment schema

**Problem:**  
Frontend environment variables are read directly without a shared schema or startup validation.

**Why It Matters:**  
Missing or wrong URLs produce runtime errors that are hard for non-engineers to diagnose.

**Risk If Ignored:**  
Deployments can silently point at local APIs or wrong origins.

**Suggested Fix:**  
Add typed env validation per app and a root documentation table for required variables.

**Estimated Difficulty:** Easy

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** No

**Notes:**  
Do not expose private variables with `NEXT_PUBLIC_`.

## Finding ID: INF-AUDIT-044

**Priority:** P3 - Low  
**Category:** UX  
**Affected File(s):**
- `infiora-app-main/infiora-app-main/src/app/[id]/**`
- `infiora-dash-main/infiora-dash-main/src/views/**`
- `infiora-admin-main/infiora-admin-main/src/pages/**`

**Affected Area:** Accessibility, mobile, and error states

**Problem:**  
The apps have many complex guest and operator flows, but no visible accessibility test strategy, keyboard navigation checks, or consistent loading/error/empty state standards.

**Why It Matters:**  
Infiora is guest-facing and will be used on mobile devices in hotels, often under time pressure.

**Risk If Ignored:**  
Guests abandon flows, operators miss issues, and accessibility compliance risk grows.

**Suggested Fix:**  
Create a UI QA checklist and add E2E coverage for mobile viewports, keyboard navigation, screen reader labels, network errors, and empty states.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 4

**Needs Human Product Decision:** No

**Notes:**  
This should be done after core auth and route fixes.

## Finding ID: INF-AUDIT-045

**Priority:** P4 - Nice to Have  
**Category:** Product  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/orders`
- `infiora-backend-main/infiora-backend-main/src/modules/booking`
- `infiora-backend-main/infiora-backend-main/src/modules/maintenance`
- `infiora-backend-main/infiora-backend-main/src/modules/housekeeping`
- `infiora-dash-main/infiora-dash-main`

**Affected Area:** Operational intelligence

**Problem:**  
Infiora has raw operational modules but limited evidence of higher-level analytics, SLAs, trend detection, or manager insights.

**Why It Matters:**  
Hotels will pay more for insights and automation than for static QR menus alone.

**Risk If Ignored:**  
The product may remain a utility instead of becoming a hotel operations platform.

**Suggested Fix:**  
Add operational dashboards for response time, order fulfillment, popular items, issue categories, staff performance, booking utilization, and guest satisfaction trends.

**Estimated Difficulty:** Hard

**Suggested Wave:** Wave 5

**Needs Human Product Decision:** Yes

**Notes:**  
Depends on analytics reliability and data model cleanup.

## Finding ID: INF-AUDIT-046

**Priority:** P4 - Nice to Have  
**Category:** Product  
**Affected File(s):**
- `infiora-app-main/infiora-app-main/src/app/[id]/**`
- `infiora-backend-main/infiora-backend-main/src/modules/reservation-code`
- `infiora-backend-main/infiora-backend-main/src/modules/orders`
- `infiora-backend-main/infiora-backend-main/src/modules/booking`

**Affected Area:** Guest personalization and upsell

**Problem:**  
The guest app could better personalize content, recommendations, and upsells based on hotel, room, language, stay context, and guest behavior.

**Why It Matters:**  
Personalized services can improve guest satisfaction and revenue per stay.

**Risk If Ignored:**  
The guest experience may feel generic and less valuable to hotels.

**Suggested Fix:**  
After privacy/security hardening, add optional personalized recommendations, multilingual content, timed offers, booking suggestions, and reservation-aware guest journeys.

**Estimated Difficulty:** Hard

**Suggested Wave:** Wave 5

**Needs Human Product Decision:** Yes

**Notes:**  
Do not build personalization before consent, analytics, and trust boundaries are clear.

## Finding ID: INF-AUDIT-047

**Priority:** P4 - Nice to Have  
**Category:** Developer Experience  
**Affected File(s):**
- root repository
- all app package manifests
- CI/CD files if added later

**Affected Area:** Developer workflow

**Problem:**  
There is no clear root command set for linting, testing, building, auditing, and running the active system.

**Why It Matters:**  
Future agents need deterministic commands to validate changes.

**Risk If Ignored:**  
Fixes will be shipped without reliable verification.

**Suggested Fix:**  
Add a root README or `package.json` workspace with documented commands, health checks, test commands, audit commands, and app ownership.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** No

**Notes:**  
This should follow architecture consolidation.

## 4. Security Audit

Auth bypass risks:

- INF-AUDIT-001 is the highest-risk auth bypass. Dashboard sessions can be forged through client-supplied JSON.
- INF-AUDIT-008 breaks expected bearer token auth behavior.
- INF-AUDIT-015 shows contract drift that can cause fragile auth fixes.

Missing authorization checks:

- INF-AUDIT-003 allows public cancellation by booking ID.
- INF-AUDIT-007 permits status updates without hotel ownership.
- INF-AUDIT-009 shows booking hotel scoping gaps.
- INF-AUDIT-012 shows device/staff group/hotel scope gaps.
- INF-AUDIT-013 shows overbroad manager rights and middleware bypasses.

Exposed secrets:

- INF-AUDIT-004 covers committed env files, default secrets, local passwords, and weak `.gitignore`.
- INF-AUDIT-020 covers deployment defaults with unsafe secrets.

Unsafe environment variable handling:

- INF-AUDIT-004, INF-AUDIT-020, and INF-AUDIT-043 should be handled together.

Insecure API routes:

- INF-AUDIT-002, INF-AUDIT-003, INF-AUDIT-007, INF-AUDIT-010, INF-AUDIT-011, INF-AUDIT-014, and INF-AUDIT-017 are the main route-level risks.

Missing rate limits:

- INF-AUDIT-011 and INF-AUDIT-017 cover route abuse broadly.
- INF-AUDIT-023 covers reservation code/PIN abuse concerns.
- INF-AUDIT-033 covers Django auth rate limiting.

Missing input validation:

- INF-AUDIT-006 covers upload validation.
- INF-AUDIT-011 covers translation payload validation.
- INF-AUDIT-022 covers payment method validation.
- INF-AUDIT-023 covers reservation-code business validation.

Injection risks:

- INF-AUDIT-030 is the main XSS vector through `dangerouslySetInnerHTML`.
- Mongo sanitize middleware exists, but business-level ownership checks remain the larger issue.

XSS risks:

- INF-AUDIT-030 is direct.
- INF-AUDIT-031 increases XSS impact by storing tracking tokens in localStorage.

CSRF risks:

- INF-AUDIT-005 is the primary CSRF issue.

SSRF risks:

- INF-AUDIT-002 is direct SSRF/open proxy risk.

File upload risks:

- INF-AUDIT-006 and INF-AUDIT-019 cover unsafe upload handling and committed upload content.

Payment/webhook risks:

- INF-AUDIT-022 covers the lack of real payment gateway, webhook verification, and idempotency.

Database permission risks:

- INF-AUDIT-009, INF-AUDIT-010, INF-AUDIT-013, INF-AUDIT-023, and INF-AUDIT-024 cover tenant and data integrity issues.

Token/session handling risks:

- INF-AUDIT-001, INF-AUDIT-005, INF-AUDIT-008, INF-AUDIT-015, INF-AUDIT-018, INF-AUDIT-031, and INF-AUDIT-034 cover session/token problems.

Dependency vulnerabilities:

- INF-AUDIT-027 and INF-AUDIT-035 cover old runtimes and committed dependencies. A real `npm audit`, `pip-audit`, and .NET package audit should be run after dependency cleanup.

Unsafe logging of sensitive data:

- INF-AUDIT-036 covers local credentials and raw error logging.
- INF-AUDIT-033 covers Sentry PII.

CORS/configuration risks:

- INF-AUDIT-005, INF-AUDIT-020, INF-AUDIT-033, and INF-AUDIT-043 cover CORS and environment issues.

Production deployment risks:

- INF-AUDIT-004, INF-AUDIT-020, INF-AUDIT-027, and INF-AUDIT-035 are production blockers.

## 5. Logic and Product Flow Audit

Broken user flows:

- Auth verification, refresh, logout, and reset flows are inconsistent across backend, dashboard, admin, and guest app. See INF-AUDIT-015.
- Dashboard login creates two identities: backend cookies and NextAuth JWT session. See INF-AUDIT-001 and INF-AUDIT-015.
- Admin guard behavior was previously identified as incomplete in `FULL_DEEP_SCAN_AUDIT.md`; it should be rechecked during Wave 2.

Incomplete onboarding:

- Local setup scripts use hard-coded credentials and role values that do not match the backend enum. See INF-AUDIT-036.
- Product onboarding lacks a clear source of truth for active app URLs, ports, and databases. See INF-AUDIT-016 and INF-AUDIT-047.

Bad redirects:

- Auth redirects are likely fragile because the dashboard relies on NextAuth while backend auth relies on signed cookies. See INF-AUDIT-001 and INF-AUDIT-015.

Missing loading/error states:

- Multiple frontend flows perform network actions but lack a documented loading/error/empty-state standard. See INF-AUDIT-044.

Broken form handling:

- Auth forms and reset/verify pages should be tested against the actual backend route contract. See INF-AUDIT-015.
- Guest service/request forms need a product decision on whether invalid reservation codes block submission. See INF-AUDIT-023.

Inconsistent state:

- Guest visitor identity is split across session storage and local storage. See INF-AUDIT-041.
- Guest order tracking uses localStorage while backend tokens are separate. See INF-AUDIT-031.

Bad assumptions in code:

- Booking operations assume object IDs provided together belong to the same hotel. See INF-AUDIT-009.
- Payment labels imply product capability that is not enforced by a payment state machine. See INF-AUDIT-022.

Data not refreshed correctly:

- Dashboard/backend session drift can leave the UI believing a user is authenticated after backend cookies expire or vice versa. See INF-AUDIT-001 and INF-AUDIT-015.

Edge cases:

- Concurrent booking creation and cancellation can create duplicate references or capacity issues. See INF-AUDIT-024.
- Static room params only fetch the first 100 rooms. See INF-AUDIT-039.

Empty states:

- Guest and dashboard empty-state standards should be added for no orders, no bookings, inactive hotel, inactive room, expired hotel, unavailable service, and failed translation. See INF-AUDIT-044.

Permission-based UI mismatch:

- Manager role UI should not assume broad API access until the backend role model is corrected. See INF-AUDIT-013.

Incomplete business logic:

- Payment, staff/device scoping, reservation code enforcement, and analytics identity need product-level decisions. See INF-AUDIT-012, INF-AUDIT-022, INF-AUDIT-023, and INF-AUDIT-041.

## 6. Architecture and Maintainability Audit

Folder structure:

- The repository is a workspace by convention, but not a clean monorepo. Active apps, legacy apps, static prototypes, old docs, generated assets, uploads, and dependency folders are mixed at root. See INF-AUDIT-016, INF-AUDIT-027, and INF-AUDIT-038.

Separation of concerns:

- The Node backend has a recognizable route/controller/service/model structure, but ownership and validation are often split inconsistently.
- The frontends mix template APIs, real APIs, local session logic, and backend cookie auth. See INF-AUDIT-001, INF-AUDIT-015, and INF-AUDIT-032.

Repeated code:

- API base URL handling, auth refresh, route contracts, legal/static content, and UI concepts are duplicated across admin, dashboard, and guest apps.

Dead code:

- Template/fake APIs and legacy static app copies are likely dead or partially dead. See INF-AUDIT-032 and INF-AUDIT-038.

Naming quality:

- Old package names, typo folders, stale Swagger URLs, and inconsistent admin/dashboard naming reduce clarity. See INF-AUDIT-037 and INF-AUDIT-038.

File size and component complexity:

- Guest app room/order/blog flows are complex and should be split around typed data contracts and state machines before adding more features.

Utility/service abstraction:

- Upload, auth, ownership, rate limiting, env validation, and API clients should be centralized. See INF-AUDIT-005, INF-AUDIT-006, INF-AUDIT-013, INF-AUDIT-017, and INF-AUDIT-043.

API/client boundary:

- The frontend/backend route contract is not stable. See INF-AUDIT-015.

Type safety:

- TypeScript is present but weakened by loose shapes and inconsistent dependencies. See INF-AUDIT-029.

Error handling patterns:

- Errors are not uniformly sanitized or mapped to user-facing states. See INF-AUDIT-036 and INF-AUDIT-044.

Logging strategy:

- There is no unified logging policy for sensitive fields, PII, request IDs, or audit events. See INF-AUDIT-018, INF-AUDIT-033, and INF-AUDIT-036.

Testing structure:

- Tests exist but do not cover the primary product/security risk areas. See INF-AUDIT-021.

Scalability risks:

- In-memory limiters, unbounded queries, missing indexes, old runtimes, and unclear deployment ownership limit scale. See INF-AUDIT-017, INF-AUDIT-023, INF-AUDIT-026, and INF-AUDIT-035.

## 7. Performance Audit

Client rendering issues:

- Dashboard Strict Mode is disabled, hiding effect/render problems. See INF-AUDIT-028.
- Guest room pages mix dynamic hotel status and static generation assumptions. See INF-AUDIT-039.

Server rendering issues:

- The guest app calls backend data during static param generation with a hard limit. See INF-AUDIT-039.
- Server-side proxy routes can become bottlenecks if abused. See INF-AUDIT-002 and INF-AUDIT-011.

Expensive queries:

- Analytics and booking/order queries need pagination, date bounds, and indexes. See INF-AUDIT-026.

Unnecessary re-renders:

- Not deeply profiled. React Strict Mode and E2E profiling should follow security fixes. See INF-AUDIT-028.

Large dependencies:

- Committed `node_modules` and multiple frontend stacks make dependency management heavy. See INF-AUDIT-027.

Bundle size risks:

- Multiple UI libraries, template code, and demo APIs in dashboards likely increase bundle size. See INF-AUDIT-032 and INF-AUDIT-042.

Image/media optimization:

- Broad remote image config and proxying are unsafe and may hurt caching. See INF-AUDIT-002.

Caching opportunities:

- Translation results should be cached or precomputed. See INF-AUDIT-011.
- Public catalog, hotel, room, and content data could use safe cache headers once auth and active-status semantics are clear.

Database indexing opportunities:

- Add compound indexes for bookings by hotel/item/room/time/status and order analytics by hotel/date/status/group. See INF-AUDIT-026.

API latency risks:

- SSRF/translation endpoints and unbounded analytics are likely first API latency risks. See INF-AUDIT-002, INF-AUDIT-011, and INF-AUDIT-026.

## 8. Database and Data Integrity Audit

Schema risks:

- Booking, order, reservation code, staff, and guest feedback models encode important business rules but not all are enforced by schema constraints.

Missing constraints:

- Reservation codes need scoped uniqueness if they are used as proof. See INF-AUDIT-023.
- Booking references need concurrency-safe uniqueness. See INF-AUDIT-024.

Missing indexes:

- Booking/order analytics should receive compound indexes for high-volume dashboard queries. See INF-AUDIT-026.

Bad relations:

- Booking creation and mutation do not consistently verify hotel relations. See INF-AUDIT-009.

Missing cascade behavior:

- Some user/hotel/room/group cascade hooks exist, but orders, bookings, feedback, maintenance, housekeeping, uploaded files, and analytics retention need explicit policy.

Dangerous nullable fields:

- Not exhaustively proven. Future schema pass should identify nullable fields that are required by frontend assumptions.

Migration risks:

- Mongo indexes/model changes are not represented as explicit migrations.
- Prisma dashboard schema is separate from backend Mongo identity.
- Django and .NET schemas are separate from the Node backend and may be inactive.

Validation mismatch:

- Frontend payment and auth flows disagree with backend enforcement. See INF-AUDIT-015 and INF-AUDIT-022.

Multi-user data isolation risks:

- Cross-hotel object ID assumptions are the main data isolation risk. See INF-AUDIT-007, INF-AUDIT-009, INF-AUDIT-012, and INF-AUDIT-013.

Backup/restore concerns:

- No backup/restore documentation was found in inspected files.

## 9. Testing Audit

Missing unit tests:

- Ownership middleware for hotel, group, room, booking, issue, tag, link, staff, and device scopes.
- Upload validation and rejection cleanup.
- NPS token verification and missing-secret startup behavior.
- Booking reference generation and cancellation idempotency.

Missing integration tests:

- Dashboard login cannot be forged through NextAuth credentials.
- Backend cookie auth works with CSRF protection.
- Bearer auth works after JWT extractor fix.
- Cross-hotel booking, issue, order, group, tag, and link access is rejected.
- Guest booking cancellation requires a valid token.
- Translation and image proxy abuse paths are rejected.

Missing E2E tests:

- Hotel owner login, logout, refresh, and session expiry.
- Email verification and reset password.
- Guest opens room, views catalog, places order, tracks order, rates order.
- Guest creates booking and cancels with a valid cancellation token.
- Guest submits maintenance/housekeeping request.
- Staff/tablet verifies PIN and advances an order.
- Manager tries to access another hotel's data and is denied.

Missing security tests:

- CSRF rejection.
- SSRF private-IP rejection.
- File type/size rejection.
- Rate-limit threshold behavior.
- Role matrix tests.

Missing regression tests:

- Auth endpoint contracts across admin, dashboard, and guest app.
- Static/dynamic room page behavior over 100 rooms.
- Reservation code duplicate prevention.

Mocking problems:

- External services like translation, SMTP, S3, and payment should be mocked behind interfaces.

Test setup problems:

- No single root test command was identified. See INF-AUDIT-047.

## 10. UX/UI Improvement Opportunities

Confusing screens:

- Auth flow errors should distinguish invalid credentials, expired session, backend unavailable, unverified email, and forbidden role.
- Guest booking cancellation should explain exactly what is being cancelled and require a trusted proof.

Missing feedback:

- Guest order placement should show clear failure states for unavailable ordering, invalid reservation code, unsupported payment method, and network failure.
- Maintenance/housekeeping submissions should clearly show whether the reservation code was verified.

Missing validation messages:

- Forms should show field-level validation for email, reservation code, party size, time slots, payment method, notes length, and upload type/size.

Poor empty states:

- Add explicit empty states for no catalog items, no active bookings, no available slots, no orders, no maintenance items, and inactive/expired hotel.

Accessibility issues:

- Add labels, keyboard focus states, modal/drawer focus traps, semantic buttons, color contrast checks, and screen reader text for status changes.

Keyboard navigation:

- Test login, catalog, cart, booking, service request, staff tablet, and dashboard tables with keyboard only.

Mobile responsiveness:

- Guest flows must be tested on narrow mobile screens, slow networks, and hotel Wi-Fi conditions.

Visual hierarchy:

- Guest-facing order and booking pages should emphasize status, next action, hotel trust indicators, and support contact.

Consistency:

- Admin and dashboard should use one design system or be explicitly separated by role/product purpose.

User trust improvements:

- Show verified hotel branding, privacy-safe data use, cancellation confirmation, secure payment wording, and support fallback when a flow fails.

## 11. Infiora Upgrade Ideas

### Core Product Improvements

- Upgrade title: Single authoritative operator dashboard
- Why it helps: Reduces confusion between admin and dashboard apps and makes permissions easier to secure.
- Complexity: Hard
- Suggested wave: Wave 5
- Dependencies: INF-AUDIT-001, INF-AUDIT-016, INF-AUDIT-042

- Upgrade title: Reservation-aware guest journey
- Why it helps: Guests see services, booking options, and messages relevant to their room/stay.
- Complexity: Hard
- Suggested wave: Wave 5
- Dependencies: INF-AUDIT-023, INF-AUDIT-041

### Automation Improvements

- Upgrade title: SLA automation for maintenance and housekeeping
- Why it helps: Hotels can track overdue tasks and escalate unresolved issues automatically.
- Complexity: Medium
- Suggested wave: Wave 5
- Dependencies: INF-AUDIT-007, INF-AUDIT-045

- Upgrade title: Smart order routing by group/staff role
- Why it helps: Restaurants, housekeeping, reception, and maintenance can receive only relevant work.
- Complexity: Medium
- Suggested wave: Wave 5
- Dependencies: INF-AUDIT-012, INF-AUDIT-013

### AI/Intelligence Improvements

- Upgrade title: Cached multilingual content generation
- Why it helps: Improves guest experience without exposing a live unauthenticated translation proxy.
- Complexity: Medium
- Suggested wave: Wave 5
- Dependencies: INF-AUDIT-011, INF-AUDIT-030

- Upgrade title: AI service request classification
- Why it helps: Maintenance and housekeeping requests can be categorized and prioritized automatically.
- Complexity: Medium
- Suggested wave: Wave 5
- Dependencies: INF-AUDIT-017, INF-AUDIT-045

### User Experience Improvements

- Upgrade title: Guest trust and status center
- Why it helps: Guests can see order status, booking status, support options, and hotel verification in one place.
- Complexity: Medium
- Suggested wave: Wave 5
- Dependencies: INF-AUDIT-003, INF-AUDIT-031, INF-AUDIT-044

- Upgrade title: Better offline/poor-network behavior
- Why it helps: Hotel Wi-Fi can be unreliable, and guest flows need resilient retry states.
- Complexity: Medium
- Suggested wave: Wave 5
- Dependencies: INF-AUDIT-044

### Admin/Analytics Improvements

- Upgrade title: Operations analytics dashboard
- Why it helps: Hotels can see order volume, response times, popular items, booking utilization, and NPS trends.
- Complexity: Hard
- Suggested wave: Wave 5
- Dependencies: INF-AUDIT-026, INF-AUDIT-041, INF-AUDIT-045

- Upgrade title: Audit log viewer
- Why it helps: Builds trust and helps investigate staff/admin actions.
- Complexity: Medium
- Suggested wave: Wave 5
- Dependencies: INF-AUDIT-013, INF-AUDIT-036

### Monetization Improvements

- Upgrade title: Premium automation tier
- Why it helps: Charge for SLA automation, analytics, multilingual content, and integrations.
- Complexity: Hard
- Suggested wave: Wave 5
- Dependencies: INF-AUDIT-045, INF-AUDIT-046

- Upgrade title: Upsell campaigns for hotels
- Why it helps: Hotels can promote spa, restaurant, late checkout, experiences, and room upgrades.
- Complexity: Medium
- Suggested wave: Wave 5
- Dependencies: INF-AUDIT-041, INF-AUDIT-046

### Reliability Improvements

- Upgrade title: Health dashboard and synthetic checks
- Why it helps: Operators know whether backend, guest app, dashboard, email, storage, and translation are working.
- Complexity: Medium
- Suggested wave: Wave 4
- Dependencies: INF-AUDIT-020, INF-AUDIT-035, INF-AUDIT-047

- Upgrade title: Background job queue
- Why it helps: Email, translation, analytics aggregation, and notifications become more reliable.
- Complexity: Hard
- Suggested wave: Wave 5
- Dependencies: INF-AUDIT-017, INF-AUDIT-026

### Security/Trust Improvements

- Upgrade title: Tenant-aware permission matrix
- Why it helps: Defines exactly what owner, manager, staff, device, and guest can do.
- Complexity: Hard
- Suggested wave: Wave 1 and Wave 2
- Dependencies: INF-AUDIT-007, INF-AUDIT-009, INF-AUDIT-012, INF-AUDIT-013

- Upgrade title: Security settings page
- Why it helps: Hotels can manage staff access, device sessions, PINs, audit logs, and trusted domains.
- Complexity: Hard
- Suggested wave: Wave 5
- Dependencies: INF-AUDIT-012, INF-AUDIT-013, INF-AUDIT-023

### Developer Experience Improvements

- Upgrade title: Root workspace validation command
- Why it helps: Future agents can run one command to lint, test, build, and audit active apps.
- Complexity: Medium
- Suggested wave: Wave 3
- Dependencies: INF-AUDIT-016, INF-AUDIT-027, INF-AUDIT-047

- Upgrade title: Generated API contract
- Why it helps: Keeps frontend and backend routes/types aligned.
- Complexity: Medium
- Suggested wave: Wave 3
- Dependencies: INF-AUDIT-015, INF-AUDIT-029

## 12. Suggested Implementation Waves

### Wave 1 - Critical Stabilization and Security

Goal:

- Eliminate the highest-risk auth bypasses, public mutation routes, SSRF/open proxy behavior, unsafe uploads, secrets exposure, and cross-tenant authorization failures.

Must fix:

- INF-AUDIT-001
- INF-AUDIT-002
- INF-AUDIT-003
- INF-AUDIT-004
- INF-AUDIT-005
- INF-AUDIT-006
- INF-AUDIT-007
- INF-AUDIT-008
- INF-AUDIT-009
- INF-AUDIT-010
- INF-AUDIT-011
- INF-AUDIT-012
- INF-AUDIT-013
- INF-AUDIT-014
- INF-AUDIT-017
- INF-AUDIT-018
- INF-AUDIT-019
- INF-AUDIT-020

Steps:

1. Fix dashboard NextAuth credentials provider in `infiora-dash-main/infiora-dash-main/src/libs/auth.ts` and update `src/views/Login.tsx` to use only server-verified identity.
2. Disable or harden `infiora-app-main/infiora-app-main/src/app/api/image-proxy/route.ts` with allowlists, IP blocking, type checks, and size limits.
3. Disable or rate-limit/harden `src/app/api/translate/route.ts` with auth, quotas, caching, and input caps.
4. Add CSRF and explicit cookie policy in `infiora-backend-main/infiora-backend-main/src/config/config.ts` and `src/modules/auth/auth.controller.ts`.
5. Fix JWT extractor composition in `src/modules/auth/passport.ts`.
6. Replace unsafe upload middleware in `src/modules/utils/multerUpload.ts` and stop serving raw uploads without controls.
7. Add hotel ownership checks to maintenance, housekeeping, booking, staff/device, group, tag, link, and order operational routes.
8. Require signed guest cancellation tokens for booking cancellation and remove public cancellation-by-ID.
9. Remove or protect `/v1/config` in `src/app.ts`.
10. Rotate committed secrets, replace `.env` files with examples, strengthen `.gitignore`, and remove committed uploads after confirmation.
11. Add route-specific rate limits for guest/order/booking/NPS/service-request endpoints.
12. Add tests for forged dashboard session rejection, CSRF, SSRF rejection, upload rejection, cross-hotel denial, and cancellation token requirements.

Exit Criteria:

- No public route can mutate or expose another tenant's data without proof.
- Dashboard session cannot be forged by arbitrary credentials payload.
- SSRF/image proxy and translation abuse paths are blocked.
- Uploads have type, size, filename, and serving controls.
- Production startup rejects missing or placeholder secrets.
- Wave 1 security tests pass.

### Wave 2 - Core Logic and UX Fixes

Goal:

- Make core product flows reliable after security stabilization.

Must fix:

- INF-AUDIT-015
- INF-AUDIT-022
- INF-AUDIT-023
- INF-AUDIT-024
- INF-AUDIT-030
- INF-AUDIT-031

Steps:

1. Write a canonical auth route contract covering login, logout, refresh, forgot password, reset password, verify email, and current user.
2. Update backend auth route validation and every frontend client in dashboard, admin, and guest apps to match the contract.
3. Decide whether invalid reservation codes block service requests, orders, and bookings; enforce the decision consistently.
4. Add scoped unique constraints/indexes for active reservation codes and safe booking references.
5. Make booking cancellation idempotent and atomic.
6. Sanitize blog/rich content rendering in `BlogDrawer.tsx`.
7. Revisit guest order token storage and define a safe shared-device behavior.
8. Clarify payment method behavior as "pay at hotel" or integrate a real payment provider.

Exit Criteria:

- Auth flows work consistently across all active apps.
- Booking references and capacity updates survive concurrency tests.
- Rich guest content cannot execute scripts.
- Reservation code behavior is explicit and tested.
- Payment UI does not imply unsupported payment capability.

### Wave 3 - Architecture and Maintainability Refactor

Goal:

- Reduce repository complexity and make future changes deterministic.

Must fix:

- INF-AUDIT-016
- INF-AUDIT-027
- INF-AUDIT-029
- INF-AUDIT-032
- INF-AUDIT-033
- INF-AUDIT-034
- INF-AUDIT-036
- INF-AUDIT-037
- INF-AUDIT-038
- INF-AUDIT-042
- INF-AUDIT-043
- INF-AUDIT-047

Steps:

1. Decide the authoritative backend and admin/dashboard apps.
2. Move inactive prototypes and static copies into an archive or separate repository.
3. Remove committed `node_modules`, uploads, generated files, and stale artifacts from source control.
4. Add root documentation for active apps, ports, commands, databases, and deployment ownership.
5. Remove dashboard template/fake-db APIs that are not used by production.
6. Normalize project names, package metadata, Swagger URLs, and app branding.
7. Add typed env validation for every active app.
8. Start API contract/type generation or a shared schema package.
9. Decide whether Django and .NET APIs are active; harden or archive them accordingly.

Exit Criteria:

- A new developer or future agent can identify the active system in under five minutes.
- Root commands exist for install, dev, lint, test, build, and audit for active apps.
- No inactive app is accidentally deployable without explicit intent.
- Environment variables are documented and validated.

### Wave 4 - Performance, Testing, and Scalability

Goal:

- Add confidence, load tolerance, and operational reliability.

Must fix:

- INF-AUDIT-021
- INF-AUDIT-025
- INF-AUDIT-026
- INF-AUDIT-028
- INF-AUDIT-035
- INF-AUDIT-039
- INF-AUDIT-040
- INF-AUDIT-041
- INF-AUDIT-044

Steps:

1. Add integration and E2E tests for core guest, staff, and operator flows.
2. Add role/tenant regression tests.
3. Convert tracking writes to explicit POST endpoints where appropriate.
4. Add pagination, date bounds, indexes, and query explain checks for analytics/order/booking endpoints.
5. Re-enable React Strict Mode in the dashboard and fix surfaced issues.
6. Revisit guest room rendering strategy instead of only generating the first 100 rooms.
7. Upgrade container runtimes and verify healthchecks.
8. Normalize encoding issues and add UI QA checks for mobile/accessibility.
9. Define a privacy-aware visitor identity strategy.

Exit Criteria:

- Critical flows have automated coverage.
- Common dashboard queries are bounded and indexed.
- Runtime versions are supported.
- Mobile and accessibility smoke tests pass.
- Analytics semantics are documented.

### Wave 5 - Product Upgrades and Advanced Features

Goal:

- Turn the hardened platform into a stronger hospitality operations product.

Must fix:

- INF-AUDIT-045
- INF-AUDIT-046

Steps:

1. Add operations analytics for orders, bookings, maintenance, housekeeping, response times, and NPS.
2. Add SLA automation and escalation rules for staff workflows.
3. Add cached multilingual content generation instead of public live translation abuse.
4. Add guest trust/status center for order, booking, requests, and support.
5. Add premium modules such as analytics, automation, upsells, multilingual content, staff audit logs, and integrations.
6. Add security settings for devices, staff roles, PINs, sessions, and audit logs.

Exit Criteria:

- Premium features depend on trustworthy data and secure permissions.
- Product analytics are actionable for hotel operators.
- New features are behind clear permissions and tests.

## 13. Prompt Templates for Future GPT/Codex Agents

### Prompt for Wave Implementation

```text
You are Codex GPT-5.5. Read `INFIORA_FULL_PROJECT_AUDIT_AND_UPGRADE_PLAN.md`.

Implement only Wave X.

Rules:
- Do not implement other waves.
- Before changing code, identify all relevant findings for this wave.
- Make a step-by-step implementation plan.
- Then implement carefully.
- Preserve existing behavior unless the audit says it is broken.
- Add or update tests where appropriate.
- After implementation, summarize exactly what changed.
- List files changed.
- List any risks or follow-up work.
```

### Prompt for Security Fix Review

```text
You are Codex GPT-5.5 acting as a security reviewer.

Review the changes made for Finding INF-AUDIT-XXX.

Rules:
- Do not modify code unless explicitly asked.
- Verify the vulnerable path is closed.
- Verify tests cover the old vulnerable behavior.
- Check for bypasses through sibling routes, middleware ordering, alternate apps, and stale clients.
- Return findings first, with file and line references.
```

### Prompt for Test Implementation

```text
You are Codex GPT-5.5.

Read `INFIORA_FULL_PROJECT_AUDIT_AND_UPGRADE_PLAN.md` and implement tests for Finding INF-AUDIT-XXX only.

Rules:
- Do not refactor production code unless needed to make the behavior testable.
- Add regression tests that fail on the current bug and pass after the intended fix.
- Prefer integration tests for auth, ownership, route contract, upload, SSRF, and CSRF behavior.
- Summarize the exact commands used to run the tests.
```

## 14. Final Recommendations

What must be fixed first:

- Fix dashboard auth forgery, SSRF/open proxy, public booking cancellation, unsafe uploads, CSRF gaps, secrets exposure, and missing ownership checks.

What should be fixed second:

- Normalize auth route contracts, booking integrity, reservation-code rules, rich content sanitization, and guest token handling.

What can wait:

- Legacy folder cleanup, naming cleanup, Strict Mode, encoding polish, advanced analytics, and premium product features can wait until security blockers are resolved.

What should not be done yet:

- Do not add payment, AI, personalization, or major analytics features until auth, tenant isolation, upload handling, and public route abuse controls are fixed.

What could make Infiora significantly better:

- A secure single operator dashboard, strong hotel-scoped permission model, reliable guest trust/status center, operations analytics, SLA automation, multilingual content pipeline, audit logs, and premium automation modules.

Recommended next move:

- Assign a future Codex agent to implement Wave 1 only, starting with INF-AUDIT-001, INF-AUDIT-002, INF-AUDIT-003, INF-AUDIT-004, INF-AUDIT-005, INF-AUDIT-006, and INF-AUDIT-007 before any product feature work.
