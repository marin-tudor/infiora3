# Infiora Full Project Audit and Upgrade Plan

## 0. Executive Summary

- Overall project health score: 4/10
- Security score: 3/10
- Maintainability score: 4/10
- Scalability score: 4/10
- Product readiness score: 4/10

Infiora has a real product shape: a Node/Express/MongoDB backend, guest-facing Next.js app, admin surfaces, bookings, orders, Stripe Connect, uploads, translations, feedback, maintenance, housekeeping, and hotel operations modules. The main risk is that several production-facing boundaries currently trust client input or expose internal hotel data. The highest-impact problems are public room APIs leaking full hotel configuration including ordering PIN data, missing ownership checks on core content creation routes, unsafe online payment lifecycle handling, iCal sync SSRF exposure, and weak test coverage around the most sensitive flows.

The biggest opportunities are to consolidate the active stack, harden the guest-safe API boundary, make payments idempotent and server-authoritative, improve operations workflows for hotels, and turn the existing feature flags/modules into a more coherent premium product.

Recommended first action: complete Wave 1 before adding product features. Specifically, create guest-safe public response DTOs, enforce ownership on all authenticated mutations, fix Stripe amount/status verification and idempotency, restrict iCal sync fetching, and add regression tests for those exact flows.

## 1. Repository Scan Coverage

- Total folders reviewed by inventory: 35,644 including generated/vendor/build folders.
- Total files reviewed by inventory: 360,224 including generated/vendor/build files.
- Source-oriented folders reviewed in detail: approximately 612 excluding obvious generated/vendor/build output.
- Source-oriented files reviewed in detail: approximately 1,995 excluding obvious generated/vendor/build output.

Main technologies detected:
- Node.js, TypeScript, Express, Mongoose, MongoDB
- Next.js 14, React, Material UI, Redux Toolkit Query, NextAuth
- Stripe Connect and Stripe webhooks
- AWS S3 upload support, local uploads in development
- SMTP/Nodemailer email delivery
- Playwright E2E tests
- Jest backend tests
- Alternative or legacy stacks: .NET API prototype, Django/DRF prototype, dashboard Next.js app, archived apps

Frameworks and integrations detected:
- Backend: Express, Passport JWT, Joi validation, Mongoose, multer, Stripe, Nodemailer, node-ical, express-rate-limit, helmet, mongo-sanitize
- Guest app: Next.js App Router, React, Stripe.js, MUI, local API image proxy
- Admin app: Next.js Pages Router, MUI/Devias-derived templates, backend cookie auth
- Dash app: Next.js, NextAuth, Prisma/SQLite, fake-db modules, Stripe client references
- Database/auth/payment/storage/email/AI: MongoDB, JWT cookies/bearer tokens, Stripe Connect, S3/local uploads, SMTP, translation cache/AI-adjacent translation workflows

Important config files reviewed:
- Root `README.md`, `package.json`, `package-lock.json`, `playwright.config.ts`, `.gitignore`
- Root scripts under `tools/` and local startup scripts
- Active backend package/config/routes/models/services/controllers/tests
- Active guest app package/config/routes/components/context/pages/API routes
- Active admin package/config/pages/components/services
- Dash package/config/routes/auth/server-actions/fake-db
- Alternative .NET and Django settings, Dockerfile-style deployment files, and environment examples
- `.env` files and `.env.example` files across active and alternative apps

Files or folders that could not be fully inspected:
- No source folder was inaccessible during the audit.
- Generated/vendor/build/binary content such as `node_modules`, `.next`, `dist`, `build`, image assets, PDFs, logs, cache files, and TypeScript build info were inventoried and spot-checked rather than read line by line.
- `npm audit --json` could not run for `infiora-admin-main/infiora-admin-main` because that package has no npm lockfile; it only has a Yarn lockfile.

## 2. Critical Findings Overview

| ID | Priority | Category | File/Area | Short Description | Suggested Wave |
|---|---|---|---|---|---|
| INF-AUDIT-001 | P0 | Security | Public room APIs | Public room endpoints return populated hotel objects and can leak operational settings and ordering PIN data | Wave 1 |
| INF-AUDIT-002 | P0 | Auth | Room/group/link mutations | Authenticated users can create content for hotels/rooms/groups they do not own | Wave 1 |
| INF-AUDIT-003 | P0 | Payment | Guest online orders | Stripe PaymentIntent creation and order placement trust client amount and payment IDs | Wave 1 |
| INF-AUDIT-007 | P1 | Auth | Backend login | Login ignores inactive and unverified user flags | Wave 1 |
| INF-AUDIT-008 | P1 | Auth | Admin app | Admin guard and sign-out do not reliably enforce admin/manager access or logout | Wave 1 |
| INF-AUDIT-009 | P1 | API | Multipart create/update routes | Validation runs before multer parsing, breaking upload-backed forms | Wave 2 |
| INF-AUDIT-010 | P1 | API | Maintenance/housekeeping | Public creation and status updates lack robust validation and update validators | Wave 1 |
| INF-AUDIT-012 | P1 | Security | iCal sync | Authenticated iCal URL fetches can target internal network resources | Wave 1 |
| INF-AUDIT-013 | P1 | Privacy | Guest status tokens | Long-lived access tokens are passed in query strings and logged | Wave 1 |
| INF-AUDIT-014 | P1 | Security | Email templates | User-controlled strings are interpolated into HTML emails without escaping | Wave 1 |
| INF-AUDIT-015 | P1 | Data Integrity | Bookings/orders/discounts | Multi-step writes are not transactional or idempotent | Wave 2 |
| INF-AUDIT-016 | P1 | Dependencies | Active packages | Backend, guest app, and dash have high/critical npm audit findings | Wave 1 |
| INF-AUDIT-017 | P1 | Architecture | Docs/scripts/tests | Active-stack docs, generated API contract, startup scripts, and E2E targets are stale or inconsistent | Wave 2 |

## 3. Full Findings, Sorted by Priority

## Finding ID: INF-AUDIT-001

**Priority:** P0 - Critical
**Category:** Security  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/routes/v1/room.route.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/room/room.controller.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/room/room.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/room/room.interfaces.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/hotel/hotel.model.ts`

**Affected Area:** Public guest room API responses

**Problem:**  
Public `GET /v1/rooms` and `GET /v1/rooms/:roomId` return room records populated with the full hotel object. The hotel model contains operational and sensitive configuration such as ordering table PIN data, booking and order email settings, manager/user relationships, security settings, Stripe account fields, platform fee settings, and module configuration. The frontend currently filters some inactive states, but the backend response itself is not guest-safe.

**Why It Matters:**  
Unauthenticated users can directly call the API and inspect hotel operations data. The table PIN leak is especially severe because the same PIN concept is used to authorize restaurant ordering from a room.

**Risk If Ignored:**  
Guests or attackers can bypass intended guest UX restrictions, scrape hotel configuration, discover restaurant PINs, and use leaked operational metadata to attack or abuse other endpoints.

**Suggested Fix:**  
Create explicit guest-safe DTOs/projections for public room APIs. Never populate full hotel documents on public routes. Include only fields needed by the guest app, for example hotel name, branding, enabled public modules, public payment method booleans, and sanitized room display data. Enforce `hotel.isActive` and `room.isActive` server-side on public room detail and list endpoints.

**Estimated Difficulty:** Hard

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
This is the first boundary to fix because many guest flows depend on the room payload.

## Finding ID: INF-AUDIT-002

**Priority:** P0 - Critical
**Category:** Auth  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/routes/v1/room.route.ts`
- `infiora-backend-main/infiora-backend-main/src/routes/v1/group.route.ts`
- `infiora-backend-main/infiora-backend-main/src/routes/v1/link.route.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/room/room.validation.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/group/group.validation.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/link/link.validation.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/ownership/ownership.middleware.ts`

**Affected Area:** Authenticated content creation and querying

**Problem:**  
`POST /rooms`, `POST /groups`, and `POST /links` require authentication but do not verify that the authenticated user owns the referenced hotel, room, or group. The validators accept arbitrary IDs from the request body. `GET /links` is also authenticated but can query links by arbitrary room/group IDs.

**Why It Matters:**  
Any authenticated account can create or enumerate content under another hotel's resources if it knows or guesses IDs.

**Risk If Ignored:**  
Cross-tenant data pollution, content hijacking, brand damage, malicious links appearing in guest rooms, and loss of trust from hotel customers.

**Suggested Fix:**  
Add ownership middleware to every authenticated route that accepts hotel, room, group, link, role, or related resource IDs. For create routes, verify the parent resource before creation. For list routes, constrain queries to resources owned by the session user unless the user is an admin. Add tests proving one hotel user cannot create, list, update, or delete another hotel's content.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
This should be implemented as a reusable authorization pattern, not route-by-route ad hoc checks.

## Finding ID: INF-AUDIT-003

**Priority:** P0 - Critical
**Category:** Security  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/routes/v1/orders.route.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.controller.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/stripe/stripe.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/stripe/stripe-webhook.handler.ts`
- `infiora-app-main/infiora-app-main/src/app/[id]/order/page.tsx`

**Affected Area:** Guest online order payment lifecycle

**Problem:**  
The guest payment intent endpoint accepts `hotelId`, `amountCents`, `currency`, and `metadata` directly from the client. Order placement for online payments checks only that `stripePaymentIntentId` exists; it does not retrieve Stripe state or verify payment status, amount, currency, hotel, connected account, metadata, or one-time use. The webhook updates an existing order by PaymentIntent ID, but the frontend confirms payment before order creation, so the webhook can arrive before the order exists.

**Why It Matters:**  
Payment amount and payment identity must be server-authoritative. A client can underpay or reuse a PaymentIntent unless the backend binds and verifies it.

**Risk If Ignored:**  
Revenue loss, paid orders not recorded, unpaid orders marked as pending/accepted, charge/order mismatch, duplicate submissions, and reconciliation failures.

**Suggested Fix:**  
Make the backend calculate amount from catalog items, modifiers, quantities, and discounts before creating a PaymentIntent. Store a pending checkout/session with a server-generated idempotency key. On order placement, retrieve the PaymentIntent from Stripe and verify status, amount, currency, hotel/account, metadata, and unused state. Make webhook handling idempotent and able to reconcile pre-order payment events. Add integration tests for underpayment, reuse, webhook-before-order, duplicate submit, and discount changes.

**Estimated Difficulty:** Hard

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
This is a production blocker for online ordering.


## Finding ID: INF-AUDIT-007

**Priority:** P1 - High
**Category:** Auth  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/auth/auth.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/user/user.model.ts`

**Affected Area:** User login

**Problem:**  
Email/password login checks password validity but does not reject users where `isActive` is false or where email verification is required and `isEmailVerified` is false.

**Why It Matters:**  
Account deactivation and email verification flags exist in the data model but are not enforced during authentication.

**Risk If Ignored:**  
Suspended users can continue logging in, unverified accounts can access protected functionality, and admin deactivation controls become ineffective.

**Suggested Fix:**  
Enforce `isActive` and email verification policy in login. Decide whether admin-created users, staff, and local development have exceptions. Add tests for inactive, unverified, and normal login paths.

**Estimated Difficulty:** Easy

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** Yes

**Notes:**  
The product decision is whether every user must verify email before login or only before selected actions.

## Finding ID: INF-AUDIT-008

