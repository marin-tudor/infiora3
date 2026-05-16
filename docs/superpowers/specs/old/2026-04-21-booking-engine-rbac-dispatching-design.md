# Infiora Platform Expansion — Booking Engine, RBAC & Smart Dispatching

**Date:** 2026-04-21  
**Scope:** Multi-wave feature expansion across backend, dash, app, and admin  
**Approach:** Incremental feature flags (Approach B) — existing hotels unaffected until opted in

---

## Context

Current platform has: digital guest guide, instant orders (room service food/drink), housekeeping reporting, maintenance reporting.

This design adds:
1. **Staff RBAC** — hotel-scoped roles, permissions, PIN-based tablet identity
2. **Smart Dispatching** — category/item → notification group routing with escalation
3. **Bookable Services** — calendar-based reservations with private/shared capacity models
4. **Guest Intelligence** — NPS split, revenue dashboard, SLA alerts, scheduled orders, daily digest

---

## Wave Plan

| Wave | Timeline | What ships |
|---|---|---|
| 1 | 4–6 weeks | Staff RBAC + Smart Dispatching + Tablet Mode |
| 2 | 4–6 weeks | Bookable Services + Booking Calendar + Waitlist |
| 3 | 2–3 weeks | NPS split + Revenue Dashboard + SLA Alerts + Scheduled Orders + Daily Digest |

---

## Data Model

### New Collections

#### `StaffMember`
A person who works at a hotel. Not a `User` — no email/password. Identified by PIN on shared tablet.

```
_id
hotelId         ObjectId → Hotel
name            String
pin             String (bcrypt hashed, 4-digit)
roleId          ObjectId → StaffRole
groupIds        ObjectId[] → NotificationGroup[]
isActive        Boolean
createdBy       ObjectId → User
createdAt       Date
```

#### `StaffRole`
Named permission set scoped to a hotel. `hotelId: null` = global template (created by super-admin).

```
_id
hotelId         ObjectId → Hotel | null
name            String           // "Kitchen", "Housekeeping", "Concierge"
permissions     String[]         // from permission set below
visibleModules  String[]         // which dash sections render for this role
isTemplate      Boolean
```

**Full permission set (additive strings):**
```
orders:view | orders:accept | orders:complete | orders:cancel
bookings:view | bookings:confirm | bookings:cancel
housekeeping:view | housekeeping:manage
maintenance:view | maintenance:manage
catalog:view | catalog:manage
staff:view | staff:manage
analytics:view | settings:manage
```

#### `NotificationGroup`
A named destination for routed notifications (maps to an SSE channel, email list, or both).

```
_id
hotelId         ObjectId → Hotel
name            String           // "Kitchen Tablet", "Spa Reception"
emailAddresses  String[]
sseEnabled      Boolean
```

#### `DispatchRule`
Maps a category/item to a notification group. Evaluated in priority order on every incoming event.

```
_id
hotelId             ObjectId → Hotel
name                String
priority            Number           // lower = evaluated first
conditions: {
  categoryIds       ObjectId[]       // empty = match all categories
  itemIds           ObjectId[]       // specific items override category match
  eventTypes        String[]         // ['order','booking','housekeeping','maintenance']
}
targetGroupId       ObjectId → NotificationGroup
escalationSeconds   Number           // default 30, configurable per rule
active              Boolean
```

#### `ServiceResource`
A physical resource consumed when a bookable service is reserved.

```
_id
hotelId     ObjectId → Hotel
name        String               // "Massage Room 1", "Wine Cellar", "Sauna"
type        'room' | 'equipment' | 'staff_member'
capacity    Number               // usually 1
```

#### `TimeSlot`
Pre-generated availability windows. Nightly job generates day +60 for every active bookable item.

```
_id
itemId          ObjectId → CatalogItem
startTime       Date (UTC)
endTime         Date (UTC)
maxPersons      Number           // snapshotted from bookingConfig at generation
bookedPersons   Number           // running sum of confirmed party sizes
isBlocked       Boolean          // admin manually blocked

// Unique compound index: { itemId: 1, startTime: 1 }
```

#### `Booking`
A confirmed time reservation. Separate lifecycle and status machine from `GuestOrder`.

```
_id
bookingRef          String           // "BK-20260421-0042"
hotelId             ObjectId → Hotel
roomId              ObjectId → Room
guestEmail          String
guestRoomNumber     String
itemId              ObjectId → CatalogItem
resourceIds         ObjectId[] → ServiceResource[]
startTime           Date
endTime             Date             // snapshotted at creation (duration baked in)
partySize           Number
status              'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
payment             'room' | 'cash' | 'card'
total               Number
note                String
staffNote           String
staffMemberId       ObjectId → StaffMember
language            String
rating              Number (1–5)
ratingComment       String
cancelledAt         Date
cancelledBy         'guest' | 'staff'
```

#### `BookingWaitlist`
Queue for fully-booked slots.

```
_id
itemId          ObjectId → CatalogItem
slotStartTime   Date
hotelId         ObjectId → Hotel
guestEmail      String
guestRoomNumber String
partySize       Number
notifiedAt      Date             // null until slot opens
createdAt       Date
```

