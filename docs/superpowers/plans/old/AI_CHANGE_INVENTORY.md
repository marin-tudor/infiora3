# Infiora AI Change Inventory

Comparison date: 2026-05-08

Old deployed baseline: `C:\Users\Tudor\infiora 27022026`

New AI-assisted codebase: `C:\Users\Tudor\infiora`

## Scope And Method

This report compares the old deployed code against the current AI-assisted codebase. The comparison focused on source code, route files, models, UI pages, API clients, config, and project-level scripts. Generated/vendor/runtime outputs were ignored for the functional summary where possible: `node_modules`, `.git`, `.next`, `dist`, `build`, `coverage`, `logs`, uploads, lockfiles, `.log`, and `.tsbuildinfo`.

Project pairs compared:

| Area | Old path | New path |
| --- | --- | --- |
| Public guest app | `infiora-app-main (1)\infiora-app-main` | `infiora-app-main\infiora-app-main` |
| Dashboard | `infiora-dash-main (1)\infiora-dash-main` | `infiora-dash-main\infiora-dash-main` |
| Node backend | `infiora-backend-main (1)\infiora-backend-main` | `infiora-backend-main\infiora-backend-main` |
| .NET API | `infiora-api-main\infiora-api-main` | `infiora-api-main\infiora-api-main` |
| Django API | `infiora-django-main (1)\infiora-django-main` | `infiora-django-main\infiora-django-main` |
| Admin app | `infiora-admin-main (1)\infiora-admin-main` | `infiora-admin-main\infiora-admin-main` |
| Legacy Vite/Supabase app | `infiora-main\infiora-main` | Not present in new root as an active app |

## High-Level Diff Summary

| Project | Old functional files | New functional files | Added | Modified | Removed |
| --- | ---: | ---: | ---: | ---: | ---: |
| Public guest app | 60 | 95 | 36 | 20 | 1 |
| Dashboard | 739 | 814 | 76 | 58 | 1 |
| Node backend | 175 | 261 | 86 | 56 | 0 |
| .NET API | 51 | 53 | 2 | 5 | 0 |
| Django API | 67 | 116 | 49 | 4 | 0 |
| Admin app | 171 | 183 | 12 | 21 | 0 |
| Legacy Vite/Supabase app | 364 | 0 | 0 | 0 | 364 |

## 1. Guest Ordering System

Title: Guest-facing order page and checkout flow

Description: The public guest app now has a dedicated ordering experience where guests can open a room-specific order URL, browse categories/items, add products to cart, choose payment method, provide reservation/table proof, schedule an order, submit it, and track its progress.

Purpose: Enables room service, restaurant/table ordering, and self-service guest purchases from the QR/public room experience.

How it was implemented:

- Frontend route added at `infiora-app-main\infiora-app-main\src\app\[id]\order\page.tsx`.
- Main guest UI implemented in `infiora-app-main\infiora-app-main\src\views\orders\GuestOrderPage.tsx`.
- Backend public catalog endpoint added in `infiora-backend-main\infiora-backend-main\src\routes\v1\orders.route.ts` with `GET /v1/orders/rooms/:roomId/catalog`.
- Backend order placement endpoint added in `orders.route.ts` with `POST /v1/orders/rooms/:roomId`.
- Backend controller and serialization added in `src\modules\orders\orders.controller.ts`.
- Backend business logic, order totals, reservation/PIN validation, tracking tokens, dispatch routing, scheduled-order behavior, and notifications are handled in `src\modules\orders\orders.service.ts`.
- Data model added in `src\modules\orders\guest-order.model.ts`.
- Validation rules added in `src\modules\orders\orders.validation.ts`.

Important files:

- `infiora-app-main\infiora-app-main\src\views\orders\GuestOrderPage.tsx`
- `infiora-backend-main\infiora-backend-main\src\modules\orders\orders.controller.ts`
- `infiora-backend-main\infiora-backend-main\src\modules\orders\orders.service.ts`
- `infiora-backend-main\infiora-backend-main\src\modules\orders\guest-order.model.ts`
- `infiora-backend-main\infiora-backend-main\src\routes\v1\orders.route.ts`

## 2. Order Management Dashboard

Title: Dashboard order operations module

Description: The dashboard now includes an Orders section with dashboard analytics, live active orders, menu/category/item management, scheduled orders, settings, and reservation-code management.

Purpose: Gives hotel/admin staff a control panel for menu setup, active order handling, and operational order monitoring.

How it was implemented:

- Dashboard route added at `infiora-dash-main\infiora-dash-main\src\app\[lang]\(private)\orders\page.tsx`.
- Scheduled orders route added at `src\app\[lang]\(private)\orders\scheduled\page.tsx`.
- Tabbed order page implemented in `src\views\orders\pages\OrdersPage.tsx`.
- Active order list implemented in `src\views\orders\components\ActiveOrders.tsx`.
- Dashboard cards and order metrics implemented in `src\views\orders\components\OrdersDashboard.tsx`.
- Menu/category/item CRUD implemented in `src\views\orders\components\MenuManagement.tsx`, `CategoryDialog.tsx`, and `ItemDialog.tsx`.
- Order setup/settings implemented in `src\views\orders\components\OrderSettings.tsx`.
- Reservation-code UI implemented in `src\views\orders\components\ReservationCodes.tsx`.
- Redux API client added in `src\redux\api\ordersApi.ts`.

Important backend support:

- `GET /v1/orders/hotels/:hotelId`
- `GET /v1/orders/hotels/:hotelId/events`
- `GET /v1/orders/hotels/:hotelId/analytics`
- `GET/PATCH /v1/orders/hotels/:hotelId/settings`
- Category, item, code, promotion, accept, advance, and cancel endpoints in `src\routes\v1\orders.route.ts`.

## 3. Real-Time Orders With SSE

Title: Real-time order notifications and live updates

Description: The backend now pushes real-time order events using Server-Sent Events, and the dashboard/tablet surfaces pending counts and notifications.

Purpose: Staff can see new orders and status changes without manually refreshing the page.

How it was implemented:

- SSE service added in `infiora-backend-main\infiora-backend-main\src\modules\orders\sse.service.ts`.
- Admin SSE route added as `GET /v1/orders/hotels/:hotelId/events`.
- Tablet/group SSE route added as `GET /v1/orders/groups/:groupId/events`.
- Dashboard SSE hook added in `infiora-dash-main\infiora-dash-main\src\hooks\useOrdersSSE.ts`.
- Pending count hook added in `src\hooks\useUnfinishedOrdersCount.ts`.
- Dashboard order bell added in `src\components\layout\shared\OrderNotificationBell.tsx`.
- Request bell for housekeeping/maintenance added in `src\components\layout\shared\RequestsNotificationBell.tsx`.

## 4. Menu, Catalog, Modifiers, Promotions, And Reservation Codes

Title: Order catalog management

Description: Menu categories, menu items, modifiers/add-ons, item images, availability, ordering settings, promotions, and reservation codes were added.

Purpose: Lets staff manage what guests can order, how items are displayed, which payments are available, and which guests can place protected orders.

How it was implemented:

- Category model added in `src\modules\orders\order-category.model.ts`.
- Item model added in `src\modules\orders\catalog-item.model.ts`.
- Promotion model added in `src\modules\orders\order-promotion.model.ts`.
- Reservation-code model added in `src\modules\orders\reservation-code.model.ts`.
- Interfaces added in `src\modules\orders\orders.interfaces.ts`.
- Menu CRUD endpoints are in `src\routes\v1\orders.route.ts`.
- Dashboard UI is in `infiora-dash-main\infiora-dash-main\src\views\orders\components\MenuManagement.tsx`, `ItemDialog.tsx`, `CategoryDialog.tsx`, and `ReservationCodes.tsx`.
- Admin app also received partial order/staff API wiring in `infiora-admin-main\infiora-admin-main\src\redux\api\ordersApi.ts`.

Notable behavior:

- Items can be `instant` or `bookable`.
- Items support image types `emoji`, `url`, and `upload`.
- Orders can require reservation code or table PIN depending on venue mode.
- Orders can be scheduled for later.
- Reservation codes include check-in/check-out windows and can be room-scoped.

## 5. Bookable Services And Booking Engine

Title: Guest booking flow and admin booking management

Description: A new booking engine was added for reservable services such as tours, transfers, rentals, appointments, spa slots, or other bookable catalog items.

Purpose: Allows guests to browse available time slots, book a service, join a waitlist when unavailable, and allows staff to approve/cancel/complete bookings.

How it was implemented:

- Guest browse page added at `infiora-app-main\infiora-app-main\src\views\bookings\GuestBookingsBrowsePage.tsx`.
- Guest confirmation page added at `src\views\bookings\GuestBookingConfirmPage.tsx`.
- Guest "my bookings" page added at `src\views\bookings\GuestMyBookingsPage.tsx`.
- Public routes added at `src\app\[id]\bookings\page.tsx`, `src\app\[id]\bookings\confirm\page.tsx`, and `src\app\[id]\bookings\my-bookings\page.tsx`.
- Backend booking routes added in `infiora-backend-main\infiora-backend-main\src\routes\v1\booking.route.ts`.
- Backend booking controller added in `src\modules\booking\booking.controller.ts`.
- Booking logic added in `src\modules\booking\booking.service.ts`.
- Data models added:
  - `src\modules\booking\booking.model.ts`
  - `src\modules\booking\time-slot.model.ts`
  - `src\modules\booking\booking-counter.model.ts`
  - `src\modules\booking\booking-waitlist.model.ts`
  - `src\modules\booking\service-resource.model.ts`
  - `src\modules\booking\blackout-date.model.ts`