**Priority:** P1 - High
**Category:** Auth  
**Affected File(s):**
- `infiora-admin-main/infiora-admin-main/src/components/AuthGuard.tsx`
- `infiora-admin-main/infiora-admin-main/src/pages/auth/login.tsx`
- `infiora-admin-main/infiora-admin-main/src/layouts/dashboard/account-popover.tsx`
- `infiora-admin-main/infiora-admin-main/src/services/api.ts`

**Affected Area:** Admin console authorization and session handling

**Problem:**  
The admin guard only checks that `/v1/users/me` returns a user; it does not require an admin or manager role. The login page performs a role check after login but leaves backend cookies active for unauthorized users. The account popover "Sign out" only navigates to the login page instead of calling backend logout. The login redirect parameter is used directly for navigation and needs strict same-origin/internal validation.

**Why It Matters:**  
Admin UI access must enforce least privilege consistently, and sign-out must revoke or clear the active session.

**Risk If Ignored:**  
Non-admin users may access admin screens, unauthorized sessions remain active after failed role checks, and open redirect behavior can be introduced through redirect parameters.

**Suggested Fix:**  
Centralize admin/manager role enforcement in `AuthGuard`, call `/v1/auth/logout` on sign-out and unauthorized role detection, clear client state, validate redirect targets as internal paths only, and add admin auth E2E coverage.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
Server-side authorization must still be enforced by backend APIs; UI guards are not sufficient alone.

## Finding ID: INF-AUDIT-009

**Priority:** P1 - High
**Category:** API  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/routes/v1/hotel.route.ts`
- `infiora-backend-main/infiora-backend-main/src/routes/v1/room.route.ts`
- `infiora-backend-main/infiora-backend-main/src/routes/v1/group.route.ts`
- `infiora-backend-main/infiora-backend-main/src/routes/v1/link.route.ts`
- `infiora-backend-main/infiora-backend-main/src/middlewares/validate.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/upload/upload.middleware.ts`

**Affected Area:** Multipart form handling

**Problem:**  
Several upload-backed routes run Joi validation before multer parses `multipart/form-data`. For multipart requests, `req.body` is not populated yet, so validation sees empty or incomplete data and either rejects valid uploads or allows controller logic to run with missing validated fields.

**Why It Matters:**  
Hotel, room, group, and link create/update flows can fail unpredictably or bypass expected validation whenever files are involved.

**Risk If Ignored:**  
Broken admin uploads, inconsistent data, confusing UX, and future agents accidentally weakening validation to work around symptoms.

**Suggested Fix:**  
Parse multipart payloads before validation on routes that accept files. Normalize text fields after multer, then run Joi validation against the parsed body and files. Add multipart integration tests for create/update routes.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 2

**Needs Human Product Decision:** No

**Notes:**  
Keep JSON routes and multipart routes explicit so validation behavior is predictable.

## Finding ID: INF-AUDIT-010

**Priority:** P1 - High
**Category:** API  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/routes/v1/maintenance.route.ts`
- `infiora-backend-main/infiora-backend-main/src/routes/v1/housekeeping.route.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/maintenance/maintenance.controller.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/housekeeping/housekeeping.controller.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/maintenance/maintenance.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/housekeeping/housekeeping.service.ts`

**Affected Area:** Guest maintenance and housekeeping requests

**Problem:**  
Public create endpoints lack strong Joi validation before processing multipart/text payloads. Authenticated status update endpoints accept status bodies without route-level validation, and service updates do not consistently use `runValidators`.

**Why It Matters:**  
Public guest endpoints need strict bounds on text length, enum values, file count/type, and room/hotel consistency. Status fields should not accept invalid states.

**Risk If Ignored:**  
Invalid operational tasks, oversized user input, noisy staff workflows, and corrupted status values in MongoDB.

**Suggested Fix:**  
Add Joi schemas for create/status endpoints, parse multipart safely, verify room/hotel relationship server-side, enforce file limits and allowed types, and use `{ runValidators: true }` on updates. Add tests for invalid statuses and oversized fields.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
This should be handled together with upload validation and guest-safe public DTOs.


## Finding ID: INF-AUDIT-012

**Priority:** P1 - High
**Category:** Security  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/orders/ical-source.model.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/orders/ical-sync.service.ts`
- `infiora-backend-main/infiora-backend-main/src/routes/v1/orders.route.ts`

**Affected Area:** iCal source synchronization

**Problem:**  
iCal source URLs are stored and later fetched by the server through `node-ical.async.fromURL`. The URL is not restricted by scheme, host, IP range, redirect behavior, size, or timeout controls at the application boundary.

**Why It Matters:**  
Authenticated users can cause the backend to fetch arbitrary URLs. Even authenticated SSRF matters in multi-tenant SaaS because a compromised tenant account can target internal infrastructure.

**Risk If Ignored:**  
Internal network probing, cloud metadata access attempts, service discovery, resource exhaustion, and security incidents during calendar sync.

**Suggested Fix:**  
Allow only `https://` calendar URLs from public IP addresses, reject private/link-local/loopback/metadata ranges after DNS resolution, limit redirects and response size, set aggressive timeouts, and record safe failure reasons. Add SSRF unit tests with blocked hostnames and IP ranges.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
Manual sync and cron sync should share the same safe fetcher.

## Finding ID: INF-AUDIT-013

**Priority:** P1 - High
**Category:** Privacy  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/logger/morgan.ts`
- `infiora-app-main/infiora-app-main/src/app/[id]/guest-status/page.tsx`
- `infiora-backend-main/infiora-backend-main/src/modules/maintenance/maintenance.controller.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/housekeeping/housekeeping.controller.ts`

**Affected Area:** Guest status access tokens

**Problem:**  
Guest status and request status flows pass access tokens in query strings. Morgan logs `:url`, so tokens can appear in server logs. Query tokens also leak through browser history, screenshots, referer headers, and copied links.

**Why It Matters:**  
Status tokens grant access to guest order, booking, maintenance, or housekeeping data.

**Risk If Ignored:**  
Token replay from logs or browser history, accidental exposure during support, and privacy incidents.

**Suggested Fix:**  
Use short-lived magic links that exchange the URL token for an HttpOnly same-site cookie, or submit tokens in POST bodies. Redact sensitive query parameters in request logging immediately. Add expiration, one-time use where appropriate, and explicit status-token tests.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** Yes

**Notes:**  
The human decision is whether guest status links should remain shareable or become device/session-bound.

## Finding ID: INF-AUDIT-014

**Priority:** P1 - High
**Category:** Security  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/email/email.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/booking/booking.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/maintenance/maintenance.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/housekeeping/housekeeping.service.ts`

**Affected Area:** HTML email generation

**Problem:**  
HTML emails interpolate user-controlled fields such as names, notes, feedback messages, order notes, maintenance descriptions, housekeeping notes, hotel names, and booking data directly into HTML without escaping.

**Why It Matters:**  
Email clients render HTML. User-provided HTML can change email content, hide warnings, inject links, or create stored HTML injection in email workflows.

**Risk If Ignored:**  
Phishing-style content inside trusted hotel emails, staff confusion, guest trust damage, and downstream security scanner flags.

**Suggested Fix:**  
Introduce a small HTML escaping/template helper and use it for all interpolated variables. Keep trusted markup separate from untrusted data. Add tests for escaping special characters in email templates.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
Plain-text email alternatives should also be generated for deliverability and accessibility.

## Finding ID: INF-AUDIT-015

**Priority:** P1 - High
**Category:** Database  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/booking/booking.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/orders/discount.model.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/booking/time-slot.model.ts`

**Affected Area:** Multi-step writes for bookings, orders, and discounts

**Problem:**  
Booking creation increments time slot capacity before creating the booking and sending follow-up work. Order placement increments discount usage before creating guest orders. These multi-document flows do not use MongoDB sessions/transactions or idempotency keys.

**Why It Matters:**  
Capacity, coupon usage, payment state, and order state must remain consistent even when a later step fails.

**Risk If Ignored:**  
Lost capacity, over-counted discounts, duplicate orders, failed orders consuming slots, support overhead, and financial reconciliation problems.

**Suggested Fix:**  
Use MongoDB transactions for capacity/coupon/order/booking updates where deployment supports replica sets. Add idempotency keys for guest order and booking submissions. Move side effects such as email sending after durable commit. Add failure-injection tests.

**Estimated Difficulty:** Hard

**Suggested Wave:** Wave 2

**Needs Human Product Decision:** No

**Notes:**  
If local MongoDB does not run as a replica set, document a transaction-capable dev setup or isolate transaction tests.

## Finding ID: INF-AUDIT-016

**Priority:** P1 - High
**Category:** Security  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/package.json`
- `infiora-backend-main/infiora-backend-main/package-lock.json`
- `infiora-app-main/infiora-app-main/package.json`
- `infiora-app-main/infiora-app-main/package-lock.json`
- `infiora-dash-main/infiora-dash-main/package.json`
- `infiora-dash-main/infiora-dash-main/package-lock.json`
- `infiora-admin-main/infiora-admin-main/package.json`
- `infiora-admin-main/infiora-admin-main/yarn.lock`

**Affected Area:** Dependency security

**Problem:**  
`npm audit --json` reported 72 vulnerabilities in the backend package, including 5 critical and 32 high; 18 vulnerabilities in the guest app, including 1 critical and 10 high; and 33 vulnerabilities in the dash app, including 18 high. Admin audit could not run with npm because there is no package-lock. Notable risk areas include old Next.js versions, old Express/body-parser/cookie/serve-static family packages, `validator`, `aws-sdk` v2, `pm2` transitive dependencies, `next-auth`, `axios`, `protobufjs`, `postcss`, `tar`, and tooling packages.

**Why It Matters:**  
Several affected packages sit on public request paths or build/runtime surfaces.

**Risk If Ignored:**  
Known vulnerabilities remain exploitable, future installs become less reproducible, and security review will block production readiness.

**Suggested Fix:**  
Standardize package manager and lockfiles, upgrade Next.js and backend HTTP dependencies, replace or update vulnerable transitive packages, move vulnerable dev-only tooling out of runtime where possible, and rerun audit after each upgrade. Prioritize vulnerabilities reachable in production.

**Estimated Difficulty:** Hard

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
Do upgrades in controlled batches with smoke tests because framework upgrades may change behavior.

## Finding ID: INF-AUDIT-017

**Priority:** P1 - High
**Category:** Architecture  
**Affected File(s):**
- `README.md`
- `tools/Validate-Workspace.ps1`
- `tools/Generate-ApiContract.ps1`
- `tools/Start-InfioraActive.ps1`
- `start-infiora-all.bat`
- `packages/infiora-api-contract/generated/active-routes.json`
- `playwright.config.ts`
- `tests/e2e/dash-auth.spec.ts`
- `tests/e2e/guest-public.spec.ts`

**Affected Area:** Active-stack definition, automation, and tests

**Problem:**  
Root documentation links missing `docs/active-system.md` and `docs/alternative-stacks.md` paths, while copies exist only under old planning docs. Workspace validation expects those missing paths, so audit scripts fail. The generated API route contract is stale and incomplete. Startup scripts disagree on whether Dash is active. Playwright starts/tests Dash on port 4001, not the active admin app on port 4000.

**Why It Matters:**  
Future implementation agents and developers will target the wrong apps and stale APIs.