---

### Modified Existing Models

#### `CatalogItem` — new fields
```
type            'instant' | 'bookable'     // default 'instant'
bookingConfig: {
  slotType        'private' | 'shared'
  // private: one booking locks entire slot regardless of partySize (sauna)
  // shared: bookings accumulate until sum(partySize) >= maxPersons (wine tasting)
  maxPersons      Number
  duration        Number                   // minutes
  bufferMinutes   Number                   // prep time between consecutive slots
  advanceMinHours Number                   // minimum booking lead time
  advanceMaxDays  Number                   // maximum days ahead guest can book
  requiresApproval Boolean                 // manual confirm or auto-confirm
  cancelPolicyHours Number                 // free cancellation up to N hours before
  resourceIds     ObjectId[]               // ServiceResource refs
  weeklySchedule: {
    mon: [{ from: '09:00', to: '18:00' }]
    tue: [...]
    // ... wed, thu, fri, sat, sun
  }
}
```

#### `GuestOrder` — new fields
```
staffMemberId   ObjectId → StaffMember     // who accepted/completed (for reporting)
dispatchGroupId ObjectId → NotificationGroup
surfacedAt      Date                       // for scheduled orders — when it entered the live queue
// scheduledFor already exists
```

#### `Hotel` — feature flag additions
```
features: {
  ordersEnabled           Boolean    // existing
  maintenanceEnabled      Boolean    // existing
  housekeepingEnabled     Boolean    // existing
  bookableServicesEnabled Boolean    // NEW Wave 2
  smartDispatchingEnabled Boolean    // NEW Wave 1
  staffRbacEnabled        Boolean    // NEW Wave 1
}
```

---

## Auth Flow — Device Token + PIN

### Tablet Device Setup (once, by hotel manager)
1. Manager opens `infiora-dash` → Settings → Staff Devices → "Generate Device Token"
2. Backend creates long-lived JWT (90-day expiry, rotatable): `{ hotelId, type: 'device' }`
3. Manager enters token on tablet once — stored in `localStorage`
4. Tablet auto-authenticates on every load. No login screen shown.

### Staff PIN Flow (every shift)
```
Tablet loads → PIN pad rendered (no user context yet)
Staff enters 4-digit PIN
→ POST /v1/hotels/:hotelId/staff/verify-pin { pin }
  → server iterates active StaffMembers for hotel, bcrypt.compare(pin, hash)
  → returns { staffMemberId, name, permissions[], groupIds[], visibleModules[] }
Tablet stores staff context in memory only (not localStorage)
Context clears on: manual sign-out | 8h inactivity | browser refresh
```

**JWT payload after PIN verified:**
```json
{
  "hotelId": "...",
  "type": "device",
  "staffMemberId": "...",
  "permissions": ["orders:view", "orders:accept", "orders:complete"],
  "groupIds": ["..."],
  "exp": "..."
}
```

All route middleware checks `permissions[]` array. No role-name string checks in handlers.

---

## Notification Pipeline

### Dispatch on Order/Booking Creation
```
1. Create GuestOrder or Booking
2. dispatchService.route(event):
   a. Load hotel's DispatchRules sorted by priority ASC (cached per hotel)
   b. For each rule: match conditions.categoryIds, itemIds, eventTypes
   c. First match → targetGroupId
   d. No match → fall back to hotel.orders.emails
3. sendSSEEvent(targetGroupId, 'new_order', payload)   // staff tablet
   sendSSEEvent(hotelId, 'new_order', payload)          // admin dash always sees all
4. If group.emailAddresses → send notification email
5. Schedule escalation job at rule.escalationSeconds
```

### SSE Architecture
Current: `Map<hotelId, Set<Response>>`

New:
```typescript
const groupClients = new Map<string, Set<Response>>();  // key: groupId — staff tablets
const adminClients = new Map<string, Set<Response>>();  // key: hotelId — manager dash
```

Endpoints:
- `GET /v1/hotels/:hotelId/events` — existing, unchanged, uses `adminClients`
- `GET /v1/groups/:groupId/events` — new, uses `groupClients`, JWT must include groupId

### Escalation
```
On order/booking create:  scheduleEscalation(id, rule.escalationSeconds)
On status change away from 'Awaiting confirmation' / 'pending':  cancelEscalation(id)

Escalation fires:
  → re-check status (guard against race)
  → if still unaccepted:
      email hotel.orders.emails
      SSE 'escalation_alert' → adminClients[hotelId]
      log { orderId/bookingId, hotelId, firedAt }
```

Escalation seconds is configurable per `DispatchRule`. Default: 30s for orders, 300s for bookings.

---

## Booking Engine

### Slot Generation (nightly job, 02:00)
```
For each CatalogItem { type: 'bookable', available: true }:
  For each day in next 60 days:
    Get weeklySchedule entry for that weekday → skip if no entry
    Step from entry.from to entry.to by (duration + bufferMinutes) minutes
    Upsert TimeSlot per slot (safe to re-run)
```

Admin can trigger manually from dash. If service config changes, next nightly run re-generates.