- Dashboard booking page added at `infiora-dash-main\infiora-dash-main\src\views\bookings\pages\BookingsPage.tsx`.
- Dashboard API client added in `src\redux\api\bookingApi.ts`.

Notable behavior:

- Bookings generate guest cancellation tokens.
- Bookings generate guest status tokens.
- Booking references are generated by date.
- Supports private and shared slots.
- Supports waitlist notifications.
- Supports pending approval, confirmed, cancelled, completed, and no-show statuses.
- Supports automatic NPS email scheduling after completed bookings.

## 6. Booking Calendar, Resources, Blackout Dates, And Slot Generation

Title: Advanced booking operations

Description: The dashboard now includes calendar views, resource timeline views, blackout-date management, and slot generation for bookable services.

Purpose: Gives operators tools to manage capacity and prevent overbooking.

How it was implemented:

- Booking calendar and list page implemented in `infiora-dash-main\infiora-dash-main\src\views\bookings\pages\BookingsPage.tsx`.
- Service availability calendar implemented in `src\views\bookings\components\ItemAvailabilityCalendar.tsx`.
- Resource timeline implemented in `src\views\bookings\components\ResourceCalendar.tsx`.
- Resource CRUD/settings UI implemented in `src\views\bookings\components\ResourcesTab.tsx`.
- Blackout-date panel implemented in `src\views\bookings\components\BlackoutDatesPanel.tsx`.
- Backend blackout controller added in `src\modules\booking\blackout-date.controller.ts`.
- Slot generation scheduler added in `src\modules\scheduler\slotGeneration.ts`.
- Manual trigger route added in backend hotel routes: `POST /v1/hotels/:hotelId/timeslots/generate`.

## 7. Staff RBAC

Title: Staff role-based access control

Description: A staff-role system was added where staff members log in with a 4-digit PIN and receive limited permissions and visible modules based on their assigned role.

Purpose: Allows non-admin hotel staff to use tablets or operational screens without full owner/admin access.

How it was implemented:

- Backend staff routes added in `infiora-backend-main\infiora-backend-main\src\routes\v1\staff.route.ts`.
- Staff controller added in `src\modules\staff\staff.controller.ts`.
- Staff service added in `src\modules\staff\staff.service.ts`.
- Staff member model added in `src\modules\staff\staff-member.model.ts`.
- Staff role model added in `src\modules\staff\staff-role.model.ts`.
- Permission definitions added in `src\modules\staff\staff.interfaces.ts`.
- PIN verification endpoint added at `POST /v1/hotels/:hotelId/staff/verify-pin`.
- Staff auth middleware added in `src\modules\middleware\staffAuth.ts`.
- Dashboard staff members page added in `infiora-dash-main\infiora-dash-main\src\views\staff\pages\StaffPage.tsx`.
- Dashboard staff roles page added in `src\views\staff\pages\StaffRolesPage.tsx`.
- Staff API client added in `src\redux\api\staffApi.ts`.

Notable behavior:

- Staff members have PINs, roles, active/inactive state, and notification group assignments.
- Roles define permissions and visible modules.
- Staff actions are audited with audit logs.

## 8. Tablet Staff Interface

Title: Tablet mode for staff order handling

Description: A separate tablet route was added for group-based order handling by staff.

Purpose: Lets operational teams such as kitchen, housekeeping, or front desk process routed orders on a simplified screen.

How it was implemented:

- Tablet layout added at `infiora-dash-main\infiora-dash-main\src\app\[lang]\(tablet)\layout.tsx`.
- Tablet page added at `src\app\[lang]\(tablet)\tablet\[groupId]\page.tsx`.
- Main tablet UI implemented in `src\views\tablet\pages\TabletPage.tsx`.
- Tablet setup panel added in `src\views\staff\components\TabletSetupPanel.tsx`.
- Backend device-token generation added in `infiora-backend-main\infiora-backend-main\src\routes\v1\hotel.route.ts`.
- Device-token middleware added in `src\modules\middleware\isDeviceAuth.ts`.
- Group-specific SSE and pending-count endpoints added in `src\routes\v1\orders.route.ts`.

## 9. Smart Dispatching And Notification Groups

Title: Smart dispatch rules

Description: The backend and dashboard now support notification groups and dispatch rules that route events to the correct operational group.

Purpose: Sends orders, bookings, maintenance, or housekeeping tasks to the right team based on event type, category, or item.

How it was implemented:

- Dispatch routes added in `infiora-backend-main\infiora-backend-main\src\routes\v1\dispatch.route.ts`.
- Dispatch controller added in `src\modules\dispatch\dispatch.controller.ts`.
- Dispatch service added in `src\modules\dispatch\dispatch.service.ts`.
- Dispatch rule model added in `src\modules\dispatch\dispatch-rule.model.ts`.
- Notification group model added in `src\modules\dispatch\notification-group.model.ts`.
- Dashboard dispatch rules page added in `infiora-dash-main\infiora-dash-main\src\views\staff\pages\DispatchRulesPage.tsx`.
- Dashboard notification groups page added in `src\views\staff\pages\NotificationGroupsPage.tsx`.
- Staff setup route pages added under `src\app\[lang]\(private)\staff\...`.

Notable behavior:

- Rules include priority, event types, category filters, item filters, target group, active flag, and escalation seconds.
- Dashboard supports drag-and-drop priority changes.

## 10. Housekeeping Requests

Title: Guest housekeeping request system

Description: Guests can submit housekeeping requests from the public room page, and staff can view and update request status in the dashboard.

Purpose: Converts QR room pages into operational request intake for cleaning, towels, pillows, amenities, do-not-disturb, extra bed, and other room service requests.

How it was implemented:

- Guest drawer added at `infiora-app-main\infiora-app-main\src\views\rooms\details\components\HousekeepingDrawer.tsx`.
- Room page button integration added in `src\views\rooms\details\components\RoomView.tsx`.
- Backend route added in `infiora-backend-main\infiora-backend-main\src\routes\v1\housekeeping.route.ts`.
- Backend controller added in `src\modules\housekeeping\housekeeping.controller.ts`.
- Backend service added in `src\modules\housekeeping\housekeeping.service.ts`.
- Data model added in `src\modules\housekeeping\housekeeping.model.ts`.
- Dashboard page added in `infiora-dash-main\infiora-dash-main\src\views\housekeeping\pages\HousekeepingPage.tsx`.
- Dashboard API client added in `src\redux\api\housekeepingApi.ts`.
- Shared dashboard edit tabs added in `src\views\shared\tabs\HousekeepingMaintenanceTab.tsx`.

Notable behavior:

- Public create endpoint is rate-limited.
- Optional reservation-code proof and room-number proof are supported.
- Duplicate requests are suppressed inside a 15-minute window.
- Guest receives a status token in the response.
- Dashboard shows pending/in-progress counts and status actions.

## 11. Maintenance Issues

Title: Guest maintenance issue reporting

Description: Guests can submit maintenance reports, optionally with a photo, and staff can process them from the dashboard.

Purpose: Adds operational maintenance intake for AC, plumbing, electrical, TV, WiFi, furniture, and other issue types.

How it was implemented:

- Guest drawer added at `infiora-app-main\infiora-app-main\src\views\rooms\details\components\MaintenanceDrawer.tsx`.
- Room page button integration added in `src\views\rooms\details\components\RoomView.tsx`.
- Backend route added in `infiora-backend-main\infiora-backend-main\src\routes\v1\maintenance.route.ts`.
- Backend controller added in `src\modules\maintenance\maintenance.controller.ts`.
- Backend service added in `src\modules\maintenance\maintenance.service.ts`.
- Data model added in `src\modules\maintenance\maintenance.model.ts`.
- Dashboard page added in `infiora-dash-main\infiora-dash-main\src\views\maintenance\pages\MaintenancePage.tsx`.
- Dashboard API client added in `src\redux\api\maintenanceApi.ts`.

Notable behavior:

- Public create endpoint is rate-limited.
- Photo upload is limited to images and max 5 MB.
- Uploaded photo is sent through S3 utility code.
- Duplicate issues are suppressed inside a 15-minute window using text/photo hash.
- Guest receives a status token in the response.

## 12. Guest Status Center

Title: Private guest status lookup

Description: Guests can request a private email link to view their recent orders and bookings for a hotel.

Purpose: Gives guests a way to recover/check statuses after closing the browser tab.

How it was implemented:

- Guest status page added at `infiora-app-main\infiora-app-main\src\app\[id]\guest-status\page.tsx`.
- UI added in `src\views\status\GuestStatusLookupPage.tsx`.
- Frontend helper storage added in `src\lib\guestStatusCenter.ts`.
- Backend status-link endpoint added in `src\routes\v1\orders.route.ts` at `POST /v1/orders/rooms/:roomId/status-link`.
- Backend status lookup endpoint added in `orders.route.ts` at `GET /v1/orders/guest-status`.
- Token generation and lookup logic added in `src\modules\orders\orders.service.ts`.

## 13. Guest Activity And Visit Tracking

Title: Anonymous activity tracking improvements

Description: Visitor/session tracking was expanded for room views, order-page visits, order conversions, service button taps, and analytics.

Purpose: Improves analytics without relying on personally identifiable guest accounts.

How it was implemented:

- Anonymous visitor ID helper added in `infiora-app-main\infiora-app-main\src\lib\visitorIdentity.ts`.
- Activity tracker component added in `src\components\tracking\ActivityTracker.tsx`.
- Room context updated to send `visitorId` on room view tracking in `src\contexts\RoomContext.tsx`.
- Order visit tracking added in `GuestOrderPage.tsx`.
- Backend order visit model added in `infiora-backend-main\infiora-backend-main\src\modules\orders\order-visit.model.ts`.
- Backend visit endpoints added in `src\routes\v1\orders.route.ts`.

## 14. Analytics And Operations Overview

Title: Expanded analytics

Description: New analytics endpoints and dashboard pages aggregate revenue, ratings, bookings, operations, SLA/dispatch data, housekeeping, and maintenance.

Purpose: Gives hotel operators a broader view of operational performance and revenue.

How it was implemented:

- Backend analytics module added in `infiora-backend-main\infiora-backend-main\src\modules\analytics`.
- Analytics route added in `src\routes\v1\analytics.route.ts`.
- Operations overview service added in `src\modules\hotel\hotel.operations.ts`.
- Dashboard analytics page added in `infiora-dash-main\infiora-dash-main\src\views\analytics\pages\AnalyticsPage.tsx`.
- New insights tabs added:
  - `src\views\insights\components\OverviewTab.tsx`
  - `src\views\insights\components\OperationsOverviewTab.tsx`
  - `src\views\insights\components\OrdersAnalyticsTab.tsx`
  - `src\views\insights\components\RevenueAnalyticsTab.tsx`
  - `src\views\insights\components\RoomsTab.tsx`
  - `src\views\insights\components\ButtonsTab.tsx`
  - `src\views\insights\components\ReportsTab.tsx`
- Dashboard API client added in `src\redux\api\analyticsApi.ts`.

## 15. Surveys

Title: Custom survey support

Description: Rooms and groups now support configurable guest surveys with multiple question types.

Purpose: Allows hotels to collect structured guest feedback beyond simple rating/comment forms.

How it was implemented:

- Public survey drawer added in `infiora-app-main\infiora-app-main\src\views\rooms\details\components\SurveyDrawer.tsx`.
- Room view button/popup integration added in `src\views\rooms\details\components\RoomView.tsx`.
- Survey translations added in `src\utils\surveyTranslations.ts`.
- Survey types added to `src\types\index.ts`.
- Backend room/group schemas extended in `infiora-backend-main\infiora-backend-main\src\modules\room\room.interfaces.ts`, `room.model.ts`, `room.validation.ts`, `group.interfaces.ts`, `group.model.ts`, and `group.validation.ts`.
- Dashboard configuration tab added in `infiora-dash-main\infiora-dash-main\src\views\shared\tabs\SurveyTab.tsx`.

Supported question types:

- Rating
- Yes/no
- Single choice
- Multiple choice
- Open text
- NPS
- Matrix
- Contact

## 16. Improved Feedback Flow

Title: Feedback drawer and detailed feedback management

Description: The guest feedback drawer and dashboard feedback table were expanded for richer feedback handling, survey answers, filters, and detail views.

Purpose: Makes guest satisfaction data more actionable for operators.

How it was implemented:

- Public feedback drawer modified in `infiora-app-main\infiora-app-main\src\views\rooms\details\components\FeedbackDrawer.tsx`.
- Backend feedback model/interfaces modified in `infiora-backend-main\infiora-backend-main\src\modules\feedback`.
- Dashboard feedback page modified in `infiora-dash-main\infiora-dash-main\src\views\feedbacks\pages\FeedbacksPage.tsx`.
- Feedback table modified in `src\views\feedbacks\components\FeedbacksTable.tsx`.
- Feedback detail drawer added in `src\views\feedbacks\components\FeedbackDetailDrawer.tsx`.

## 17. Hotel And Room Map Features

Title: Interactive map points and map section

Description: Hotels now support map settings and map points, and public room pages can show a map section linked to blog/guide content.

Purpose: Lets hotels expose nearby places, internal amenities, directions, and guide points directly inside the room experience.

How it was implemented:

- Frontend map utilities added in `infiora-app-main\infiora-app-main\src\utils\mapUtils.ts`.
- Public map UI added in `src\views\rooms\details\components\RoomMapSection.tsx` and `RoomMapCanvas.tsx`.
- Blog drawer and links list modified to support "show on map" behavior.
- Dashboard map picker added in `infiora-dash-main\infiora-dash-main\src\views\hotels\components\MapPointLocationPicker.tsx`.
- Dashboard map settings UI added in `src\views\hotels\components\MapSettingsSection.tsx`.
- Dashboard map overview added in `src\views\hotels\components\MapPointsOverview.tsx`.
- Backend hotel model and validation modified in `infiora-backend-main\infiora-backend-main\src\modules\hotel\hotel.model.ts` and `hotel.validation.ts`.
- Public types updated in both app/dashboard `src\types\index.ts`.