**Risk If Ignored:**  
Fixes land in legacy surfaces, active regressions go untested, generated contracts mislead clients, and onboarding remains fragile.

**Suggested Fix:**  
Create or restore the active-stack docs at root, update validation scripts, regenerate a richer API contract from actual Express routes, align startup scripts around active apps, and retarget Playwright to guest plus active admin/backend critical flows.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 2

**Needs Human Product Decision:** Yes

**Notes:**  
The product/team should explicitly decide whether Dash remains active, legacy, or archived.

## Finding ID: INF-AUDIT-018

**Priority:** P2 - Medium
**Category:** API  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/room/room.controller.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/room/room.validation.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/subscriber/subscriber.validation.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/subscriber/subscriber.service.ts`

**Affected Area:** Feedback and subscriber creation

**Problem:**  
Feedback creation loads `req.body.room` but creates feedback using `req.body.hotel` without verifying that the room belongs to that hotel. Feedback email validation accepts any string/null/empty value, rating bounds are weak, and messages lack clear maximum length. Subscriber creation accepts `user`, `room`, and `email` with weak email validation and no visible room-user relationship or deduplication enforcement.

**Why It Matters:**  
Public guest feedback and subscription endpoints are easy spam/poisoning targets.

**Risk If Ignored:**  
Cross-hotel feedback pollution, invalid subscriber data, duplicate records, spam, and poor analytics quality.

**Suggested Fix:**  
Derive hotel/user from the room server-side, validate email with Joi email rules, enforce rating ranges and text limits, add dedupe indexes, and add abuse controls/rate limits.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 2

**Needs Human Product Decision:** No

**Notes:**  
Do not trust public request bodies for tenant ownership fields.

## Finding ID: INF-AUDIT-019

**Priority:** P2 - Medium
**Category:** API  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/routes/v1/link.route.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/link/link.controller.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/link/link.service.ts`

**Affected Area:** Public link retrieval

**Problem:**  
`GET /v1/links/:linkId` is public and can return a link by ID without verifying whether the link, parent group, room, or hotel is active and guest-visible.

**Why It Matters:**  
Direct object IDs should not reveal inactive/private content.

**Risk If Ignored:**  
Inactive offers, internal links, or draft content may remain accessible if someone has the ID.

**Suggested Fix:**  
For public link reads, require guest-visible active status on the link and all parent resources. For admin reads, use an authenticated admin endpoint.

**Estimated Difficulty:** Easy

**Suggested Wave:** Wave 2

**Needs Human Product Decision:** No

**Notes:**  
This belongs with the broader guest-safe DTO work.

## Finding ID: INF-AUDIT-020

**Priority:** P2 - Medium
**Category:** API  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/routes/v1/room.route.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/room/room.validation.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/room/room.service.ts`

**Affected Area:** Public room listing

**Problem:**  
The public room list supports broad query parameters and uses the same unsafe populate behavior as room detail. The audit did not find a clear server-side maximum limit or enforced active-only filter for public listings.

**Why It Matters:**  
Public list endpoints are natural scraping targets and should return minimal, bounded, guest-safe data.

**Risk If Ignored:**  
Bulk scraping of hotel/room metadata and unnecessary database load.

**Suggested Fix:**  
Add separate public list validation with strict max `limit`, active-only filters, guest-safe projection, and optional hotel scoping. Keep admin list behavior behind authenticated routes.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** No

**Notes:**  
This can be fixed alongside INF-AUDIT-001.

## Finding ID: INF-AUDIT-021

**Priority:** P2 - Medium
**Category:** Backend  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/errors/error.ts`
- `infiora-backend-main/infiora-backend-main/src/middlewares/error.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/booking/booking.service.ts`

**Affected Area:** Error handling

**Problem:**  
The API error converter uses an operator precedence expression that effectively converts any truthy `error.statusCode` into a 400 Bad Request instead of preserving the intended status. Services that throw errors with `statusCode: 404` or other statuses can be reported incorrectly.

**Why It Matters:**  
Accurate status codes are part of the API contract and affect frontend behavior, monitoring, and debugging.

**Risk If Ignored:**  
Not found, forbidden, conflict, and server errors can be misclassified as bad requests, hiding real bugs and breaking client handling.

**Suggested Fix:**  
Rewrite the status selection explicitly. Preserve valid `error.statusCode`, map Mongoose errors to 400, and default to 500. Add unit tests for 400, 401, 403, 404, 409, Mongoose, and generic errors.

**Estimated Difficulty:** Easy

**Suggested Wave:** Wave 2

**Needs Human Product Decision:** No

**Notes:**  
This is a small fix with high debugging value.

## Finding ID: INF-AUDIT-022

**Priority:** P2 - Medium
**Category:** Database  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/token/token.model.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/audit/audit-log.model.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/hotel/hotel.model.ts`

**Affected Area:** Retention and cleanup

**Problem:**  
The token model stores expiration timestamps but does not define a TTL index. Audit logs exist and hotel settings reference audit log retention, but the audit log model does not visibly enforce retention with TTL or scheduled cleanup.

**Why It Matters:**  
Expired credentials and old audit data should not accumulate indefinitely.

**Risk If Ignored:**  
Larger databases, higher breach impact, and mismatch between promised retention settings and actual behavior.

**Suggested Fix:**  
Add TTL indexes or scheduled cleanup for expired tokens. Implement audit log retention based on hotel settings or a global retention policy. Document retention behavior.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** Yes

**Notes:**  
Audit retention may be a paid/compliance feature, so product policy should be explicit.

## Finding ID: INF-AUDIT-023

**Priority:** P2 - Medium
**Category:** Security  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/app.ts`
- `infiora-backend-main/infiora-backend-main/src/routes/v1/auth.route.ts`
- `infiora-backend-main/infiora-backend-main/src/config/config.ts`

**Affected Area:** Rate limiting and proxy deployment behavior

**Problem:**  
The app uses rate limiting, but no `app.set('trust proxy', ...)` was found. Production behind a proxy can rate-limit the proxy IP instead of the real client, or be misconfigured around forwarded headers. Registration and public guest endpoints need explicit abuse controls, not only broad route-level defaults.

**Why It Matters:**  
Abuse controls behave differently behind load balancers and reverse proxies.

**Risk If Ignored:**  
Legitimate users can be rate-limited together, attackers can evade or concentrate rate limits, and public endpoints remain easier to spam.

**Suggested Fix:**  
Configure `trust proxy` explicitly per deployment, document proxy assumptions, and add targeted rate limiters for register, login, guest order/booking/status, feedback, subscriber, maintenance, housekeeping, image proxy, and iCal operations.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 2

**Needs Human Product Decision:** No

**Notes:**  
Use IP plus tenant/room/email where appropriate to avoid one noisy hotel affecting another.

## Finding ID: INF-AUDIT-024

**Priority:** P2 - Medium
**Category:** API  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/routes/v1/booking.route.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/booking/booking.controller.ts`
- `infiora-app-main/infiora-app-main/src/app/[id]/bookings/my/page.tsx`

**Affected Area:** Booking cancellation flow

**Problem:**  
The public cancel route defaults cancellation actor handling in a way that only works when the guest frontend sends `?by=guest`. Without that query parameter, the public route can take the staff path with missing hotel context and produce a confusing failure.

**Why It Matters:**  
Public API behavior should not depend on an undocumented query parameter for the expected guest path.

**Risk If Ignored:**  
Broken cancellation links, confusing support cases, and future clients using the endpoint incorrectly.

**Suggested Fix:**  
Split guest and staff cancellation endpoints or infer guest mode from the public token route. Validate token and actor explicitly.

**Estimated Difficulty:** Easy

**Suggested Wave:** Wave 2

**Needs Human Product Decision:** No

**Notes:**  
Also consider whether cancellation should require email/status token confirmation.

## Finding ID: INF-AUDIT-025

**Priority:** P2 - Medium
**Category:** API  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.controller.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.service.ts`
- `infiora-app-main/infiora-app-main/src/app/[id]/order/page.tsx`

**Affected Area:** Discount validation preview

**Problem:**  
The discount preview endpoint accepts client-provided cart items and total amount. Placement appears to revalidate server-side, which limits direct checkout impact, but the preview can still mislead guests and leak discount behavior.

**Why It Matters:**  
Pricing previews need to match final server pricing or users lose trust.

**Risk If Ignored:**  
Guests see discounts that later disappear, support disputes increase, and discount enumeration becomes easier.

**Suggested Fix:**  
Use server-side catalog lookup for discount preview too. Return clear "estimated" versus "final" language only if final calculation can differ.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 2

**Needs Human Product Decision:** No

**Notes:**  
This pairs naturally with the payment rewrite in INF-AUDIT-003.

## Finding ID: INF-AUDIT-026

**Priority:** P2 - Medium
**Category:** API  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/room/room.validation.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/room/room.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/room/room.controller.ts`

**Affected Area:** Room creation

**Problem:**  
Room creation validation allows key fields such as hotel and quantity to be optional, while the service assumes a valid quantity and returns the first created room. There is also no clear maximum quantity cap.

**Why It Matters:**  
Bulk creation must be bounded and deterministic.

**Risk If Ignored:**  
Empty creation results, runtime errors, unbounded room generation, and cross-tenant creation when combined with missing ownership checks.

**Suggested Fix:**  
Require hotel and quantity for create, enforce positive integer bounds, derive active status policy server-side, validate generated names, and add tests for missing/zero/large quantities.

**Estimated Difficulty:** Easy

**Suggested Wave:** Wave 1

**Needs Human Product Decision:** Yes

**Notes:**  
Product should decide the maximum rooms created per request.

## Finding ID: INF-AUDIT-027

**Priority:** P2 - Medium
**Category:** Frontend  
**Affected File(s):**
- `infiora-app-main/infiora-app-main/src/components/RoomView.tsx`
- `infiora-app-main/infiora-app-main/src/components/PageTracker.tsx`
- `infiora-app-main/infiora-app-main/src/components/tracking/ActivityTracker.tsx`
- `infiora-backend-main/infiora-backend-main/src/routes/v1/room.route.ts`

**Affected Area:** Guest analytics tracking

**Problem:**  
Some guest tracking components still call stale GET-style room endpoints with query parameters, while the backend exposes activity tracking through POST endpoints. A newer `ActivityTracker` appears closer to the current route contract, leaving duplicate or dead tracking paths.

**Why It Matters:**  
Product analytics are only useful if they are accurate and consistently collected.

**Risk If Ignored:**  
Undercounted usage, broken engagement metrics, and wasted effort optimizing based on incomplete data.

**Suggested Fix:**  
Remove stale trackers, consolidate on one tracking client, use current POST endpoints, and add a non-blocking retry/error strategy.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 2

**Needs Human Product Decision:** No

**Notes:**  
Do this after the public room DTO changes so analytics payloads are not tied to leaked data.

## Finding ID: INF-AUDIT-028

**Priority:** P2 - Medium
**Category:** Frontend  
**Affected File(s):**
- `infiora-app-main/infiora-app-main/src/components/SurveyDrawer.tsx`

**Affected Area:** Guest survey flow

**Problem:**  
`SurveyDrawer` accepts prefill props for rating, email, and message but does not include them in the submission payload. Required-question validation treats falsy values such as `0` or `false` as missing. Progress starts at 0 percent on the first question and does not represent completion clearly.

**Why It Matters:**  
Survey data can be incomplete or blocked incorrectly, especially for NPS-style answers.

**Risk If Ignored:**  
Lost feedback, incorrect survey submissions, and confusing guest UX.

**Suggested Fix:**  
Include prefilled values in the submission payload, validate required answers by presence rather than truthiness, and adjust progress calculation to reflect current step completion.

**Estimated Difficulty:** Easy

**Suggested Wave:** Wave 2

**Needs Human Product Decision:** No

**Notes:**  
Add a component test for `0`, `false`, and prefilled submissions.

## Finding ID: INF-AUDIT-029

**Priority:** P2 - Medium
**Category:** Product  
**Affected File(s):**
- `infiora-app-main/infiora-app-main/src/app/[id]/bookings/confirm/page.tsx`
- `infiora-backend-main/infiora-backend-main/src/modules/hotel/hotel.model.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/booking/booking.service.ts`

**Affected Area:** Booking payments

**Problem:**  
The guest booking confirmation UI exposes payment choices such as room/cash/card and labels online-enabled settings as pay-at-hotel/room-charge behavior. There is no complete online booking payment flow equivalent to online ordering.

**Why It Matters:**  
Hotel payment settings should map to clear guest behavior.

**Risk If Ignored:**  
Guests misunderstand how bookings are paid, hotels enable settings that do not work as expected, and revenue opportunities are missed.

**Suggested Fix:**  
Decide whether bookings support online payment now. If yes, implement a server-authoritative Stripe flow similar to the corrected order flow. If no, hide online booking configuration and clarify pay-at-hotel labels.

**Estimated Difficulty:** Hard

**Suggested Wave:** Wave 5

**Needs Human Product Decision:** Yes

**Notes:**  
Do not extend online booking payments until order payments are corrected.

## Finding ID: INF-AUDIT-030

**Priority:** P2 - Medium
**Category:** Frontend  
**Affected File(s):**
- `infiora-app-main/infiora-app-main/src/app/[id]/order/page.tsx`
- `infiora-app-main/infiora-app-main/.env`
- `infiora-app-main/infiora-app-main/src/env.ts`

**Affected Area:** Stripe frontend configuration

**Problem:**  
The guest order page calls `loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')`. The active app `.env` has an empty publishable key. If online ordering is enabled without a valid key, the flow fails at runtime.