### Booking Atomic Reservation
```
POST /v1/bookings { itemId, startTime, partySize, guestEmail, guestRoomNumber, note, payment }

1. Load CatalogItem → validate bookable + available
2. Validate advanceMinHours / advanceMaxDays
3. Find TimeSlot { itemId, startTime, isBlocked: false } → 404 if missing

4. Atomic findOneAndUpdate:

   slotType === 'private':
     filter: { _id, isBlocked: false, bookedPersons: 0 }
     update: { $set: { bookedPersons: partySize } }

   slotType === 'shared':
     filter: { _id, isBlocked: false, $expr: { $lte: [{ $add: ['$bookedPersons', partySize] }, '$maxPersons'] } }
     update: { $inc: { bookedPersons: partySize } }

   null returned → slot unavailable → offer waitlist

5. Create Booking (status: requiresApproval ? 'pending' : 'confirmed')
6. Dispatch via DispatchRule pipeline
7. Send confirmation email to guestEmail
8. If requiresApproval → schedule escalation
```

### Slot Blocking by Admin
```
PATCH /v1/timeslots/:slotId/block
  → if bookedPersons > 0: 409 with affected bookings list (admin must cancel them first)
  → else: set isBlocked: true
```

### Cancellation & Waitlist
```
Guest or staff cancels Booking:
  → Booking.status = 'cancelled'
  → TimeSlot.$inc({ bookedPersons: -partySize })
  → Query BookingWaitlist for this slot (order by createdAt ASC)
  → If entry exists: send "slot available" email
  → If not booked within 2 hours: notify next in queue
```

---

## Scheduled Orders (Breakfast Pre-order)

**Scheduler job (runs every minute):**
```
GuestOrder.find({
  status: 'Awaiting confirmation',
  scheduledFor: { $lte: new Date(now + 15min) },
  surfacedAt: null
})
→ emit SSE new_order to dispatch group
→ set surfacedAt: now
```

**Guest app:** "Schedule for later" toggle on checkout → time picker (today + tomorrow only) → submits with `scheduledFor`.

**Staff tablet:** Scheduled orders in a separate "Scheduled" tab. Surface into main queue 15 minutes before scheduled time.

---

## Smart NPS Split

```
Order/Booking → status: 'Completed' + guestEmail present
  → schedule email in 2 hours

Email contains: 1–5 star rating as links
  → GET /v1/feedback?orderId=X&rating=4&token=HMAC(orderId+guestEmail)

Rating 4–5: redirect to thank-you page + Google review link
Rating 1–3: redirect to internal feedback form (textarea + submit, no public exposure)
Save to GuestOrder.rating + GuestOrder.ratingComment
```

Token is HMAC-signed — unforgeable, no guest login required.

---

## Daily Manager Digest

Cron job at 08:00 hotel local time:
```
For each active hotel:
  Aggregate yesterday:
    - orders: count, total revenue, avg rating
    - bookings: count
    - housekeeping requests: open / resolved
    - maintenance requests: open / resolved
    - escalations fired (SLA breaches)
  Render email template
  Send to hotel owner email + hotel.orders.emails
```

No new collection. Pure aggregation on existing data.

---

## Frontend Surfaces

### `infiora-dash` — new routes (all gated by feature flags)

| Route | Purpose |
|---|---|
| `/orders` | Existing — add group filter, escalation badges, staffMember label |
| `/orders/scheduled` | List upcoming scheduled orders |
| `/bookings` | Calendar + list, block/unblock slots, confirm pending bookings |
| `/staff` | Manage StaffMembers, assign roles, set PINs, assign to groups |
| `/staff/roles` | Create/edit StaffRole permissions |
| `/staff/groups` | Create NotificationGroups, set emails |
| `/staff/dispatch` | Create/reorder DispatchRules (drag to set priority) |
| `/analytics` | Revenue by category, avg acceptance time, SLA breach count, daily ratings |
| `/tablet/:groupId` | Tablet mode — full-screen card list, no sidebar, PIN pad overlay |

### `infiora-app` — new screens

| Screen | Purpose |
|---|---|
| Bookings browse | List bookable services, pick slot, enter party size |
| Booking confirmation | Confirm details, submit |
| My Bookings | View and cancel upcoming bookings |
| Checkout — schedule toggle | "Order now" vs "Schedule for later" with time picker |

### `infiora-admin` — additions

| What | Change |
|---|---|
| Hotels list | Feature flag toggles per hotel |
| Staff Role Templates | Create global StaffRole templates hotels inherit |

---

## Key Invariants

- PIN must be unique within a hotel (enforced at creation, not DB index — bcrypt prevents index comparison)
- `endTime` on `Booking` is always snapshotted at creation — never derived from current `CatalogItem.duration`
- `bookedPersons` on `TimeSlot` is the single source of truth for capacity — never recomputed from Booking count
- Escalation timer is always cancelled before status update commits, not after
- Admin SSE channel (`adminClients`) always receives every event regardless of dispatch routing
- Device JWT (`type: 'device'`) has no permissions on its own — permissions only exist after PIN verification adds `staffMemberId` context
