# iCal Sync, Discount Codes & Stripe Connect — Design Spec

**Date:** 2026-05-11
**Scope:** Four feature areas across backend, dash, app, and admin
**Wave plan:** 3 waves, each executable in a separate chat session

---

## Context

Current platform has: digital guest guide, instant orders, housekeeping/maintenance reporting, bookable services (Wave 1-3 from prior plan). This design adds:

1. **iCal Sync** — pull reservation codes from OTAs (Booking.com, Airbnb, etc.) automatically
2. **Reservation Codes Filtering** — hide expired, filter by current/upcoming
3. **Discount Codes** — hotel-managed promo codes, guest applies at checkout
4. **Stripe Connect** — online card payments via Stripe Express, Infiora takes application fee

---

## Wave Plan

| Wave | Content | Complexity |
|---|---|---|
| **Wave 1** | Codes filtering + iCal sync (backend + dashboard) | Medium |
| **Wave 2** | Discount codes (backend + dashboard + guest app) | Medium |
| **Wave 3** | Stripe Connect (onboarding + payment flow + webhooks + admin analytics) | High |

---

## Wave 1 — iCal Sync + Codes Filtering

### 1.1 iCal Sync

#### Idea

Hotels add iCal URLs from OTA platforms to Order Settings. The backend automatically fetches and parses each URL every 2 hours, creating or updating ReservationCode documents. Hotel staff can also trigger a manual sync per source.

#### New MongoDB Model: `ICalSource`

```
hotelId         ObjectId → Hotel
platform        'booking' | 'airbnb' | 'vrbo' | 'agoda' | 'tripadvisor' | 'custom'
label           string  (auto-set for known platforms, user-defined for custom)
url             string  (iCal URL)
enabled         boolean (default: true)
lastSyncAt      Date | null
lastSyncStatus  'success' | 'error' | null
lastSyncError   string | null
createdAt       Date
```

No `roomId` — iCal sources are hotel-level. Some hotels use a single room on Infiora for the entire property, so room linking would break that use case. Hotels can manually assign a room to auto-created codes after sync if needed.

#### ReservationCode model — new fields

```
source        'manual' | 'booking' | 'airbnb' | 'vrbo' | 'agoda' | 'tripadvisor' | 'custom'
externalUid   string | null   (original UID from iCal — used for deduplication)
```

`externalUid` is indexed on `(hotelId, externalUid)` to prevent duplicates on re-sync.

#### Sync Logic

1. **node-cron** runs every 2 hours — fetches all `{ enabled: true }` ICalSource documents
2. `ical.js` library parses VEVENT entries from each URL
3. For each VEVENT:
   - Skip if `SUMMARY` contains "Not available", "CLOSED", or "Unavailable" (blocked dates, not real reservations)
   - Extract: `UID` (unique ID), `DTSTART` (checkIn), `DTEND` (checkOut), guest name from `SUMMARY` or `DESCRIPTION`
   - Upsert ReservationCode by `(hotelId, externalUid)` — update if exists, create if not
4. Set `lastSyncAt`, `lastSyncStatus`, `lastSyncError` on the ICalSource document

#### Code/Name Extraction per Platform

| Platform | Code value | Guest name |
|---|---|---|
| Booking.com | numeric ID from UID | SUMMARY or DESCRIPTION |
| Airbnb | `HMXXXXXXXX` from SUMMARY | SUMMARY (before comma) |
| Vrbo | UID prefix | SUMMARY |
| Agoda | UID | SUMMARY |
| TripAdvisor | UID | SUMMARY |
| Custom | UID | SUMMARY |

If guest name is not available (some platforms omit it for privacy), field is left blank — hotel can edit manually.

#### Order Settings UI — "iCal Sync" section

- List of configured sources: platform icon + URL preview + last sync status (✓ / ✗ + timestamp) + "Sync now" button + enable toggle
- "Add iCal source" button → dialog:
  - Platform dropdown with icons: Booking.com, Airbnb, Vrbo, Agoda, TripAdvisor, Custom
  - For known platforms: small help link to where to find the iCal URL in that platform's settings
  - iCal URL input
  - Label input (auto-filled for known platforms, editable)
  - Enabled toggle
- Global "Sync all" button + "Last synced: X minutes ago" timestamp

#### New API Endpoints

```
GET    /v1/orders/hotels/:hotelId/ical-sources              — list sources
POST   /v1/orders/hotels/:hotelId/ical-sources              — add source
PATCH  /v1/orders/hotels/:hotelId/ical-sources/:id          — update source
DELETE /v1/orders/hotels/:hotelId/ical-sources/:id          — delete source
POST   /v1/orders/hotels/:hotelId/ical-sources/:id/sync     — manual sync (single)
POST   /v1/orders/hotels/:hotelId/ical-sources/sync-all     — manual sync (all)
```

---

### 1.2 Reservation Codes Filtering

#### Current State

`ReservationCodes.tsx` shows all codes (active + expired) with no filtering. After iCal sync, hotels may have hundreds of codes spanning past and future dates.

#### New UI Controls (toolbar above codes list)