**Why It Matters:**  
Payment configuration errors should be detected early and shown safely to admins, not discovered by guests at checkout.

**Risk If Ignored:**  
Broken checkout, abandoned orders, and poor hotel trust.

**Suggested Fix:**  
Validate required public Stripe config at startup/build for environments where online payments are enabled. Disable online payment UI with a clear admin-facing configuration error when missing.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 2

**Needs Human Product Decision:** No

**Notes:**  
Backend should remain the source of truth for whether online payment is available to a hotel.

## Finding ID: INF-AUDIT-031

**Priority:** P2 - Medium
**Category:** Architecture  
**Affected File(s):**
- `infiora-app-main/infiora-app-main/src/utils/translationUtils.ts`
- `infiora-app-main/infiora-app-main/src/app/`
- `infiora-backend-main/infiora-backend-main/src/modules/translation/`
- `archive/`

**Affected Area:** Translation utilities

**Problem:**  
The guest app contains a translation utility that calls `/api/translate`, but the active app does not expose that route. Translation behavior appears to have moved to backend translation/cache modules, while stale frontend utility code remains.

**Why It Matters:**  
Dead or stale utilities confuse future implementation work and can produce silent runtime failures if reused.

**Risk If Ignored:**  
Future translation work may target the wrong path, duplicating logic or reintroducing broken calls.

**Suggested Fix:**  
Remove or replace the stale utility with a typed client for the active backend translation API. Add tests around the active translation cache path.

**Estimated Difficulty:** Easy

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** No

**Notes:**  
Check archived implementations before deleting only to preserve any useful behavior intentionally.

## Finding ID: INF-AUDIT-032

**Priority:** P2 - Medium
**Category:** Architecture  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/package-lock.json`
- `infiora-backend-main/infiora-backend-main/yarn.lock`
- `infiora-app-main/infiora-app-main/package-lock.json`
- `infiora-app-main/infiora-app-main/yarn.lock`
- `infiora-dash-main/infiora-dash-main/package-lock.json`
- `infiora-dash-main/infiora-dash-main/yarn.lock`
- `infiora-dash-main/infiora-dash-main/pnpm-lock.yaml`
- `infiora-admin-main/infiora-admin-main/yarn.lock`
- `package.json`

**Affected Area:** Dependency management

**Problem:**  
Several packages contain multiple lockfiles from different package managers. The root install scripts use npm for active apps, while the admin app only has a Yarn lockfile.

**Why It Matters:**  
Reproducible installs depend on one package manager and one lockfile strategy per package.

**Risk If Ignored:**  
Different developers and CI jobs install different dependency trees, causing hard-to-reproduce bugs and audit drift.

**Suggested Fix:**  
Choose npm, Yarn, or pnpm for the monorepo. Remove obsolete lockfiles, regenerate active lockfiles, update root scripts, and document the required toolchain.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 2

**Needs Human Product Decision:** Yes

**Notes:**  
The dependency vulnerability cleanup should happen after this decision.

## Finding ID: INF-AUDIT-033

**Priority:** P2 - Medium
**Category:** Architecture  
**Affected File(s):**
- `infiora-admin-main/infiora-admin-main/package.json`
- `infiora-admin-main/infiora-admin-main/yarn.lock`
- `infiora-admin-main/infiora-admin-main/src/pages/`
- `infiora-admin-main/infiora-admin-main/src/components/`
- `infiora-dash-main/infiora-dash-main/`

**Affected Area:** Admin product surface

**Problem:**  
The active admin app is an older Next/MUI template-derived surface with incomplete feature coverage compared with Dash and backend capabilities. It has no npm lockfile, while Dash still contains many operational screens, fake-db code, and NextAuth behavior.

**Why It Matters:**  
Two partially overlapping admin surfaces increase maintenance cost and make it unclear where product work belongs.

**Risk If Ignored:**  
Duplicate implementations, divergent UX, stale security fixes, and agents modifying the wrong app.

**Suggested Fix:**  
Make a formal decision: promote admin, promote dash, or merge features into one active console. Archive or clearly mark the non-active surface. Align routes, tests, docs, and startup scripts.

**Estimated Difficulty:** Hard

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** Yes

**Notes:**  
Do not add major admin features until this is resolved.

## Finding ID: INF-AUDIT-034

**Priority:** P2 - Medium
**Category:** Testing  
**Affected File(s):**
- `tests/e2e/guest-public.spec.ts`
- `tests/e2e/dash-auth.spec.ts`
- `playwright.config.ts`
- `infiora-backend-main/infiora-backend-main/tests/`
- `tools/Invoke-ActiveApps.ps1`

**Affected Area:** Test coverage

**Problem:**  
E2E coverage is minimal and targets Dash rather than the active admin app. Backend tests cover some utilities and selected order/iCal/Stripe pieces but not the highest-risk auth, authorization, public DTO, payment, privacy, SSRF, multipart, or CSRF flows. Root test orchestration skips active frontend packages without test scripts.

**Why It Matters:**  
The current test suite will not catch regressions in the flows most likely to cause security incidents or broken guest operations.

**Risk If Ignored:**  
Future agents can accidentally break ownership, payments, guest privacy, or admin access without detection.

**Suggested Fix:**  
Add focused backend integration tests for all P0/P1 findings, retarget Playwright to active guest/admin flows, add component tests for complex guest forms, and make root `npm run test` fail if an active app has no critical-flow coverage.

**Estimated Difficulty:** Hard

**Suggested Wave:** Wave 4

**Needs Human Product Decision:** No

**Notes:**  
Write tests alongside each fix in Waves 1 and 2, then broaden coverage in Wave 4.

## Finding ID: INF-AUDIT-035

**Priority:** P2 - Medium
**Category:** Performance  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/catalog/catalog-item.model.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/link/link.model.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/room/room.model.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/orders/guest-order.model.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/booking/booking.model.ts`

**Affected Area:** Database query performance

**Problem:**  
Several frequent access patterns need explicit compound indexes. Examples include catalog items by hotel/category/availability/sort order, links by room/group/active/position, orders by hotel/room/status/date, bookings by hotel/room/service/status/date, and public room access by active state.

**Why It Matters:**  
The app will become slower as hotels, rooms, orders, bookings, and links grow.

**Risk If Ignored:**  
Slow guest pages, admin table timeouts, expensive MongoDB scans, and poor scalability under multi-hotel usage.

**Suggested Fix:**  
Inventory actual query patterns, add compound indexes with migrations, and validate with explain plans or query stats. Keep index count balanced against write volume.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 4

**Needs Human Product Decision:** No

**Notes:**  
Index work should follow public DTO and query cleanup so indexes match final access patterns.

## Finding ID: INF-AUDIT-036

**Priority:** P2 - Medium
**Category:** Maintainability  
**Affected File(s):**
- `infiora-app-main/infiora-app-main/src/app/[id]/order/page.tsx`
- `infiora-app-main/infiora-app-main/src/app/[id]/bookings/confirm/page.tsx`
- `infiora-app-main/infiora-app-main/src/components/RoomView.tsx`
- `infiora-app-main/infiora-app-main/src/components/SurveyDrawer.tsx`

**Affected Area:** Large guest frontend components

**Problem:**  
Critical guest flows are implemented as large components with mixed data fetching, validation, pricing, payment, UI state, and rendering logic. Inline styles and local ad hoc validation appear repeatedly.

**Why It Matters:**  
Large mixed-responsibility components are hard to test and risky to modify, especially around payments and bookings.

**Risk If Ignored:**  
Small UI changes can break checkout, validation, analytics, or status handling. Future agents may duplicate logic instead of safely reusing it.

**Suggested Fix:**  
After security fixes, extract server-backed pricing/payment clients, form schemas, pure cart calculations, and presentation components. Add component tests around extracted units.

**Estimated Difficulty:** Hard

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** No

**Notes:**  
Do not refactor before fixing payment authority; otherwise the refactor may preserve broken logic.

## Finding ID: INF-AUDIT-037

**Priority:** P2 - Medium
**Category:** Architecture  
**Affected File(s):**
- `infiora-dash-main/infiora-dash-main/src/app/api/login/route.ts`
- `infiora-dash-main/infiora-dash-main/src/components/auth/AuthGuard.tsx`
- `infiora-dash-main/infiora-dash-main/src/app/server/actions.ts`
- `infiora-dash-main/infiora-dash-main/src/app/api/apps/`
- `infiora-dash-main/infiora-dash-main/src/fake-db/`
- `infiora-dash-main/infiora-dash-main/.env`

**Affected Area:** Dash app legacy/alternative surface

**Problem:**  
Dash remains referenced by tests and scripts but contains fake-db server actions, broad NextAuth session checks, default `NEXTAUTH_SECRET`, and public-style app routes. It is unclear whether Dash is production, prototype, or legacy.

**Why It Matters:**  
Security and product work must focus on the correct application.

**Risk If Ignored:**  
Dash may accidentally ship with fake data paths or weak auth assumptions, or future agents may spend time fixing a non-active app.