## 18. Offline PDF Guide

Title: Downloadable offline room guide

Description: Public room pages can generate a downloadable guide containing room content, links, WiFi data, blog sections, and QR codes.

Purpose: Lets guests save or print the digital guide for offline use.

How it was implemented:

- Download button added in `infiora-app-main\infiora-app-main\src\views\rooms\details\components\DownloadGuideButton.tsx`.
- PDF generator added in `src\utils\pdfGenerator.tsx`.
- Public fonts added under `infiora-app-main\infiora-app-main\public\fonts`.
- RoomView integrates the button when `offlineGuideEnabled` is not disabled.
- Documentation/spec files added under `infiora-app-main\infiora-app-main\docs\superpowers`.

## 19. Translation Cache And Language Handling

Title: Translation cache and multilingual payload improvements

Description: Room/group payloads now include translation metadata, language resolution, content hashing, cache invalidation, and configured pre-cache languages.

Purpose: Improves multilingual guest pages and reduces repeated translation work.

How it was implemented:

- Backend translation cache module added in `infiora-backend-main\infiora-backend-main\src\modules\translation-cache`.
- Room translation helper added in `src\modules\room\room.translation.ts`.
- Group translation helper added in `src\modules\group\group.translation.ts`.
- Room service modified to return translated payloads in `src\modules\room\room.service.ts`.
- Group service modified to invalidate/refresh translations in `src\modules\group\group.service.ts`.
- Public `RoomContext.tsx` modified to resolve effective language and cache translated room payloads per language.
- Old public app route `src\app\api\translate\route.ts` was removed from the new app.

## 20. Image Handling And Image Proxy

Title: Safer image URL handling

Description: Public image display now resolves local/API/S3 assets more consistently, and the guest app adds a restricted image proxy.

Purpose: Avoids broken images across local/S3/API environments and limits browser-side exposure to remote image hosts.

How it was implemented:

- Public image proxy route added in `infiora-app-main\infiora-app-main\src\app\api\image-proxy\route.ts`.
- Image URL resolver modified in `src\utils\imageUrlUtils.ts` in both guest and dashboard apps.
- Backend upload serving hardened in `infiora-backend-main\infiora-backend-main\src\app.ts`.
- Backend upload utility modified in `src\modules\utils\multerUpload.ts`.
- S3 utility modified in `src\modules\utils\awsS3Utils.ts`.

Notable image-proxy behavior:

- Allows only `http` and `https`.
- Uses an allowlist of hostnames.
- Rejects non-image content types.
- Enforces 5 MB max body size.
- Uses a 10-second fetch timeout.
- Disallows redirects.

## 21. Security Hardening

Title: Auth, CORS, CSRF, cookies, and rate limiting

Description: The Node backend and dashboard auth flow were hardened with signed cookies, CSRF checks for cookie-authenticated unsafe requests, origin checks, stricter CORS behavior, and rate limiters.

Purpose: Reduces risk from cross-site requests, public endpoint abuse, and token handling issues.

How it was implemented:

- Backend CORS allowlist and localhost dev handling added in `infiora-backend-main\infiora-backend-main\src\app.ts`.
- CSRF validation middleware added inline in `src\app.ts`.
- Cookie settings added in `src\config\config.ts`.
- Auth controller/service modified in `src\modules\auth`.
- Dashboard CSRF helper added in `infiora-dash-main\infiora-dash-main\src\libs\csrf.ts`.
- Dashboard base API client modified in `src\redux\api\customFetchBase.ts` to include `x-csrf-token`.
- Public guest endpoint rate limiters added in `orders.route.ts`, `booking.route.ts`, `housekeeping.route.ts`, `maintenance.route.ts`, and `nps.route.ts`.

## 22. NPS Follow-Up Emails

Title: NPS token and feedback redirect flow

Description: A lightweight NPS system was added for completed orders and bookings.

Purpose: Lets guests rate completed experiences through email links.

How it was implemented:

- NPS route added in `infiora-backend-main\infiora-backend-main\src\routes\v1\nps.route.ts`.
- NPS controller added in `src\modules\nps\nps.controller.ts`.
- NPS service added in `src\modules\nps\nps.service.ts`.
- NPS token model added in `src\modules\nps\nps-token.model.ts`.
- Booking/order completion paths schedule NPS emails.

## 23. Premium Module Feature Flags

Title: Feature gating for premium modules

Description: Hotels now include feature flags controlling visibility/availability of modules such as orders, maintenance, housekeeping, staff RBAC, smart dispatching, analytics, and bookable services.

Purpose: Allows modules to be enabled/disabled per hotel/subscription.

How it was implemented:

- Backend hotel model/interfaces/validation updated in `infiora-backend-main\infiora-backend-main\src\modules\hotel`.
- Dashboard `FeatureLocked` component added at `infiora-dash-main\infiora-dash-main\src\components\common\FeatureLocked.tsx`.
- Feature checks added to dashboard pages such as orders, bookings, housekeeping, maintenance, staff, and dispatch.
- Settings UI added in `infiora-dash-main\infiora-dash-main\src\views\settings\PremiumModulesSettings.tsx`.
- Admin app hotel UI modified in `infiora-admin-main\infiora-admin-main\src\views\hotel\components\HotelForm.tsx` and related hotel views.

## 24. Dashboard Navigation And Layout Updates

Title: Navigation extended for new modules

Description: Dashboard navigation was updated to expose orders, bookings, housekeeping, maintenance, staff, dispatch, analytics, and settings pages.

Purpose: Makes new features accessible from the private dashboard.

How it was implemented:

- Vertical menu modified in `infiora-dash-main\infiora-dash-main\src\components\layout\vertical\VerticalMenu.tsx`.
- Navbar content modified in `src\components\layout\vertical\NavbarContent.tsx` and `src\components\layout\horizontal\NavbarContent.tsx`.
- Private layout modified in `src\app\[lang]\(private)\layout.tsx`.
- Dictionary files updated in `src\data\dictionaries\en.json` and `src\data\dictionaries\hr.json`.

## 25. Dashboard Settings Expansion

Title: Account, security, and premium settings pages

Description: Dashboard settings were split/expanded into account settings, security settings, and premium module settings.

Purpose: Provides clearer configuration areas for authentication and module enablement.

How it was implemented:

- `infiora-dash-main\infiora-dash-main\src\views\settings\Settings.tsx` modified.
- `src\views\settings\AccountSettings.tsx` added.
- `src\views\settings\SecuritySettings.tsx` added.
- `src\views\settings\PremiumModulesSettings.tsx` added.
- Login/auth helper changes made in `src\libs\auth.ts`, `src\libs\loginProof.ts`, `src\redux\api\authApi.ts`, and `src\app\api\login\route.ts`.
- Old `src\app\api\login\users.ts` was removed.

## 26. Admin App Enhancements

Title: Super-admin/admin app support for comparison, staff templates, and operational APIs

Description: The admin app received additional pages and API clients connected to hotel comparison, staff role templates, orders, and staff APIs.

Purpose: Gives admin-level users better visibility and configuration tools across hotels.

How it was implemented:

- Hotel comparison route added at `infiora-admin-main\infiora-admin-main\src\pages\hotels\compare.tsx`.
- Hotel comparison page added at `src\views\hotel\pages\HotelComparePage.tsx`.
- Staff role templates page added at `src\views\staff\pages\StaffRoleTemplatesPage.tsx`.
- Staff templates route added at `src\pages\staff-templates\index.tsx`.
- Hotel transfer UI added at `src\views\hotel\components\HotelPlacesTransfer.tsx`.
- Orders API client added at `src\redux\api\ordersApi.ts`.
- Staff API client added at `src\redux\api\staffApi.ts`.
- Environment config helper added at `src\configs\env.ts`.
- Store updated in `src\redux\store.ts`.
- Dashboard menu config updated in `src\layouts\dashboard\config.tsx`.

## 27. .NET API Runtime Configuration

Title: .NET API config and Docker updates

Description: The .NET API had small infrastructure/config updates.

Purpose: Keeps the .NET API aligned with the rest of the environment and deployment expectations.

How it was implemented:

- `infiora-api-main\infiora-api-main\Dockerfile` modified.
- `Program.cs` modified.
- `appsettings.json` and `appsettings.Development.json` modified.
- Dependency/service wiring modified in `src\Api\Extensions\ServiceCollectionExtensions.cs`.
- AI notes added in `CLAUDE.md`.
- Wave status added in `WAVE3_STATUS.md`.

## 28. Django API Settings Updates

Title: Django settings changes

Description: Django project settings were modified and AI status files were added.

Purpose: Updates environment behavior for the Django codebase and documents wave status.

How it was implemented:

- `infiora-django-main\infiora-django-main\src\core\settings\__init__.py` modified.
- `src\core\settings\base.py` modified.
- `src\core\settings\prod.py` modified.
- `src\core\settings\staging.py` modified.
- `CLAUDE.md` added.
- `WAVE3_STATUS.md` added.

Note: The new Django tree also contains Python `__pycache__` files. Those are runtime artifacts, not functional source changes.

## 29. Local Monorepo Utilities And E2E Tests

Title: Root-level local tooling

Description: The repository root now includes scripts, docs, Playwright tests, and a small API-contract package.

Purpose: Helps start, validate, and test multiple Infiora services locally.

How it was implemented:

- Root `package.json` and `package-lock.json` added.
- Playwright config added at `playwright.config.ts`.
- E2E tests added:
  - `tests\e2e\dash-auth.spec.ts`
  - `tests\e2e\guest-public.spec.ts`
- Local tools added:
  - `tools\Generate-ApiContract.ps1`
  - `tools\Invoke-ActiveApps.ps1`
  - `tools\Start-InfioraActive.ps1`
  - `tools\Validate-Workspace.ps1`
- API contract package added under `packages\infiora-api-contract`.
- Generated route contract added at `packages\infiora-api-contract\generated\active-routes.json`.
- Startup/setup scripts added or modified:
  - `setup-local.mjs`
  - `seed.mjs`
  - `seed.ps1`
  - `register.ps1`
  - `start-infiora-all.bat`
  - `restart-infiora-clean.bat`

## 30. Documentation And Planning Files

Title: Project documentation and AI implementation notes

Description: Several root and docs files were added to explain active systems, implementation plans, QA, and feature strategy.

Purpose: Gives future developers context about what was built, what was planned, and how to run/test the system.

Files added or relevant:

- `README.md`
- `AUTH_ROUTE_CONTRACT.md`
- `INFIORA_FULL_PROJECT_AUDIT_AND_UPGRADE_PLAN.md`
- `language.md`
- `docs\active-system.md`
- `docs\alternative-stacks.md`
- `docs\ui-qa-checklist.md`
- `docs\visitor-identity-strategy.md`
- `docs\superpowers\plans\...`
- `docs\superpowers\specs\...`
- `ORDERS_HARDENING_NOTES.md`
- `FULL_DEEP_SCAN_AUDIT.md`

## 31. Legacy Static Files Archived

Title: Legacy static frontend cleanup

Description: Old static HTML/PDF/image frontend assets were moved into the `archive` folder instead of remaining at the root.

Purpose: Keeps the working root cleaner while preserving old assets for reference.

How it was implemented:

- Legacy static frontend files now live under:
  - `archive\legacy-static-frontend-frotnend`
  - `archive\legacy-static-frontend-frbezanimacija`
  - `archive\root-static-pages`
  - `archive\legacy-app-main-before`
- `archive\README.md` documents the archive.

## 32. Legacy Vite/Supabase App No Longer Active In New Root

Title: Old `infiora-main` Vite/Supabase app removed from active new root

Description: The old folder contains `infiora-main\infiora-main`, a Vite/Supabase codebase with migrations, Supabase functions, React features, and static assets. The new root does not contain that app as an active top-level project.

Purpose: The active work appears to have moved to the separate Next apps plus Node backend, .NET API, Django API, and admin/dashboard codebases.

Developer note:

- If production still depends on the old `infiora-main` app, this is a migration/deployment concern.
- If the old app was intentionally replaced by the new multi-app structure, it should be documented in deployment instructions.

## Key Modified Existing Areas

Public guest app modified files:

- `.env.example`, `.eslintrc.json`, `next.config.mjs`, `package.json`
- `src\app\[id]\page.tsx`
- `src\app\globals.css`
- `src\app\layout.tsx`
- `src\components\LanguageButton.tsx`
- `src\contexts\RoomContext.tsx`
- `src\types\index.ts`
- `src\utils\imageUrlUtils.ts`
- `src\utils\miscUtils.ts`
- Room detail components under `src\views\rooms\details\components`

Dashboard modified files:

- `next.config.mjs`, `package.json`
- `src\app\[lang]\layout.tsx`
- `src\app\api\login\route.ts`
- `src\components\layout\horizontal\NavbarContent.tsx`
- `src\components\layout\vertical\NavbarContent.tsx`
- `src\components\layout\vertical\VerticalMenu.tsx`
- `src\data\dictionaries\en.json`, `hr.json`
- `src\hocs\AuthGuard.tsx`, `GuestOnlyRoute.tsx`
- `src\libs\auth.ts`
- `src\redux\api\customFetchBase.ts`
- `src\redux\index.ts`
- Hotel, insights, rooms, groups, links, settings, feedback, and support views

Node backend modified files:

- `.env.example`, `.eslintrc.json`, `Dockerfile`, `docker-compose.yml`, `jest.config.cjs`, `package.json`
- `src\app.ts`
- `src\config\config.ts`
- `src\config\roles.ts`
- `src\index.ts`
- Auth, email, feedback, group, hotel, insight, link, middleware, room, swagger, user, utility, and route files

Admin app modified files:

- `.env.example`, `.eslintrc.json`, `next.config.js`, `package.json`
- `src\components\AuthGuard.tsx`
- `src\configs\constants.ts`
- `src\layouts\dashboard\config.tsx`
- `src\pages\_app.tsx`
- Redux API/store files
- Hotel, home, and room views