**1. Show Expired toggle (default: OFF)**
Hides expired codes (`checkOut < today`) by default. Shows count: *"Hiding 14 expired codes"*.

**2. Status filter (segmented control)**
- `All active` — codes where `checkOut >= today`
- `Currently active` — codes where `checkIn <= today <= checkOut` (guest currently in hotel)
- `Upcoming` — codes where `checkIn > today`

**3. Source filter (select — only shown if hotel has iCal sources)**
- `All sources`
- `Manual`
- Per platform: `Booking.com`, `Airbnb`, `Vrbo`, `Agoda`, `TripAdvisor`, `Custom`

#### Backend Changes

`GET /v1/orders/hotels/:hotelId/codes` gains query params:

```
showExpired=false           (default: false)
status=all|current|upcoming (default: all)
source=manual|booking|...   (default: all sources)
```

Filtering done at MongoDB query level (not in-memory) for performance with large datasets.

---

## Wave 2 — Discount Codes

### 2.1 Data Model: `DiscountCode`

```
hotelId               ObjectId → Hotel
code                  string (uppercase, unique per hotel, e.g. "SUMMER10")
description           string (internal, staff reference only)
discountType          'percentage' | 'fixed'
discountValue         number (10 = 10% or 10 = 10€ depending on type)
applicableCategories  ObjectId[]  (empty array = applies to all categories)
validFrom             Date | null (null = active immediately)
validTo               Date | null (null = never expires)
maxUses               number | null (null = unlimited)
usedCount             number (default: 0)
minOrderAmount        number | null (minimum cart total for code to apply)
isActive              boolean
createdBy             ObjectId → User
createdAt             Date
```

Combinations supported: e.g. 15% off only on "Drinks" category, valid this week, max 50 uses.

### 2.2 Dashboard — new "Discount Codes" tab

7th tab in the Orders page (after: Dashboard, Orders, Menu, Scheduled, Setup, Codes).

**List view — table columns:**
Code | Type | Value | Applicable to | Valid from/to | Uses (12 / 50) | Status | Actions (edit, delete)

**Status badge logic:**
- `Active` — isActive true, within date range, usedCount < maxUses
- `Expired` — validTo < today
- `Used up` — usedCount >= maxUses
- `Inactive` — isActive false

**Create/Edit dialog fields:**
- Code (auto-uppercase on input)
- Description (optional)
- Discount type toggle: Percentage / Fixed amount
- Discount value (number input)
- Applicable categories (multi-select chips — empty = all categories)
- Valid from / Valid to (date pickers — both optional)
- Max uses (number — empty = unlimited)
- Min order amount (number — optional)
- Active toggle

### 2.3 Guest App — discount code input

In the order summary screen (before submit), below the items list:

```
[ Discount code...      ] [ Apply ]
```

**Flow:**
1. Guest types code → clicks Apply
2. App calls `POST /v1/orders/validate-discount` with `{ hotelId, code, items[], totalAmount }`
3. Backend validates: exists, isActive, within date range, below maxUses, satisfies minOrderAmount, categories match
4. Returns `{ valid: true, discountType, discountValue, discountAmount, newTotal }` or `{ valid: false, reason }`
5. App shows: ~~€24.00~~ **€21.60** · You save €2.40
6. On order submit, `discountCode` is sent — backend revalidates server-side (never trust frontend)
7. `usedCount` is incremented atomically on order creation

### 2.4 Order model — new fields

```
discountCode      string | null
discountAmount    number | null   (absolute saving in currency)
originalTotal     number | null   (total before discount)
```

### 2.5 API Endpoints

```
GET    /v1/orders/hotels/:hotelId/discount-codes          — list
POST   /v1/orders/hotels/:hotelId/discount-codes          — create
PATCH  /v1/orders/hotels/:hotelId/discount-codes/:id      — update
DELETE /v1/orders/hotels/:hotelId/discount-codes/:id      — delete

POST   /v1/orders/validate-discount                       — public, validate + preview
```

---

## Wave 3 — Stripe Connect

### 3.1 Architecture

**Model: Direct charges with application_fee_amount (Model A — transparent)**

Infiora has one Stripe platform account. Hotels onboard as Stripe Express Connected Accounts. Each PaymentIntent is created on Infiora's platform with `application_fee_amount` — Stripe deducts both its own fee and Infiora's application fee, and the hotel receives the net amount. Hotels can see the full breakdown in their Stripe Express dashboard:

```
Guest pays:           100.00€
Stripe fee:           -1.65€   (Stripe issues monthly statement to hotel)
Infiora fee:          -2.50€   (shown as "application fee" in hotel's Stripe dashboard)
Hotel receives:        95.85€
```

This model is chosen for accounting transparency — hotels need documentation of fees for their bookkeeping.

### 3.2 Data Model Changes

**Hotel document — new fields:**
```
stripeAccountId           string | null
stripeAccountStatus       'not_connected' | 'pending' | 'active' | 'restricted'
stripePlatformFeePercent  number | null   (null = use global default from admin settings)
```

**OrderSettings — existing field gains real meaning:**
`paymentMethods.online: boolean` — was a placeholder, now enables actual Stripe payment. Requires `stripeAccountStatus === 'active'`.