**Suggested Fix:**  
Classify Dash explicitly. If active, harden it and remove fake-db routes. If legacy, remove it from startup/test paths and archive it clearly.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** Yes

**Notes:**  
This is tied to INF-AUDIT-033 and INF-AUDIT-017.

## Finding ID: INF-AUDIT-038

**Priority:** P2 - Medium
**Category:** UX  
**Affected File(s):**
- `infiora-app-main/infiora-app-main/src/app/[id]/page.tsx`
- `infiora-app-main/infiora-app-main/src/app/[id]/guest-status/page.tsx`
- `infiora-app-main/infiora-app-main/src/app/[id]/order/page.tsx`
- `infiora-app-main/infiora-app-main/src/app/[id]/bookings/`

**Affected Area:** Guest failure and empty states

**Problem:**  
Some guest failure states are terse or developer-oriented, such as inactive room handling returning a literal inactive state. Order, booking, and status flows have inconsistent invalid/expired token, loading, and retry messaging.

**Why It Matters:**  
Guest-facing hospitality flows must preserve trust even when something fails.

**Risk If Ignored:**  
Guests abandon actions, call staff, or perceive the hotel service as unreliable.

**Suggested Fix:**  
Design consistent guest-safe error pages for inactive rooms, unavailable services, expired status links, failed payment setup, network failures, and empty bookings/orders. Include clear next steps without exposing internals.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 2

**Needs Human Product Decision:** Yes

**Notes:**  
Copy should be hospitality-oriented and translated/localized through the active translation path.

## Finding ID: INF-AUDIT-039

**Priority:** P2 - Medium
**Category:** UX  
**Affected File(s):**
- `infiora-app-main/infiora-app-main/src/app/[id]/order/page.tsx`
- `infiora-app-main/infiora-app-main/src/app/[id]/bookings/confirm/page.tsx`
- `infiora-app-main/infiora-app-main/src/components/SurveyDrawer.tsx`
- `infiora-app-main/infiora-app-main/src/components/RoomView.tsx`

**Affected Area:** Guest form validation and accessibility

**Problem:**  
Guest forms use ad hoc validation such as basic `includes('@')`, local required checks, and inconsistent error rendering. The audit did not find a consistent accessibility strategy for focus management, keyboard behavior, ARIA attributes, or mobile error recovery across drawers and checkout forms.

**Why It Matters:**  
Forms are the core guest conversion points for orders, bookings, feedback, and requests.

**Risk If Ignored:**  
Guests submit invalid data, mobile users get stuck, accessibility compliance suffers, and support burden rises.

**Suggested Fix:**  
Adopt shared schemas for client/server validation, show field-level errors, move focus to first invalid field, support keyboard flows, and add mobile/responsive QA for drawers and checkout.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 2

**Needs Human Product Decision:** No

**Notes:**  
Keep server validation authoritative even after improving client validation.

## Finding ID: INF-AUDIT-040

**Priority:** P2 - Medium
**Category:** Other  
**Affected File(s):**
- `seed-mongo.js`
- `seed.mjs`
- `infiora-backend-main/infiora-backend-main/src/modules/email/email.service.ts`
- `infiora-app-main/infiora-app-main/src/app/[id]/order/page.tsx`
- `infiora-app-main/infiora-app-main/src/app/[id]/bookings/`
- `infiora-app-main/infiora-app-main/src/components/`
- `infiora-dash-main/infiora-dash-main/src/`

**Affected Area:** Text encoding and displayed copy

**Problem:**  
Multiple files show mojibake-style encoding corruption in currency symbols, punctuation, and icon-like text. This appears in seed data, guest UI text, emails, and dashboard code.

**Why It Matters:**  
Corrupted text makes a hospitality product look unprofessional and can confuse prices, statuses, and instructions.

**Risk If Ignored:**  
Poor guest trust, broken localization, malformed emails, and incorrect display of currency or symbols.

**Suggested Fix:**  
Normalize files to UTF-8, replace corrupted strings with intended text or proper icon components, add lint/check tooling for mojibake patterns, and review user-visible copy.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 2

**Needs Human Product Decision:** No

**Notes:**  
Avoid introducing decorative Unicode where icon components are more reliable.

## Finding ID: INF-AUDIT-041

**Priority:** P2 - Medium
**Category:** Architecture  
**Affected File(s):**
- `tools/Invoke-ActiveApps.ps1`
- `tools/Validate-Workspace.ps1`
- `tools/Start-InfioraActive.ps1`
- `tools/Generate-ApiContract.ps1`

**Affected Area:** Repository automation scripts

**Problem:**  
Some PowerShell scripts use brittle command construction and assumptions about missing docs or active apps. `Invoke-ActiveApps.ps1` uses a fixed command map and `Invoke-Expression`, which is avoidable even if the current input surface is constrained.

**Why It Matters:**  
Automation is how future agents and developers will validate changes.

**Risk If Ignored:**  
Unreliable validation, confusing script failures, and avoidable command execution risk.

**Suggested Fix:**  
Replace `Invoke-Expression` with explicit command arrays/call operators, validate paths before use, add clear error output, and align script behavior with the chosen active stack.

**Estimated Difficulty:** Easy

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** No

**Notes:**  
This is not the top security issue, but it will improve agent reliability.

## Finding ID: INF-AUDIT-042

**Priority:** P2 - Medium
**Category:** Product  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/hotel/hotel.model.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/activity/`
- `infiora-backend-main/infiora-backend-main/src/modules/audit/`
- `infiora-admin-main/infiora-admin-main/src/pages/`
- `infiora-dash-main/infiora-dash-main/src/app/`

**Affected Area:** Premium modules and product packaging

**Problem:**  
The hotel model contains many module/feature settings such as analytics, automation, upsells, multilingual content, audit logs, and integrations, but the active product surfaces do not present a coherent module gating, billing, or upgrade strategy.

**Why It Matters:**  
Feature flags without product packaging become complexity without monetization.

**Risk If Ignored:**  
Premium functionality may be inconsistently exposed, hard to sell, and hard to support.

**Suggested Fix:**  
Define plan tiers, module gates, entitlement checks, billing state, admin upgrade prompts, and analytics around feature usage. Tie Stripe billing/subscription state to hotel entitlements if SaaS monetization is intended.

**Estimated Difficulty:** Hard

**Suggested Wave:** Wave 5

**Needs Human Product Decision:** Yes

**Notes:**  
Do this after security and active admin consolidation.

## Finding ID: INF-AUDIT-043

**Priority:** P3 - Low
**Category:** Backend  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/ownership/ownership.middleware.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/hotel/hotel.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/room/room.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/group/group.service.ts`

**Affected Area:** Ownership middleware consistency

**Problem:**  
Ownership middleware handles managers in some paths but not consistently in room/group paths. Missing resources can surface generic "User not found" style errors through shared ownership helpers.

**Why It Matters:**  
Authorization behavior should be predictable and debuggable.

**Risk If Ignored:**  
Managers may be incorrectly denied or allowed depending on route, and debugging authorization failures remains harder than necessary.

**Suggested Fix:**  
Document ownership rules for admin, hotel owner, manager, and staff. Refactor middleware to share consistent checks and return precise 403/404 errors.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** Yes

**Notes:**  
This should follow the critical ownership fixes in INF-AUDIT-002.

## Finding ID: INF-AUDIT-044

**Priority:** P3 - Low
**Category:** Backend  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/logger/morgan.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/email/email.service.ts`
- `infiora-backend-main/infiora-backend-main/src/modules/translation/`
- `infiora-app-main/infiora-app-main/src/`
- `infiora-admin-main/infiora-admin-main/src/`
- `infiora-dash-main/infiora-dash-main/src/`

**Affected Area:** Logging strategy

**Problem:**  
The repository contains many `console.log` and `console.error` calls across backend, guest app, admin, and dash. Some backend logs may include sensitive URLs or operational details.

**Why It Matters:**  
Production logs need structure, redaction, levels, and correlation IDs.

**Risk If Ignored:**  
Sensitive data in logs, noisy observability, hard incident triage, and poor monitoring signal.

**Suggested Fix:**  
Adopt structured logging with redaction for tokens, query strings, emails where appropriate, payment IDs, and request IDs. Remove debug logs from frontend production builds.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** No

**Notes:**  
Token URL redaction is higher priority and covered by INF-AUDIT-013.

## Finding ID: INF-AUDIT-045

**Priority:** P3 - Low
**Category:** Architecture  
**Affected File(s):**
- `node_modules/`
- `infiora-backend-main/infiora-backend-main/node_modules/`
- `infiora-app-main/infiora-app-main/node_modules/`
- `infiora-dash-main/infiora-dash-main/.next/`
- `infiora-backend-main/infiora-backend-main/dist/`
- `infiora-backend-main/infiora-backend-main/logs/`
- `test-results/`
- `*.tsbuildinfo`

**Affected Area:** Repository hygiene and generated artifacts

**Problem:**  
Generated/vendor/build/log artifacts exist throughout the worktree. Some are ignored by `.gitignore`, but their presence increases scan volume and can obscure source review.

**Why It Matters:**  
Clean repositories are easier to audit, clone, search, and maintain.

**Risk If Ignored:**  
Huge diffs, slow tooling, accidental commits of generated data, and future agents wasting context on non-source files.

**Suggested Fix:**  
Clean generated artifacts from version control, keep ignore rules enforced, and add CI checks that reject committed build output, logs, local uploads, `.next`, `node_modules`, and temp payloads.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** No

**Notes:**  
Do not delete files blindly in a dirty worktree; review tracked status first.

## Finding ID: INF-AUDIT-046

**Priority:** P3 - Low
**Category:** Architecture  
**Affected File(s):**
- `infiora-api-main/`
- `infiora-django-main/`
- `archive/`
- `README.md`

**Affected Area:** Alternative stacks

**Problem:**  
The repository includes .NET and Django alternative stacks plus archived applications. They contain useful prototypes but also development defaults, placeholder secrets, divergent auth/config behavior, and docs that do not consistently match Infiora branding or active architecture.

**Why It Matters:**  
Alternative stacks are expensive to keep secure and current if they are not active.

**Risk If Ignored:**  
Security scanners flag non-production code, developers copy unsafe defaults, and product direction becomes unclear.

**Suggested Fix:**  
Move alternatives into a clearly labeled archive, document that they are not deployable, or give them explicit owners and CI. Remove stale branding and unsafe defaults if they remain in the main repo.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 3

**Needs Human Product Decision:** Yes

**Notes:**  
The .NET stack uses `EnsureCreated()` style database setup; the Django stack has permissive development CORS and fallback secrets.

## Finding ID: INF-AUDIT-047

**Priority:** P3 - Low
**Category:** Performance  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/uploads/`
- `infiora-backend-main/infiora-backend-main/src/modules/upload/`
- `infiora-app-main/infiora-app-main/src/app/api/image-proxy/route.ts`
- `infiora-app-main/infiora-app-main/next.config.mjs`

**Affected Area:** Media storage and cache growth

**Problem:**  
Local uploads and remote image fetching can grow storage/cache usage if not bounded by retention, quotas, or storage lifecycle policies.

**Why It Matters:**  
Media growth is a common operational cost and reliability issue.

**Risk If Ignored:**  
Disk exhaustion in local/small deployments, high CDN/storage costs, and slow backups.

**Suggested Fix:**  
Define per-hotel upload quotas, object lifecycle rules, cleanup for orphaned files, image size normalization, and monitoring for storage usage.

**Estimated Difficulty:** Medium

**Suggested Wave:** Wave 4

**Needs Human Product Decision:** Yes

**Notes:**  
This should be tied to plan tiers if monetization is introduced.

## Finding ID: INF-AUDIT-048

**Priority:** P4 - Nice to Have
**Category:** Product  
**Affected File(s):**
- `infiora-app-main/infiora-app-main/src/app/[id]/guest-status/page.tsx`
- `infiora-backend-main/infiora-backend-main/src/modules/orders/`
- `infiora-backend-main/infiora-backend-main/src/modules/booking/`
- `infiora-backend-main/infiora-backend-main/src/modules/maintenance/`
- `infiora-backend-main/infiora-backend-main/src/modules/housekeeping/`

**Affected Area:** Guest trust and status center

**Problem:**  
Guest status exists as tokenized pages, but there is no unified guest status center that clearly shows orders, bookings, requests, support actions, and status history in one trusted flow.

**Why It Matters:**  
Guests return when they can reliably track what they requested without calling staff.

**Risk If Ignored:**  
The product remains a set of disconnected forms instead of a trusted guest service layer.

**Suggested Fix:**  
Build a secure guest status center after token handling is fixed. Include request history, clear statuses, cancellation/edit options where allowed, and staff contact fallback.

**Estimated Difficulty:** Hard

**Suggested Wave:** Wave 5

**Needs Human Product Decision:** Yes

**Notes:**  
Depends on INF-AUDIT-013.

## Finding ID: INF-AUDIT-049

**Priority:** P4 - Nice to Have
**Category:** Product  
**Affected File(s):**
- `infiora-backend-main/infiora-backend-main/src/modules/translation/`
- `infiora-backend-main/infiora-backend-main/src/modules/feedback/`
- `infiora-backend-main/infiora-backend-main/src/modules/activity/`
- `infiora-admin-main/infiora-admin-main/src/pages/`

**Affected Area:** AI and intelligence features

**Problem:**  
Infiora collects guest behavior, feedback, translation content, orders, bookings, and requests, but the active product does not yet convert that data into operational intelligence.

**Why It Matters:**  
Hotels will pay more for insights and automation than for static QR content alone.

**Risk If Ignored:**  
The product competes mainly as a menu/link tool rather than an operations platform.

**Suggested Fix:**  
Add sentiment summaries, recurring complaint detection, multilingual content suggestions, smart upsell suggestions, and staff workload insights. Keep human review controls and audit trails.

**Estimated Difficulty:** Hard

**Suggested Wave:** Wave 5

**Needs Human Product Decision:** Yes

**Notes:**  
Implement only after data quality and privacy boundaries are fixed.

## Finding ID: INF-AUDIT-050

**Priority:** P4 - Nice to Have
**Category:** Architecture  
**Affected File(s):**
- `packages/infiora-api-contract/generated/active-routes.json`
- `tools/Generate-ApiContract.ps1`
- `infiora-backend-main/infiora-backend-main/src/routes/v1/`
- `infiora-app-main/infiora-app-main/src/services/`
- `infiora-admin-main/infiora-admin-main/src/services/`

**Affected Area:** Developer experience and API contract

**Problem:**  
The generated API contract is route-name oriented, stale, and not rich enough to generate typed clients, tests, or documentation.

**Why It Matters:**  
Typed contracts reduce frontend/backend drift and make future agent work safer.

**Risk If Ignored:**  
Frontend clients continue to hardcode endpoint strings and assumptions that drift from backend behavior.

**Suggested Fix:**  
Adopt OpenAPI or a typed route/schema generator from the backend Joi/controllers. Generate typed clients for guest/admin apps and contract tests for core routes.

**Estimated Difficulty:** Hard

**Suggested Wave:** Wave 5

**Needs Human Product Decision:** No

**Notes:**  
This is most valuable after the API security shape is corrected.

## 4. Security Audit

Auth bypass and authorization risks:
- INF-AUDIT-002 is the highest-risk tenant isolation flaw: authenticated users can create room, group, and link content under resources they do not own.
- INF-AUDIT-007 shows user deactivation and email verification fields are not enforced at login.
- INF-AUDIT-008 shows the admin UI does not consistently enforce admin/manager role or perform real logout.

Exposed secrets and unsafe configuration:
- INF-AUDIT-016 covers known vulnerable dependencies.
- INF-AUDIT-032 covers inconsistent lockfile/package manager strategy that weakens reproducibility.

Unsafe API routes and validation:
- INF-AUDIT-001 and INF-AUDIT-020 cover public room APIs exposing unsafe data and insufficient public query boundaries.
- INF-AUDIT-009 and INF-AUDIT-010 cover validation gaps around multipart and guest request endpoints.
- INF-AUDIT-018 covers public feedback/subscriber validation and tenant relationship gaps.
- INF-AUDIT-019 covers public link visibility.

Injection and XSS/HTML risks:
- INF-AUDIT-014 covers HTML injection in email templates.
- Frontend React rendering reduces direct DOM XSS risk in normal components, but email HTML is not protected by React escaping.

SSRF and remote fetch risks:
- INF-AUDIT-012 covers iCal sync fetching arbitrary URLs.

CSRF/session/token risks:
- Backend has CSRF checks for unsafe methods when signed auth cookies are present, which is a good base.
- INF-AUDIT-013 covers query-string guest status tokens leaking through logs/history/referers.
- INF-AUDIT-023 covers proxy/rate-limit deployment assumptions.

Payment and webhook risks:
- INF-AUDIT-003 is the critical online ordering payment flaw.
- INF-AUDIT-015 covers idempotency and transaction gaps.
- Payment webhook signature extraction exists, but lifecycle ordering and server-side amount verification are not safe enough for production.

File upload risks:
- INF-AUDIT-009 and INF-AUDIT-010 cover parsing/validation order.
- INF-AUDIT-047 covers storage growth and orphan cleanup.

Dependency and deployment risks:
- INF-AUDIT-016 must be handled before production hardening sign-off.
- INF-AUDIT-046 covers alternative stacks with unsafe defaults that should not be mistaken for deployable systems.

## 5. Logic and Product Flow Audit

Broken or incomplete user flows:
- Guest online ordering can produce payment/order mismatch because payment is confirmed before durable order creation and the backend trusts the client amount. See INF-AUDIT-003.
- Booking cancellation depends on `?by=guest` for the intended public path. See INF-AUDIT-024.
- Booking online payment settings are not reflected in a complete online payment flow. See INF-AUDIT-029.

Bad redirects and auth state:
- Admin login role checks do not clean up unauthorized backend sessions, and sign-out does not call backend logout. See INF-AUDIT-008.

Missing loading/error/empty states:
- Guest inactive room and expired/invalid status flows need more trustworthy UX. See INF-AUDIT-038.

Broken form handling:
- Multipart upload routes validate before parsing files and text fields. See INF-AUDIT-009.
- Survey prefill and required-answer logic are incorrect. See INF-AUDIT-028.
- Guest form validation is inconsistent and weak. See INF-AUDIT-039.

Data refresh and analytics:
- Guest tracking code contains stale endpoint calls and duplicate tracking paths. See INF-AUDIT-027.

Permission-based UI mismatch:
- Admin UI gating and backend authorization must be aligned. See INF-AUDIT-008 and INF-AUDIT-002.

Product opportunities:
- The strongest near-term product improvement is a secure, unified guest status center after privacy/token fixes. See INF-AUDIT-048.
- Premium module packaging should be defined before building more module-specific UI. See INF-AUDIT-042.

## 6. Architecture and Maintainability Audit

Folder and stack structure:
- The repository contains active backend/app/admin packages plus Dash, .NET, Django, archives, generated packages, and worktrees. This is workable only if active/legacy boundaries are explicit. See INF-AUDIT-017, INF-AUDIT-033, INF-AUDIT-037, and INF-AUDIT-046.

Separation of concerns:
- Guest order and booking pages mix pricing, payment, validation, API calls, and rendering. See INF-AUDIT-036.
- Backend public routes reuse admin/internal models and populate paths instead of guest-safe DTOs. See INF-AUDIT-001.

Repeated code and dead code:
- Stale translation utility calls a route that no longer exists in the active app. See INF-AUDIT-031.
- Dash fake-db paths and active admin overlap create duplication risk. See INF-AUDIT-037.

Naming and organization:
- Active-stack naming is confusing because `infiora-admin-main`, `infiora-dash-main`, and alternative stacks all look plausible. See INF-AUDIT-017 and INF-AUDIT-033.

Type safety and API/client boundary:
- API clients hardcode endpoint behavior instead of consuming a typed contract. See INF-AUDIT-050.
- Environment parsing exists in places but is not used consistently by all app code. See INF-AUDIT-030.

Error handling and logging:
- Error status conversion has a precedence bug. See INF-AUDIT-021.
- Logging needs redaction and structure. See INF-AUDIT-013 and INF-AUDIT-044.

Testing structure:
- Current tests do not cover the highest-risk active flows. See INF-AUDIT-034.

Scalability risks:
- Public responses are over-populated, important indexes are missing or uncertain, and media storage growth is not governed. See INF-AUDIT-001, INF-AUDIT-035, and INF-AUDIT-047.

## 7. Performance Audit

Client rendering issues:
- Large guest checkout/booking components increase rerender and state complexity risk. See INF-AUDIT-036.

Server rendering/API issues:
- Public room endpoints return more data than necessary, including populated hotel data. This increases payload size and serialization cost. See INF-AUDIT-001.

Expensive queries and database indexing:
- Add compound indexes for catalog, links, orders, bookings, and room active lookups after query cleanup. See INF-AUDIT-035.

Unnecessary re-renders and large dependencies:
- The audit did not perform a bundle analyzer run, but old Next/MUI/template surfaces and multiple active frontend apps increase bundle and maintenance risk. See INF-AUDIT-016 and INF-AUDIT-033.

Image/media optimization:
- Upload quotas, lifecycle cleanup, and object normalization are needed. See INF-AUDIT-047.

Caching opportunities:
- Guest-safe public room DTOs can be cached once they no longer expose sensitive hotel internals.
- Catalog/menu data can use cache headers or stale-while-revalidate if invalidation is tied to hotel updates.

API latency risks:
- iCal sync and other remote operations should be moved behind safe background jobs with timeouts. See INF-AUDIT-012.
- Email and translation side effects should not block guest-facing writes after core data is committed.

## 8. Database and Data Integrity Audit

Schema and relation risks:
- Room/group/link creation accepts parent IDs without ownership validation. See INF-AUDIT-002.
- Feedback and subscriber creation can mismatch room/hotel/user relationships. See INF-AUDIT-018.

Missing constraints and indexes:
- Add dedupe constraints for subscribers and operational idempotency keys.
- Add TTL for expired tokens and retention for audit logs. See INF-AUDIT-022.
- Add compound query indexes. See INF-AUDIT-035.

Missing cascade behavior:
- The audit did not verify safe cascading for hotel deletion/deactivation across rooms, links, catalog, bookings, orders, staff, iCal sources, feedback, and subscribers. This needs explicit deletion/deactivation policy before production.