**Order document — new fields:**
```
stripePaymentIntentId   string | null
stripeStatus            'pending' | 'succeeded' | 'failed' | 'refunded' | null
platformFeeAmount       number | null   (Infiora fee in cents — from webhook data)
stripeFeeAmount         number | null   (Stripe processing fee in cents — from webhook data)
netAmountToHotel        number | null   (what hotel actually receives)
paidAt                  Date | null
```

### 3.3 Hotel Onboarding Flow

1. Order Settings → Payment Methods → "Online Payment" toggle shows CTA: *"Connect Stripe account to enable online payments"*
2. Hotel clicks → `POST /v1/hotels/:hotelId/stripe/onboard` → backend calls `stripe.accountLinks.create({ type: 'account_onboarding' })` → returns hosted Stripe URL
3. Hotel completes Stripe Express onboarding (bank account, KYC — all handled by Stripe)
4. Stripe redirects back to dashboard with `?stripe=success` query param
5. Dashboard shows Stripe status badge: `Active ✓`
6. Webhook `account.updated` keeps `stripeAccountStatus` in sync

### 3.4 Guest Payment Flow

1. Guest reaches order summary — sees payment options the hotel has enabled (cash / card / online)
2. Guest selects **Online** → Stripe Payment Element renders (card form via Stripe.js)
3. Guest fills card details → clicks "Place order"
4. App calls `POST /v1/orders/guest/payment-intent` with `{ hotelId, items[], discountCode? }`
5. Backend:
   - Calculates final amount (with discount if applicable)
   - Looks up `hotel.stripePlatformFeePercent` (or global default)
   - Calls `stripe.paymentIntents.create({ amount, currency, application_fee_amount, transfer_data: { destination: hotel.stripeAccountId } })`
   - Returns `clientSecret`
6. Stripe.js confirms payment with `clientSecret` — **capture immediately**
7. Webhook `payment_intent.succeeded` → backend creates order with `paymentStatus: 'paid'`, populates Stripe fields

### 3.5 Webhooks

| Event | Action |
|---|---|
| `account.updated` | Update `hotel.stripeAccountStatus` |
| `payment_intent.succeeded` | Create order, set `stripeStatus: 'succeeded'`, populate fee fields |
| `payment_intent.payment_failed` | Log error, do not create order |
| `charge.refunded` | Update order `stripeStatus: 'refunded'` |

Webhook endpoint: `POST /v1/stripe/webhooks` (public, Stripe signature verification via `stripe.webhooks.constructEvent`).

### 3.6 API Endpoints

```
POST /v1/hotels/:hotelId/stripe/onboard           — initiate onboarding, returns URL
GET  /v1/hotels/:hotelId/stripe/status            — check account status
POST /v1/stripe/webhooks                          — Stripe webhook handler (global)
POST /v1/orders/guest/payment-intent              — create PaymentIntent for guest
```

### 3.7 Admin Panel — Stripe Revenue Analytics

**New section in admin panel: "Stripe Revenue"**

**KPI cards (top of page):**
- Total GMV (all hotels combined, selected period)
- Total Infiora fee revenue
- Active Stripe connected hotels count
- Average platform fee %

**Per-hotel revenue table:**

| Hotel | GMV | Stripe fees | Infiora fees | Transactions | Last activity |
|---|---|---|---|---|---|
| Hotel Jadran | 12,450€ | 206€ | 311€ | 89 | 10.05.2026 |

Columns: hotel name, GMV, Stripe processing fees, Infiora application fees, transaction count, last transaction date.

Filters: This week / This month / This year / Custom date range. CSV export.

**Per-hotel fee configuration:**
On Hotel detail page in admin → "Platform fee %" field. If blank, global default applies. Global default set in Admin Settings page.

**Data source:** Local database (Order documents with `platformFeeAmount`, `stripeFeeAmount`) for fast queries. Stripe API used only for reconciliation/verification, not primary display.

### 3.8 Admin Settings — new field

```
stripePlatformFeePercent   number   (global default fee %, e.g. 2.5)
```

---

## Dependencies & Libraries

| Package | Purpose | Wave |
|---|---|---|
| `ical.js` or `node-ical` | Parse iCal feeds | 1 |
| `node-cron` | Scheduled iCal sync | 1 |
| `stripe` (Node SDK) | All Stripe operations | 3 |
| `@stripe/stripe-js` | Guest app Payment Element | 3 |
| `@stripe/react-stripe-js` | React wrapper for Payment Element | 3 |

---

## Error Handling

**iCal sync:** If URL is unreachable or returns invalid iCal, mark `lastSyncStatus: 'error'` with error message. Do not crash cron job — log and continue with next source. Dashboard shows error badge on failing sources.

**Discount validation:** Race condition on `usedCount` handled with MongoDB `$inc` + check in a single atomic operation — if code hits maxUses between validation and order creation, order is rejected with clear error message to guest.

**Stripe:** All PaymentIntent creation errors are caught and returned to guest app with user-friendly message. Webhook failures are logged — idempotency keys used on order creation to prevent duplicates if webhook fires twice.