Dangerous nullable fields:
- Public endpoints should not rely on nullable optional request fields for tenant identity or quantity. See INF-AUDIT-026 and INF-AUDIT-018.

Migration risks:
- Active Node/Mongoose stack relies on model/index behavior rather than a visible migration system.
- Alternative .NET stack uses database creation patterns unsuitable for mature production migrations. See INF-AUDIT-046.

Validation mismatch:
- Frontend and backend validation are inconsistent across orders, bookings, surveys, feedback, subscribers, maintenance, and housekeeping. See INF-AUDIT-010, INF-AUDIT-018, INF-AUDIT-039.

Multi-user data isolation:
- Tenant isolation must be fixed first through ownership checks and guest-safe DTOs. See INF-AUDIT-001 and INF-AUDIT-002.

Backup/restore concerns:
- No clear backup/restore policy was visible. Add MongoDB backup documentation, restore drills, and environment-specific storage backup policies before production.

## 9. Testing Audit

Missing unit tests:
- Error conversion status preservation. See INF-AUDIT-021.
- Email HTML escaping. See INF-AUDIT-014.
- Survey required-answer logic and prefilled submissions. See INF-AUDIT-028.
- URL safety validators for iCal sync. See INF-AUDIT-012.

Missing integration tests:
- Cross-tenant room/group/link create/list/update/delete denial. See INF-AUDIT-002.
- Guest-safe room response projection and active-only behavior. See INF-AUDIT-001 and INF-AUDIT-020.
- Maintenance/housekeeping validation and status updates. See INF-AUDIT-010.
- Booking/order transactions and idempotency. See INF-AUDIT-015.

Missing E2E tests:
- Guest room load, inactive room, order cash flow, online payment setup failure, booking create/cancel/status, maintenance/housekeeping request, feedback, and status link flows.
- Active admin login/logout/role denial, hotel management, room/group/link upload flows.
- Payment happy path should be tested with Stripe test mode/mocks after server-authoritative payment rewrite.

Missing security tests:
- SSRF blocked hostnames/private IPs for image proxy and iCal.
- Query token redaction in logs.
- CSRF behavior for cookie-authenticated unsafe methods.
- Rate limits for login/register/public guest endpoints.

Test setup problems:
- Root Playwright config targets Dash rather than active admin. See INF-AUDIT-017 and INF-AUDIT-034.
- Active frontend packages lack robust test scripts in root orchestration.
- Admin cannot be npm-audited without lockfile alignment.

Recommended exact test areas:
- `public-room-security.spec.ts`: asserts no hotel internal fields/table PINs/Stripe IDs in public responses.
- `tenant-authorization.spec.ts`: asserts users cannot create resources for another hotel.
- `guest-payment.spec.ts`: asserts amount tampering, PI reuse, and webhook/order race are rejected or reconciled.
- `guest-privacy.spec.ts`: asserts room bookings are not publicly listable without guest proof.
- `ssrf-guards.spec.ts`: asserts private and metadata URLs are rejected.
- `admin-auth.spec.ts`: asserts unauthorized role is logged out and cannot access protected admin pages.

## 10. UX/UI Improvement Opportunities

Confusing screens:
- Replace literal inactive/error states with polished guest-facing pages and staff contact guidance. See INF-AUDIT-038.
- Clarify booking payment labels and hide incomplete online booking payment options. See INF-AUDIT-029.

Missing feedback:
- Show clear checkout configuration errors when Stripe is unavailable rather than failing at payment time. See INF-AUDIT-030.
- Show retry paths for status links, expired tokens, and network failures. See INF-AUDIT-038.

Validation messages:
- Standardize field-level validation across order, booking, feedback, survey, maintenance, and housekeeping forms. See INF-AUDIT-039.

Empty states:
- Add empty states for no catalog items, no booking services, unavailable time slots, no active links, no requests, and no status history.

Accessibility:
- Add focus management for drawers/modals, keyboard navigation for forms, ARIA labeling for controls, visible validation text, and high-contrast error states.

Mobile responsiveness:
- Test checkout, booking confirmation, survey drawer, guest status, and catalog modifiers at narrow widths. Long text and buttons should not overflow.

Visual hierarchy and consistency:
- Use a consistent component system for guest cards, form fields, status chips, prices, and action buttons.
- Remove corrupted text and replace text pseudo-icons with proper icon components. See INF-AUDIT-040.

User trust improvements:
- Provide clear payment security copy only after payment implementation is safe.
- Add visible order/booking reference, status timestamps, hotel branding, and contact fallback.
- Send consistent confirmation emails with escaped content and plain-text alternatives. See INF-AUDIT-014.

## 11. Infiora Upgrade Ideas

### Core Product Improvements

- Upgrade title: Secure guest room data contract
  - Why it helps: Creates a stable, safe API for all guest experiences.
  - Complexity: Hard
  - Suggested wave: Wave 1
  - Dependencies: INF-AUDIT-001, INF-AUDIT-020, INF-AUDIT-050

- Upgrade title: Unified guest status center
  - Why it helps: Guests can track orders, bookings, requests, and support actions in one trusted place.
  - Complexity: Hard
  - Suggested wave: Wave 5
  - Dependencies: INF-AUDIT-013, INF-AUDIT-048

- Upgrade title: Service availability rules
  - Why it helps: Hotels can set hours, blackout dates, lead times, cutoff rules, and capacity per service.
  - Complexity: Medium
  - Suggested wave: Wave 5
  - Dependencies: Booking/order data integrity fixes

### Automation Improvements

- Upgrade title: Smart staff dispatch and escalation
  - Why it helps: Maintenance, housekeeping, and orders can route to the right staff group and escalate when stale.
  - Complexity: Hard
  - Suggested wave: Wave 5
  - Dependencies: Staff RBAC hardening, operational status model

- Upgrade title: Automated guest follow-ups
  - Why it helps: Sends timed satisfaction checks after orders/bookings/requests.
  - Complexity: Medium
  - Suggested wave: Wave 5
  - Dependencies: Email escaping, consent/subscriber cleanup

### AI/Intelligence Improvements

- Upgrade title: Feedback sentiment and theme summaries
  - Why it helps: Hotels see repeated complaints and compliments without manually reading every message.
  - Complexity: Medium
  - Suggested wave: Wave 5
  - Dependencies: Feedback validation/data quality

- Upgrade title: Multilingual content assistant
  - Why it helps: Helps hotels translate and localize room content, menus, and service descriptions.
  - Complexity: Hard
  - Suggested wave: Wave 5
  - Dependencies: Active translation architecture cleanup

- Upgrade title: Smart upsell suggestions
  - Why it helps: Recommends relevant add-ons based on room, time, order history, and hotel rules.
  - Complexity: Hard
  - Suggested wave: Future
  - Dependencies: Analytics quality, product entitlement strategy

### User Experience Improvements

- Upgrade title: Hospitality-grade error and empty states
  - Why it helps: Guests understand what happened and what to do next.
  - Complexity: Medium
  - Suggested wave: Wave 2
  - Dependencies: INF-AUDIT-038

- Upgrade title: Shared guest form system
  - Why it helps: Reduces inconsistent validation and improves mobile/accessibility behavior.
  - Complexity: Medium
  - Suggested wave: Wave 3
  - Dependencies: INF-AUDIT-039

### Admin/Analytics Improvements

- Upgrade title: Operational command center
  - Why it helps: Staff and managers see live orders, bookings, maintenance, housekeeping, and escalations.
  - Complexity: Hard
  - Suggested wave: Wave 5
  - Dependencies: Admin consolidation, staff RBAC

- Upgrade title: Revenue and conversion analytics
  - Why it helps: Shows order revenue, booking conversion, upsell performance, and room engagement.
  - Complexity: Medium
  - Suggested wave: Wave 5
  - Dependencies: Tracking cleanup, payment integrity

### Monetization Improvements

- Upgrade title: Plan tiers and module entitlements
  - Why it helps: Converts existing module flags into sellable plans.
  - Complexity: Hard
  - Suggested wave: Wave 5
  - Dependencies: INF-AUDIT-042, admin consolidation

- Upgrade title: Premium automation package
  - Why it helps: Monetizes dispatch, escalation, analytics, and AI summaries as higher-value features.
  - Complexity: Hard
  - Suggested wave: Future
  - Dependencies: Reliable operational workflows

### Reliability Improvements

- Upgrade title: Background job queue
  - Why it helps: Moves emails, webhooks, translation refresh, iCal sync, and retries out of request paths.
  - Complexity: Hard
  - Suggested wave: Wave 4
  - Dependencies: Data integrity and idempotency fixes

- Upgrade title: Observability baseline
  - Why it helps: Adds structured logs, request IDs, error monitoring, metrics, and health checks.
  - Complexity: Medium
  - Suggested wave: Wave 4
  - Dependencies: Logging redaction

### Security/Trust Improvements

- Upgrade title: Tenant isolation test suite
  - Why it helps: Prevents cross-hotel data access regressions.
  - Complexity: Medium
  - Suggested wave: Wave 1
  - Dependencies: Ownership fixes

- Upgrade title: Security dashboard for hotel admins
  - Why it helps: Shows audit logs, staff sessions, role changes, integration state, and risky settings.
  - Complexity: Hard
  - Suggested wave: Wave 5
  - Dependencies: Audit retention and staff RBAC

### Developer Experience Improvements

- Upgrade title: Typed API contract and generated clients
  - Why it helps: Prevents frontend/backend endpoint drift.
  - Complexity: Hard
  - Suggested wave: Wave 5
  - Dependencies: API shape stabilization

- Upgrade title: One-command active stack validation
  - Why it helps: Lets future agents run the same build/test/audit path reliably.
  - Complexity: Medium
  - Suggested wave: Wave 3
  - Dependencies: Active stack decision

## 12. Suggested Implementation Waves

### Wave 1 - Critical Stabilization and Security

Goal:
- Stop the highest-risk security, privacy, and payment issues before product expansion.

Must fix:
- INF-AUDIT-001
- INF-AUDIT-002
- INF-AUDIT-003
- INF-AUDIT-007
- INF-AUDIT-008
- INF-AUDIT-010
- INF-AUDIT-012
- INF-AUDIT-013
- INF-AUDIT-014
- INF-AUDIT-016
- INF-AUDIT-020
- INF-AUDIT-026

Steps:
1. Implement guest-safe public room DTOs in `room.service.ts`, `room.controller.ts`, and route validation; remove full hotel populate from public routes.
2. Add ownership middleware to room/group/link create and list routes in `room.route.ts`, `group.route.ts`, and `link.route.ts`.
3. Rewrite online order payment flow in `orders.controller.ts`, `orders.service.ts`, `stripe.service.ts`, and `stripe-webhook.handler.ts` so backend calculates amounts and verifies Stripe state.
4. Restrict `src/app/api/image-proxy/route.ts` and `next.config.mjs` to allowed hosts and private-IP blocking.
5. Remove committed `.env`, upload, temp, and seed-secret artifacts from tracking after reviewing git status; rotate any reused values.
6. Replace public room booking listing with token-scoped or proof-based guest booking access.
7. Enforce inactive/unverified user policy in `auth.service.ts`.
8. Harden active admin auth guard, logout, unauthorized role handling, and redirect validation.
9. Add validation and update validators to maintenance/housekeeping routes.
10. Add staff role/group hotel scoping and stale-token invalidation.
11. Add safe URL validation for iCal source fetches.
12. Redact query tokens from logs and redesign status-token exchange.
13. Escape all user data in email templates.
14. Standardize the package manager enough to run audits, then upgrade critical/high production dependencies.
15. Add regression tests for each fixed P0/P1 path.

Exit Criteria:
- Public room responses contain no internal hotel fields, table PINs, Stripe IDs, owner IDs, or security config.
- Cross-tenant create/list/update/delete tests fail before fix and pass after fix.
- Order payment cannot be underpaid, reused, or created from a mismatched PaymentIntent.
- SSRF tests reject private, loopback, link-local, and metadata URLs.
- Inactive users cannot log in.
- Admin logout clears backend session.
- `npm audit` is rerun and production critical vulnerabilities are removed or explicitly documented with mitigation.

### Wave 2 - Core Logic and UX Fixes

Goal:
- Fix broken product flows, multipart handling, inconsistent validation, and active-stack automation.

Must fix:
- INF-AUDIT-009
- INF-AUDIT-015
- INF-AUDIT-017
- INF-AUDIT-018
- INF-AUDIT-019
- INF-AUDIT-021
- INF-AUDIT-023
- INF-AUDIT-024
- INF-AUDIT-025
- INF-AUDIT-027
- INF-AUDIT-028
- INF-AUDIT-030
- INF-AUDIT-038
- INF-AUDIT-039
- INF-AUDIT-040

Steps:
1. Reorder multipart middleware and validation for hotel, room, group, and link upload routes.
2. Add transactions or compensating rollback/idempotency for booking/order/discount writes.
3. Restore/update root active-stack docs and align `Validate-Workspace.ps1`, `Start-InfioraActive.ps1`, `start-infiora-all.bat`, and Playwright targets.
4. Derive feedback/subscriber tenant fields from server-side room/user lookup and add strict validation.
5. Enforce public link active visibility.
6. Fix error converter status-code precedence.
7. Configure proxy-aware rate limits and targeted public endpoint limiters.
8. Split guest/staff booking cancellation behavior.
9. Make discount preview server-authoritative.
10. Consolidate guest analytics tracking on current POST endpoints.
11. Fix survey prefill, required-answer, and progress logic.
12. Validate Stripe publishable-key behavior and hide online payment if config is incomplete.
13. Improve guest error, empty, and expired-status states.
14. Normalize corrupted text and add a mojibake check.

Exit Criteria:
- Upload-backed create/update flows pass JSON and multipart tests.
- Booking/order capacity and discount counters remain consistent under failure tests.
- Root validation scripts pass and point only to active apps.
- Guest UI has clear failure states for inactive room, expired token, empty services, and missing payment config.
- Stale analytics endpoints are removed.

Status:
- Wave 2 closed on 2026-05-16.
- Final cleanup included guest inactive/expired/empty states, booking-page payment option normalization, corrupted-text removal in active guest flows, and an active-stack mojibake regression check wired into `Validate-Workspace.ps1`.

### Wave 3 - Architecture and Maintainability Refactor

Goal:
- Reduce app ambiguity, remove stale code, and make future work safer.

Must fix:
- INF-AUDIT-031
- INF-AUDIT-032
- INF-AUDIT-033
- INF-AUDIT-036
- INF-AUDIT-037
- INF-AUDIT-041
- INF-AUDIT-043
- INF-AUDIT-044
- INF-AUDIT-045
- INF-AUDIT-046

Steps:
1. Decide the single active admin surface and archive or remove active references to the other.
2. Standardize one package manager and lockfile strategy across active packages.
3. Remove stale translation utilities or replace them with an active backend client.
4. Extract order/booking guest page logic into tested services/hooks/components after security behavior is stable.
5. Refactor ownership middleware into clear admin/owner/manager/staff policies.
6. Replace brittle PowerShell command execution patterns and improve tool output.
7. Replace frontend debug logs and backend console logs with structured/redacted logging.
8. Clean generated artifacts from tracked source and add CI checks.
9. Mark .NET, Django, archive, and worktree folders as non-active or give them explicit CI/security ownership.

Exit Criteria:
- A new contributor or agent can identify the active backend, guest app, and admin app from root docs and scripts.
- Only one lockfile strategy remains for active packages.
- Large guest flows have extracted, tested business logic.
- Generated/vendor/build artifacts are not tracked or surfaced in normal reviews.

Status:
- Wave 3 implementation snapshot recorded on 2026-05-16.
- Completed: stale translation utility removed, Invoke-Expression replaced in PS scripts, yarn lockfiles removed from active packages (npm standardized, admin got package-lock.json with --legacy-peer-deps), dash archived with ARCHIVE-STATUS.md and docs/alternative-stacks.md updated, .gitignore extended (*.tsbuildinfo, logs/), Validate-Workspace CI artifact check added, backend console.error → winston logger in group/link/room/orders services, frontend debug console.log removed across guest app and admin, ownership middleware null-hotel 404 fix and isAccessibleUser 400 fix, orderUtils/guestValidation/orderTracking/StripePaymentForm extracted from GuestOrderPage. INF-AUDIT-046 (alt stacks archive) deferred. INF-AUDIT-033/037 resolved by ARCHIVE-STATUS marker and docs.

### Wave 4 - Performance, Testing, and Scalability

Goal:
- Add confidence, observability, scalability, and operational durability.

Must fix:
- INF-AUDIT-022
- INF-AUDIT-034
- INF-AUDIT-035
- INF-AUDIT-047

Steps:
1. Add TTL indexes or scheduled cleanup for expired tokens and audit retention.
2. Build backend integration tests for tenant isolation, public DTO privacy, payment idempotency, SSRF, staff RBAC, CSRF, and status tokens.
3. Retarget and expand Playwright tests for active guest and active admin critical flows.
4. Add MongoDB indexes based on final query patterns and verify with explain plans.
5. Add storage quotas, lifecycle cleanup, orphaned file cleanup, and media monitoring.
6. Introduce background jobs for email, iCal sync, translation refresh, webhook retries, and operational notifications.
7. Add structured logs, request IDs, metrics, health checks, and error monitoring.

Exit Criteria:
- Critical security and guest flows have automated regression coverage.
- Query plans for high-volume endpoints use intended indexes.
- Expired tokens and old audit logs are cleaned up according to documented policy.
- Media storage has quota/lifecycle controls.
- Production monitoring can identify API errors, payment failures, queue failures, and latency.

Status:
- Wave 4 implementation snapshot recorded on 2026-05-16.
- Completed: token TTL index (expireAfterSeconds: 0 on expires field), configurable audit-log retention TTL (default 90 days via AUDIT_LOG_RETENTION_DAYS). Compound indexes added to catalog-item (hotelId+categoryId+available+sortOrder, hotelId+available+sortOrder), link (room+isActive+position, group+isActive+position), room (hotel+isActive), feedback (hotel+createdAt, hotel+room+createdAt). Three backend integration test files: ssrf-guards.test.ts (18 tests, all passing), public-room-security.test.ts (DTO leak assertions), tenant-isolation.test.ts (cross-tenant 403 enforcement). Playwright E2E expanded with 404 handling, admin invalid-credentials toast, and protected-route redirect. storageQuota.ts (per-hotel upload count), cleanupOrphanedUploads.ts (disk vs DB diff + safe delete), cleanupOrphanedUploadsJob.ts (weekly cron, Sun 03:00 UTC) wired into index.ts. Deferred: background jobs for email/translation/webhook retries (Step 6), structured request-ID logging and health check metrics (Step 7) — these require broader infrastructure decisions.

### Wave 5 - Product Upgrades and Advanced Features

Goal:
- Turn the stabilized platform into a stronger hospitality product and business.

Must fix:
- INF-AUDIT-029
- INF-AUDIT-042
- INF-AUDIT-048
- INF-AUDIT-049
- INF-AUDIT-050

Steps:
1. Decide whether bookings support online payment; if yes, implement server-authoritative booking payments using the corrected payment architecture.
2. Define pricing tiers, module entitlements, and Stripe billing/subscription integration.
3. Build a secure unified guest status center.
4. Add operational command-center features for orders, bookings, maintenance, housekeeping, staff routing, and escalations.
5. Add analytics dashboards for revenue, conversion, room engagement, service usage, and staff workload.
6. Add AI-assisted feedback summaries, multilingual content suggestions, and smart upsell recommendations with human review.
7. Replace the stale route contract with OpenAPI or a typed schema/client generation workflow.

Exit Criteria:
- Feature access is tied to explicit hotel entitlements.
- Hotels can understand guest activity, revenue, and operations from one admin surface.
- AI features are opt-in, auditable, and based on clean data.
- Frontend clients consume typed API contracts instead of hardcoded assumptions.

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

### Prompt for Security Regression Tests

```text
You are Codex GPT-5.5. Read `INFIORA_FULL_PROJECT_AUDIT_AND_UPGRADE_PLAN.md`.

Create security regression tests only for findings: INF-AUDIT-XXX, INF-AUDIT-YYY.

Rules:
- Do not change production behavior unless a tiny testability hook is unavoidable.
- Tests must fail against the vulnerable behavior and pass after the intended fix.
- Cover unauthorized tenant access, guest/public access, malformed input, and success paths.
- Summarize the test files added and the exact risks they protect.
```

### Prompt for Code Review After a Wave

```text
You are Codex GPT-5.5 acting as a senior security-focused code reviewer.

Review the implementation of Wave X against `INFIORA_FULL_PROJECT_AUDIT_AND_UPGRADE_PLAN.md`.

Focus on:
- Whether every Wave X finding was actually fixed.
- Whether source changes introduced regressions or broad unrelated refactors.
- Whether tests cover the original risk.
- Whether any claimed security fix is only implemented in the frontend.

Return findings first, ordered by severity, with file references and concrete fixes.
```

## 14. Final Recommendations

What must be fixed first:
- Public room data leakage and guest-safe DTOs: INF-AUDIT-001 and INF-AUDIT-020.
- Cross-tenant ownership gaps: INF-AUDIT-002.
- Stripe payment authority and idempotency: INF-AUDIT-003.
- SSRF in iCal sync: INF-AUDIT-012.
- Dependency criticals: INF-AUDIT-016.

What should be fixed second:
- Status-token leakage, email HTML injection, inactive-user login, and admin auth/logout behavior.
- Multipart validation ordering, error status handling, and guest request validation.
- Active-stack docs/scripts/tests alignment so future work lands in the correct app.

What can wait:
- Large frontend refactors, generated API clients, AI features, advanced analytics, media quotas, and monetization packaging can wait until the security boundary is stable.

What should not be done yet:
- Do not add online booking payments before online order payments are server-authoritative.
- Do not build major admin features until the active admin versus dash decision is made.
- Do not add AI automation until feedback/order/booking data quality and privacy boundaries are corrected.
- Do not rely on frontend-only checks for authorization or payment safety.

What could make Infiora significantly better:
- A secure guest status center, an operational command center for hotels, reliable payment and booking workflows, premium module entitlements, analytics, staff automation, and AI-assisted hospitality insights.

Recommended next move:
- Start Wave 1 with INF-AUDIT-001, INF-AUDIT-002, and INF-AUDIT-003 as a single security stabilization sprint, with regression tests added before or alongside each fix.
