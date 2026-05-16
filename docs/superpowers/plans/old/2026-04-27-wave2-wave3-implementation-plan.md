# Wave 2 + Wave 3 + Wave 1 Gaps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Date:** 2026-04-27  
**Goal:** Complete everything in the design spec that Wave 1 did not cover: missing dash enhancements, admin feature flags, the full bookable services engine (Wave 2), and guest intelligence (Wave 3).

**Spec:** `docs/superpowers/specs/2026-04-21-booking-engine-rbac-dispatching-design.md`  
**Wave 1 Plan (done):** `docs/superpowers/plans/2026-04-21-wave1-staff-rbac-dispatching-tablet.md`

**Tech Stack:** Node.js + TypeScript + Express + MongoDB/Mongoose · bcryptjs · jsonwebtoken · node-cron · Next.js 14 App Router (infiora-dash) · React Native (infiora-app) · Jest + Supertest

---

## Task Index

| # | Task | Wave | Repo |
|---|------|------|------|
| 1 | Dash — `/orders` enhancements (group filter, escalation badge, staffMember label) | W1 gap | infiora-dash |
| 2 | Dash — `/orders/scheduled` route (upcoming scheduled orders list) | W1 gap | infiora-dash |
| 3 | Admin — Feature flag toggles + Staff Role Templates | W1 gap | infiora-admin |
| 4 | CatalogItem extension — `type` + `bookingConfig` | W2 | backend |
| 5 | `ServiceResource` + `TimeSlot` models | W2 | backend |
| 6 | `Booking` + `BookingWaitlist` models | W2 | backend |
| 7 | Booking validation schemas | W2 | backend |
| 8 | Slot generation cron (nightly 02:00, +60 days) | W2 | backend |
| 9 | Booking service — atomic reservation, cancellation, waitlist | W2 | backend |
| 10 | Booking controller + routes | W2 | backend |
| 11 | Dispatch integration for bookings | W2 | backend |
| 12 | Dash — `/bookings` calendar + list page | W2 | infiora-dash |
| 13 | App — Bookings browse + slot picker | W2 | infiora-app |
| 14 | App — Booking confirmation + My Bookings | W2 | infiora-app |
| 15 | App — "Schedule for later" toggle + time picker (checkout) | W3 | infiora-app |
| 16 | Smart NPS Split — backend (HMAC email + feedback endpoint) | W3 | backend |
| 17 | Revenue analytics endpoints | W3 | backend |
| 18 | Daily Manager Digest cron (08:00 per hotel) | W3 | backend |
| 19 | Dash — `/analytics` page | W3 | infiora-dash |

---

## File Map

### New Backend Files

| File | Purpose |
|------|---------|
| `src/modules/booking/booking.interfaces.ts` | TS types: ServiceResource, TimeSlot, Booking, BookingWaitlist |
| `src/modules/booking/service-resource.model.ts` | ServiceResource Mongoose schema |
| `src/modules/booking/time-slot.model.ts` | TimeSlot schema (compound unique index: itemId + startTime) |
| `src/modules/booking/booking.model.ts` | Booking schema + bookingRef pre-save hook |
| `src/modules/booking/booking-waitlist.model.ts` | BookingWaitlist schema |
| `src/modules/booking/booking.validation.ts` | Joi schemas for create, update, waitlist, block |
| `src/modules/booking/booking.service.ts` | Atomic reservation, cancellation, waitlist + waitlist cron |
| `src/modules/booking/booking.controller.ts` | HTTP handlers |
| `src/modules/booking/index.ts` | Module re-exports |
| `src/modules/scheduler/slotGeneration.ts` | Nightly cron: generate TimeSlots 60 days ahead |
| `src/modules/analytics/analytics.service.ts` | MongoDB aggregations: revenue, acceptance time, SLA, ratings |
| `src/modules/analytics/analytics.controller.ts` | Analytics HTTP handlers |
| `src/modules/nps/nps.service.ts` | HMAC token, NPS email scheduler, rating save |
| `src/modules/nps/nps.controller.ts` | GET /v1/feedback handler (redirect-based) |
| `src/routes/v1/booking.route.ts` | Booking + TimeSlot endpoints |
| `src/routes/v1/analytics.route.ts` | Analytics endpoints |
| `src/routes/v1/nps.route.ts` | Feedback endpoint |

### Modified Backend Files

| File | Change |
|------|--------|
| `src/modules/catalog/catalog-item.model.ts` | Add `type` + `bookingConfig` fields |
| `src/modules/catalog/catalog.interfaces.ts` | Add `ICatalogItemBookingConfig`, extend `ICatalogItem` |
| `src/modules/dispatch/dispatch.interfaces.ts` | Add `'booking'` to `eventTypes` union |
| `src/modules/dispatch/dispatch-rule.model.ts` | Add `'booking'` to eventTypes enum |
| `src/modules/dispatch/dispatch.service.ts` | Accept Booking events in `route()` |
| `src/modules/orders/orders.service.ts` | Trigger NPS on status → Completed |
| `src/modules/booking/booking.service.ts` | Trigger NPS on booking → completed |
| `src/modules/hotel/hotel.controller.ts` | Add `triggerSlotGeneration` handler |
| `src/routes/v1/hotel.route.ts` | Add manual slot generation endpoint |
| `src/routes/v1/index.ts` | Register booking, analytics, nps routes |
| `src/index.ts` | Register slotGeneration cron + dailyDigest cron + waitlistCron |

### New Dash Files

| File | Purpose |
|------|---------|
| `src/app/[lang]/(private)/orders/scheduled/page.tsx` | Scheduled orders list route |
| `src/app/[lang]/(private)/bookings/page.tsx` | Bookings calendar route |
| `src/app/[lang]/(private)/analytics/page.tsx` | Analytics route |
| `src/views/orders/pages/ScheduledOrdersPage.tsx` | Upcoming scheduled orders list |
| `src/views/bookings/pages/BookingsPage.tsx` | Calendar + list, block/unblock, confirm |
| `src/views/analytics/pages/AnalyticsPage.tsx` | Revenue + SLA + ratings charts |

### Modified Dash Files

| File | Change |
|------|--------|
| `src/views/orders/pages/OrdersPage.tsx` | Group filter, escalation badge, staffMember label |

### New App Files

| File | Purpose |
|------|---------|
| `src/screens/bookings/BookingsBrowseScreen.tsx` | List bookable services, pick slot + party size |
| `src/screens/bookings/BookingConfirmScreen.tsx` | Confirm booking details + submit |
| `src/screens/bookings/MyBookingsScreen.tsx` | View + cancel upcoming bookings |

### Modified App Files

| File | Change |
|------|--------|
| Checkout screen (find via Glob) | Add "Schedule for later" toggle + time picker |

### Modified Admin Files

| File | Change |
|------|--------|
| Hotel detail/settings page (find via Glob) | Feature flag toggles: all 3 flags |
| New: Staff Role Templates page | Global StaffRole CRUD (hotelId: null, isTemplate: true) |

---

## Task 1: Dash — Orders Page Enhancements (Wave 1 Gap)

> **Standalone context:** `infiora-dash-main/infiora-dash-main/`. Next.js 14 App Router + TypeScript. The design spec requires three additions to `OrdersPage.tsx` that were not included in the Wave 1 plan: (1) group filter dropdown so a manager sees only orders routed to a specific NotificationGroup, (2) escalation badge on orders that have triggered an alert, (3) staffMember label on accepted/completed orders.

**Files:**
- Modify: `src/views/orders/pages/OrdersPage.tsx`

- [ ] **Step 1: Add group filter dropdown**

On component mount, fetch notification groups:
```typescript
const [groups, setGroups] = useState<{ _id: string; name: string }[]>([]);
const [selectedGroupId, setSelectedGroupId] = useState<string>('');

useEffect(() => {
  axios.get(`/api/v1/hotels/${hotelId}/dispatch/groups`).then(r => setGroups(r.data.results ?? r.data));
}, [hotelId]);
```

Render a dropdown above the order list:
```tsx
<select value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}>
  <option value="">All groups</option>
  {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
</select>
```

Pass `groupId` to the orders API query:
```typescript
const res = await axios.get(`/api/v1/orders/hotels/${hotelId}`, {
  params: { status: activeFilter, ...(selectedGroupId ? { groupId: selectedGroupId } : {}) },
});
```

- [ ] **Step 2: Add escalation badge via SSE**

The SSE stream already connects to the admin channel (`/api/v1/hotels/:hotelId/events`). Listen for the `escalation_alert` event and store the escalated order IDs:

```typescript
const [escalatedIds, setEscalatedIds] = useState<Set<string>>(new Set());

// Inside the SSE useEffect (find the existing EventSource setup):
evtSource.addEventListener('escalation_alert', (e) => {
  const data = JSON.parse(e.data);
  setEscalatedIds(prev => new Set(prev).add(data.orderId ?? data.bookingId));
});
```

On each order card:
```tsx
{escalatedIds.has(order._id) && (
  <span className="badge bg-red-500 text-white text-xs px-1 rounded">Escalated</span>
)}
```

- [ ] **Step 3: Add staffMember label**

Orders now include `staffMemberId` (populated after accept/complete). Ensure the orders API call populates it — the backend `orders.service.ts` should already populate `staffMemberId` if the Wave 1 field was added; if not, add `populate('staffMemberId', 'name')` to the query.

On the order card:
```tsx
{order.staffMemberId?.name && (
  <p className="text-xs text-muted mt-1">Handled by: {order.staffMemberId.name}</p>
)}
```

- [ ] **Step 4: Verify in browser** — test group filter, confirm escalation badge appears on mock escalation SSE event, confirm staffMember name renders.

- [ ] **Step 5: Commit**
```bash
git add src/views/orders/pages/OrdersPage.tsx
git commit -m "feat(dash): orders group filter, escalation badges, staffMember label"
```

---

## Task 2: Dash — `/orders/scheduled` Route (Wave 1 Gap)

> **Standalone context:** `infiora-dash-main/infiora-dash-main/`. The design spec lists `/orders/scheduled` as a separate dash route that lists upcoming scheduled orders. The backend cron (Wave 1 Task 10) already surfaces them 15 min before `scheduledFor`. This dash view shows the full queue — staff can review what's coming without waiting for it to enter the live queue.

**Files:**
- Create: `src/app/[lang]/(private)/orders/scheduled/page.tsx`
- Create: `src/views/orders/pages/ScheduledOrdersPage.tsx`

- [ ] **Step 1: Create route page**

`src/app/[lang]/(private)/orders/scheduled/page.tsx`:
```typescript
import ScheduledOrdersPage from '@/views/orders/pages/ScheduledOrdersPage';
export default ScheduledOrdersPage;
```

- [ ] **Step 2: Create `src/views/orders/pages/ScheduledOrdersPage.tsx`**

```typescript
'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function ScheduledOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);

  const fetchScheduled = async () => {
    // Filter: status 'Awaiting confirmation', scheduledFor exists and is in the future
    const res = await axios.get(`/api/v1/orders/hotels/${hotelId}`, {
      params: { scheduled: true },  // backend filters: scheduledFor != null, surfacedAt: null
    });
    setOrders(res.data.results ?? res.data);
  };

  useEffect(() => {
    fetchScheduled();
    const interval = setInterval(fetchScheduled, 60_000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Scheduled Orders</h1>
      {orders.map(order => (
        <div key={order._id} className="card">
          <p>Room {order.guestRoomNumber} — scheduled for {new Date(order.scheduledFor).toLocaleString()}</p>
          <p>Items: {order.items?.map((i: any) => i.name).join(', ')}</p>
          <p>Status: {order.status}</p>
        </div>
      ))}
      {orders.length === 0 && <p>No scheduled orders.</p>}
    </div>
  );
}
```

> **Backend note:** Verify that `GET /api/v1/orders/hotels/:hotelId` supports a `?scheduled=true` filter or equivalent. If not, add a filter in `orders.service.ts`:
```typescript
if (req.query.scheduled === 'true') {
  filter.scheduledFor = { $ne: null };
  filter.surfacedAt = null;
}
```

- [ ] **Step 3: Add link to sidebar nav** — find the sidebar navigation config and add "Scheduled Orders" under the Orders section linking to `/orders/scheduled`.

- [ ] **Step 4: Commit**
```bash
git commit -m "feat(dash): scheduled orders list page"
```

---

## Task 3: Admin — Feature Flag Toggles + Staff Role Templates (Wave 1 Gap)

> **Standalone context:** `infiora-admin-main/infiora-admin-main/`. The design spec lists two admin additions: (1) Feature flag toggles per hotel for all three Wave 1/2 flags, (2) Global StaffRole templates (hotelId: null, isTemplate: true) that hotels can inherit.

**Files:**
- Modify: hotel detail/settings page (locate via `Glob('src/**/*Hotel*')` or similar)
- Create: staff role templates page
- Modify: backend `src/modules/staff/staff.service.ts` (template query)
- Modify: backend `src/routes/v1/staff.route.ts` (templates endpoint)

- [ ] **Step 1: Locate hotel settings page in admin**

Run `Glob('src/**/*Hotel*')` in the admin repo to find the hotel detail or settings page. Typically `src/views/hotels/HotelDetailPage.tsx` or `HotelSettingsPage.tsx`.

- [ ] **Step 2: Add three feature flag toggles**

Find the existing feature flag toggles (ordersEnabled, maintenanceEnabled, housekeepingEnabled — they likely already exist). Add below them:

```tsx
{/* Staff RBAC */}
<div className="flex items-center justify-between">
  <span>Staff RBAC</span>
  <Toggle
    checked={hotel.features?.staffRbacEnabled ?? false}
    onChange={val => updateFeatureFlag('staffRbacEnabled', val)}
  />
</div>

{/* Smart Dispatching */}
<div className="flex items-center justify-between">
  <span>Smart Dispatching</span>
  <Toggle
    checked={hotel.features?.smartDispatchingEnabled ?? false}
    onChange={val => updateFeatureFlag('smartDispatchingEnabled', val)}
  />
</div>

{/* Bookable Services */}
<div className="flex items-center justify-between">
  <span>Bookable Services</span>
  <Toggle
    checked={hotel.features?.bookableServicesEnabled ?? false}
    onChange={val => updateFeatureFlag('bookableServicesEnabled', val)}
  />
</div>
```

`updateFeatureFlag` calls:
```typescript
const updateFeatureFlag = async (flag: string, value: boolean) => {
  await axios.patch(`/api/v1/hotels/${hotelId}`, { features: { [flag]: value } });
  refetchHotel();
};
```

- [ ] **Step 3: Backend — add `getTemplates` to staff service**

In `src/modules/staff/staff.service.ts`:
```typescript
export const getTemplates = async (): Promise<IStaffRoleDoc[]> => {
  return StaffRole.find({ isTemplate: true, hotelId: null });
};
```

In `src/routes/v1/staff.route.ts`, add before the `/:roleId` routes:
```typescript
router.route('/roles/templates').get(auth('staff:view'), staffController.getTemplates);
```

In `src/modules/staff/staff.controller.ts`:
```typescript
export const getTemplates = catchAsync(async (_req, res) => {
  const templates = await staffService.getTemplates();
  res.json(templates);
});
```

- [ ] **Step 4: Create Staff Role Templates page in admin**

New page at `/staff-templates` (or equivalent route in admin nav):

```typescript
'use client';
// Lists global StaffRole templates (hotelId: null, isTemplate: true)
// Create: POST /api/v1/staff/roles { name, permissions, visibleModules, isTemplate: true }
// Edit/delete: PATCH/DELETE /api/v1/staff/roles/:roleId
// Uses same ALL_PERMISSIONS array from Wave 1 interfaces
```

Render a permission checklist (like in StaffRolesPage.tsx from Wave 1) but without a hotelId — these are global.

- [ ] **Step 5: Commit**
```bash
git commit -m "feat(admin): feature flag toggles + staff role templates"
```

---

## Task 4: CatalogItem Extension — `type` + `bookingConfig`

> **Standalone context:** Backend at `infiora-backend-main/infiora-backend-main/`. `CatalogItem` schema is at `src/modules/catalog/catalog-item.model.ts`. Adding `type: 'instant' | 'bookable'` (default `'instant'`) and a nested `bookingConfig` object. All existing items remain `'instant'` — no migration needed.

**Files:**
- Modify: `src/modules/catalog/catalog-item.model.ts`
- Modify: `src/modules/catalog/catalog.interfaces.ts`

- [ ] **Step 1: Add fields to `catalog-item.model.ts`**

Inside the schema, add after existing fields:
```typescript
type: {
  type: String,
  enum: ['instant', 'bookable'],
  default: 'instant',
},
bookingConfig: {
  slotType: { type: String, enum: ['private', 'shared'], default: 'private' },
  maxPersons: { type: Number, default: 1 },
  duration: { type: Number, default: 60 },        // minutes
  bufferMinutes: { type: Number, default: 0 },
  advanceMinHours: { type: Number, default: 1 },
  advanceMaxDays: { type: Number, default: 60 },
  requiresApproval: { type: Boolean, default: false },
  cancelPolicyHours: { type: Number, default: 24 },
  resourceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceResource' }],
  weeklySchedule: {
    mon: [{ from: String, to: String }],
    tue: [{ from: String, to: String }],
    wed: [{ from: String, to: String }],
    thu: [{ from: String, to: String }],
    fri: [{ from: String, to: String }],
    sat: [{ from: String, to: String }],
    sun: [{ from: String, to: String }],
  },
},
```

- [ ] **Step 2: Update `catalog.interfaces.ts`**

Add before `ICatalogItem`:
```typescript
export interface IBookingConfigScheduleEntry {
  from: string;  // 'HH:MM' format
  to: string;    // 'HH:MM' format
}

export interface ICatalogItemBookingConfig {
  slotType: 'private' | 'shared';
  maxPersons: number;
  duration: number;
  bufferMinutes: number;
  advanceMinHours: number;
  advanceMaxDays: number;
  requiresApproval: boolean;
  cancelPolicyHours: number;
  resourceIds: mongoose.Types.ObjectId[];
  weeklySchedule: {
    mon: IBookingConfigScheduleEntry[];
    tue: IBookingConfigScheduleEntry[];
    wed: IBookingConfigScheduleEntry[];
    thu: IBookingConfigScheduleEntry[];
    fri: IBookingConfigScheduleEntry[];
    sat: IBookingConfigScheduleEntry[];
    sun: IBookingConfigScheduleEntry[];
  };
}
```

Then extend `ICatalogItem`:
```typescript
type?: 'instant' | 'bookable';
bookingConfig?: ICatalogItemBookingConfig;
```

- [ ] **Step 3: Verify TypeScript compiles**
```bash
cd infiora-backend-main/infiora-backend-main
npx tsc --noEmit
```

- [ ] **Step 4: Commit**
```bash
git commit -m "feat(wave2): extend CatalogItem with type + bookingConfig"
```

---

## Task 5: `ServiceResource` + `TimeSlot` Models

> **Standalone context:** Backend. Two new collections. `ServiceResource` is a physical resource (massage room, sauna, equipment) consumed by a booking. `TimeSlot` is a pre-generated availability window — nightly cron fills 60 days ahead. Unique compound index `{ itemId, startTime }` makes the nightly upsert idempotent.

**Files:**
- Create: `src/modules/booking/booking.interfaces.ts`
- Create: `src/modules/booking/service-resource.model.ts`
- Create: `src/modules/booking/time-slot.model.ts`
- Create: `src/modules/booking/index.ts`

- [ ] **Step 1: Create `src/modules/booking/booking.interfaces.ts`**

```typescript
import mongoose, { Document, Model } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export interface IServiceResource {
  hotelId: mongoose.Types.ObjectId;
  name: string;
  type: 'room' | 'equipment' | 'staff_member';
  capacity: number;
}
export interface IServiceResourceDoc extends IServiceResource, Document {}
export interface IServiceResourceModel extends Model<IServiceResourceDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export interface ITimeSlot {
  itemId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date;
  maxPersons: number;
  bookedPersons: number;
  isBlocked: boolean;
}
export interface ITimeSlotDoc extends ITimeSlot, Document {}
export interface ITimeSlotModel extends Model<ITimeSlotDoc> {}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type PaymentMethod = 'room' | 'cash' | 'card';

export interface IBooking {
  bookingRef: string;
  hotelId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  guestEmail: string;
  guestRoomNumber: string;
  itemId: mongoose.Types.ObjectId;
  resourceIds: mongoose.Types.ObjectId[];
  startTime: Date;
  endTime: Date;     // snapshotted at creation — never re-derived from item.duration
  partySize: number;
  status: BookingStatus;
  payment: PaymentMethod;
  total: number;
  note?: string;
  staffNote?: string;
  staffMemberId?: mongoose.Types.ObjectId | null;
  language?: string;
  rating?: number | null;
  ratingComment?: string | null;
  cancelledAt?: Date | null;
  cancelledBy?: 'guest' | 'staff' | null;
}
export interface IBookingDoc extends IBooking, Document {}
export interface IBookingModel extends Model<IBookingDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export interface IBookingWaitlist {
  itemId: mongoose.Types.ObjectId;
  slotStartTime: Date;
  hotelId: mongoose.Types.ObjectId;
  guestEmail: string;
  guestRoomNumber: string;
  partySize: number;
  notifiedAt?: Date | null;
}
export interface IBookingWaitlistDoc extends IBookingWaitlist, Document {}
export interface IBookingWaitlistModel extends Model<IBookingWaitlistDoc> {}
```

- [ ] **Step 2: Create `src/modules/booking/service-resource.model.ts`**

```typescript
import mongoose, { Schema } from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IServiceResourceDoc, IServiceResourceModel } from './booking.interfaces';

const serviceResourceSchema = new Schema<IServiceResourceDoc, IServiceResourceModel>(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['room', 'equipment', 'staff_member'], required: true },
    capacity: { type: Number, default: 1 },
  },
  { timestamps: true }
);

serviceResourceSchema.plugin(toJSON);
serviceResourceSchema.plugin(paginate);

export default mongoose.model<IServiceResourceDoc, IServiceResourceModel>(
  'ServiceResource',
  serviceResourceSchema
);
```

- [ ] **Step 3: Create `src/modules/booking/time-slot.model.ts`**

```typescript
import mongoose, { Schema } from 'mongoose';
import toJSON from '../toJSON/toJSON';
import { ITimeSlotDoc, ITimeSlotModel } from './booking.interfaces';

const timeSlotSchema = new Schema<ITimeSlotDoc, ITimeSlotModel>(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CatalogItem', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    maxPersons: { type: Number, required: true },
    bookedPersons: { type: Number, default: 0 },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound unique index — nightly upsert ($setOnInsert) is safe to re-run
timeSlotSchema.index({ itemId: 1, startTime: 1 }, { unique: true });

timeSlotSchema.plugin(toJSON);

export default mongoose.model<ITimeSlotDoc, ITimeSlotModel>('TimeSlot', timeSlotSchema);
```

- [ ] **Step 4: Create `src/modules/booking/index.ts`**

```typescript
export { default as ServiceResource } from './service-resource.model';
export { default as TimeSlot } from './time-slot.model';
export { default as Booking } from './booking.model';
export { default as BookingWaitlist } from './booking-waitlist.model';
export * from './booking.interfaces';
```

- [ ] **Step 5: Verify TypeScript compiles**

- [ ] **Step 6: Commit**
```bash
git commit -m "feat(wave2): ServiceResource + TimeSlot models + booking interfaces"
```

---

## Task 6: `Booking` + `BookingWaitlist` Models

> **Standalone context:** Backend. `Booking` is the confirmed reservation — separate lifecycle from `GuestOrder`. `bookingRef` is auto-generated as `BK-YYYYMMDD-XXXX` (zero-padded four-digit daily counter). `BookingWaitlist` queues guests for fully-booked slots; `notifiedAt` is set before sending the notification email to prevent duplicates.

**Files:**
- Create: `src/modules/booking/booking.model.ts`
- Create: `src/modules/booking/booking-waitlist.model.ts`

- [ ] **Step 1: Create `src/modules/booking/booking.model.ts`**

```typescript
import mongoose, { Schema } from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IBookingDoc, IBookingModel } from './booking.interfaces';

const bookingSchema = new Schema<IBookingDoc, IBookingModel>(
  {
    bookingRef: { type: String, unique: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    guestEmail: { type: String, required: true },
    guestRoomNumber: { type: String, required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CatalogItem', required: true },
    resourceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceResource' }],
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    partySize: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
      default: 'pending',
    },
    payment: { type: String, enum: ['room', 'cash', 'card'], required: true },
    total: { type: Number, default: 0 },
    note: { type: String, default: '' },
    staffNote: { type: String, default: '' },
    staffMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'StaffMember', default: null },
    language: { type: String, default: 'en' },
    rating: { type: Number, min: 1, max: 5, default: null },
    ratingComment: { type: String, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: String, enum: ['guest', 'staff', null], default: null },
  },
  { timestamps: true }
);

bookingSchema.pre('save', async function (next) {
  if (this.isNew && !this.bookingRef) {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const count = await mongoose.model('Booking').countDocuments({ createdAt: { $gte: startOfDay } });
    this.bookingRef = `BK-${todayStr}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

bookingSchema.plugin(toJSON);
bookingSchema.plugin(paginate);

export default mongoose.model<IBookingDoc, IBookingModel>('Booking', bookingSchema);
```

- [ ] **Step 2: Create `src/modules/booking/booking-waitlist.model.ts`**

```typescript
import mongoose, { Schema } from 'mongoose';
import toJSON from '../toJSON/toJSON';
import { IBookingWaitlistDoc, IBookingWaitlistModel } from './booking.interfaces';

const bookingWaitlistSchema = new Schema<IBookingWaitlistDoc, IBookingWaitlistModel>(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CatalogItem', required: true },
    slotStartTime: { type: Date, required: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    guestEmail: { type: String, required: true },
    guestRoomNumber: { type: String, required: true },
    partySize: { type: Number, required: true, min: 1 },
    notifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

bookingWaitlistSchema.plugin(toJSON);

export default mongoose.model<IBookingWaitlistDoc, IBookingWaitlistModel>(
  'BookingWaitlist',
  bookingWaitlistSchema
);
```

- [ ] **Step 3: Verify TypeScript compiles**

- [ ] **Step 4: Commit**
```bash
git commit -m "feat(wave2): Booking + BookingWaitlist models"
```

---

## Task 7: Booking Validation Schemas

> **Standalone context:** Backend. Joi validation schemas for booking CRUD operations.

**Files:**
- Create: `src/modules/booking/booking.validation.ts`

- [ ] **Step 1: Create `src/modules/booking/booking.validation.ts`**

```typescript
import Joi from 'joi';

const createBooking = {
  body: Joi.object().keys({
    itemId: Joi.string().required(),
    startTime: Joi.date().iso().required(),
    partySize: Joi.number().integer().min(1).required(),
    guestEmail: Joi.string().email().required(),
    guestRoomNumber: Joi.string().required(),
    note: Joi.string().allow('').optional(),
    payment: Joi.string().valid('room', 'cash', 'card').required(),
  }),
};

const updateBooking = {
  body: Joi.object().keys({
    status: Joi.string().valid('confirmed', 'cancelled', 'completed', 'no_show').optional(),
    staffNote: Joi.string().allow('').optional(),
    staffMemberId: Joi.string().optional(),
    cancelledBy: Joi.string().valid('guest', 'staff').optional(),
  }),
};

const addToWaitlist = {
  body: Joi.object().keys({
    itemId: Joi.string().required(),
    slotStartTime: Joi.date().iso().required(),
    guestEmail: Joi.string().email().required(),
    guestRoomNumber: Joi.string().required(),
    partySize: Joi.number().integer().min(1).required(),
  }),
};

const blockSlot = {
  params: Joi.object().keys({
    slotId: Joi.string().required(),
  }),
};

export default { createBooking, updateBooking, addToWaitlist, blockSlot };
```

- [ ] **Step 2: Commit**
```bash
git commit -m "feat(wave2): booking Joi validation schemas"
```

---

## Task 8: Slot Generation Cron (Nightly 02:00, +60 Days)

> **Standalone context:** Backend. Nightly job at 02:00 UTC generates `TimeSlot` documents for every active `CatalogItem { type: 'bookable' }` for the next 60 days. Uses `weeklySchedule` to determine valid days/hours; steps through slots by `duration + bufferMinutes`. Uses `$setOnInsert` upserts — idempotent, safe to re-run. Admin manual trigger via `POST /v1/hotels/:hotelId/timeslots/generate`.

**Files:**
- Create: `src/modules/scheduler/slotGeneration.ts`
- Modify: `src/index.ts`
- Modify: `src/modules/hotel/hotel.controller.ts`
- Modify: `src/routes/v1/hotel.route.ts`

- [ ] **Step 1: Create `src/modules/scheduler/slotGeneration.ts`**

```typescript
import cron from 'node-cron';
import CatalogItem from '../catalog/catalog-item.model';
import TimeSlot from '../booking/time-slot.model';
import Hotel from '../hotel/hotel.model';
import logger from '../logger/logger';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
type DayKey = typeof DAYS[number];

export async function generateSlotsForHotel(hotelId: string): Promise<void> {
  const items = await CatalogItem.find({ hotelId, type: 'bookable', available: true });

  for (const item of items) {
    const config = item.bookingConfig;
    if (!config?.weeklySchedule) continue;

    const now = new Date();
    const ops: any[] = [];

    for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
      const date = new Date(now);
      date.setDate(now.getDate() + dayOffset);
      const dayKey: DayKey = DAYS[date.getDay()];
      const schedule = config.weeklySchedule[dayKey];
      if (!schedule || schedule.length === 0) continue;

      for (const entry of schedule) {
        const [fromH, fromM] = entry.from.split(':').map(Number);
        const [toH, toM] = entry.to.split(':').map(Number);
        const fromMinutes = fromH * 60 + fromM;
        const toMinutes = toH * 60 + toM;
        const step = config.duration + config.bufferMinutes;

        for (let m = fromMinutes; m + config.duration <= toMinutes; m += step) {
          const slotStart = new Date(date);
          slotStart.setHours(Math.floor(m / 60), m % 60, 0, 0);
          const slotEnd = new Date(slotStart.getTime() + config.duration * 60_000);

          ops.push({
            updateOne: {
              filter: { itemId: item._id, startTime: slotStart },
              update: {
                $setOnInsert: {
                  itemId: item._id,
                  startTime: slotStart,
                  endTime: slotEnd,
                  maxPersons: config.maxPersons,
                  bookedPersons: 0,
                  isBlocked: false,
                },
              },
              upsert: true,
            },
          });
        }
      }
    }

    if (ops.length > 0) {
      await TimeSlot.bulkWrite(ops, { ordered: false });
      logger.info(`Generated ${ops.length} slots for item ${item._id}`);
    }
  }
}

export async function generateSlotsForAllHotels(): Promise<void> {
  const hotels = await Hotel.find({ 'features.bookableServicesEnabled': true });
  for (const hotel of hotels) {
    await generateSlotsForHotel(String(hotel._id)).catch(err =>
      logger.error(`Slot generation failed for hotel ${hotel._id}: ${err.message}`)
    );
  }
}

export function startSlotGenerationCron(): void {
  cron.schedule('0 2 * * *', generateSlotsForAllHotels, { timezone: 'UTC' });
  logger.info('Slot generation cron started (02:00 UTC daily)');
}
```

- [ ] **Step 2: Add `triggerSlotGeneration` to `src/modules/hotel/hotel.controller.ts`**

```typescript
import { generateSlotsForHotel } from '../scheduler/slotGeneration';

export const triggerSlotGeneration = catchAsync(async (req, res) => {
  await generateSlotsForHotel(req.params.hotelId);
  res.status(200).json({ message: 'Slot generation complete' });
});
```

- [ ] **Step 3: Add route to `src/routes/v1/hotel.route.ts`**

```typescript
router
  .route('/:hotelId/timeslots/generate')
  .post(auth('settings:manage'), hotelController.triggerSlotGeneration);
```

- [ ] **Step 4: Register cron in `src/index.ts`**

```typescript
import { startSlotGenerationCron } from './modules/scheduler/slotGeneration';
// after existing cron registrations:
startSlotGenerationCron();
```

- [ ] **Step 5: Verify TypeScript compiles**

- [ ] **Step 6: Commit**
```bash
git commit -m "feat(wave2): slot generation cron + manual trigger endpoint"
```

---

## Task 9: Booking Service — Atomic Reservation, Cancellation, Waitlist

> **Standalone context:** Backend. Core booking logic — three operations. (1) Atomic reservation: `findOneAndUpdate` with capacity checks per `slotType`. Private = lock entire slot regardless of partySize (bookedPersons: 0 → partySize). Shared = accumulate until `bookedPersons + partySize > maxPersons`. Null returned → slot unavailable → caller offers waitlist. (2) Cancellation: release capacity (`$inc bookedPersons -partySize`), notify first waitlist entry (set `notifiedAt` before sending email). (3) Waitlist follow-up cron every 15 min. Key invariant: `bookedPersons` on `TimeSlot` is the single source of truth — never recomputed from Booking count.

**Files:**
- Create: `src/modules/booking/booking.service.ts`

- [ ] **Step 1: Create `src/modules/booking/booking.service.ts`**

```typescript
import cron from 'node-cron';
import Booking from './booking.model';
import TimeSlot from './time-slot.model';
import BookingWaitlist from './booking-waitlist.model';
import CatalogItem from '../catalog/catalog-item.model';
import { sendEmail } from '../email/email.service';
import logger from '../logger/logger';

export async function createBooking(data: {
  itemId: string;
  startTime: Date;
  partySize: number;
  guestEmail: string;
  guestRoomNumber: string;
  roomId: string;
  hotelId: string;
  note?: string;
  payment: 'room' | 'cash' | 'card';
  language?: string;
}) {
  const item = await CatalogItem.findById(data.itemId);
  if (!item || item.type !== 'bookable' || !item.available) {
    throw Object.assign(new Error('Item not available for booking'), { statusCode: 400 });
  }

  const config = item.bookingConfig!;
  const now = new Date();
  const hoursUntilSlot = (data.startTime.getTime() - now.getTime()) / 3_600_000;

  if (hoursUntilSlot < config.advanceMinHours) {
    throw Object.assign(new Error('Booking window not yet open'), { statusCode: 400 });
  }
  if (hoursUntilSlot / 24 > config.advanceMaxDays) {
    throw Object.assign(new Error('Slot too far in the future'), { statusCode: 400 });
  }

  // Atomic capacity lock per slotType
  let updatedSlot;
  if (config.slotType === 'private') {
    updatedSlot = await TimeSlot.findOneAndUpdate(
      { itemId: data.itemId, startTime: data.startTime, isBlocked: false, bookedPersons: 0 },
      { $set: { bookedPersons: data.partySize } },
      { new: true }
    );
  } else {
    updatedSlot = await TimeSlot.findOneAndUpdate(
      {
        itemId: data.itemId,
        startTime: data.startTime,
        isBlocked: false,
        $expr: { $lte: [{ $add: ['$bookedPersons', data.partySize] }, '$maxPersons'] },
      },
      { $inc: { bookedPersons: data.partySize } },
      { new: true }
    );
  }

  if (!updatedSlot) {
    const err: any = new Error('Slot unavailable');
    err.statusCode = 409;
    err.code = 'SLOT_UNAVAILABLE';
    throw err;
  }

  const endTime = new Date(data.startTime.getTime() + config.duration * 60_000);
  const status = config.requiresApproval ? 'pending' : 'confirmed';

  const booking = await Booking.create({
    ...data,
    endTime,       // snapshotted — never derived from item.duration post-creation
    resourceIds: config.resourceIds ?? [],
    status,
    total: (item as any).price ?? 0,
  });

  await sendEmail({
    to: data.guestEmail,
    subject: `Booking ${status === 'confirmed' ? 'confirmed' : 'pending'}: ${item.name}`,
    template: 'bookingConfirmation',
    data: {
      bookingRef: booking.bookingRef,
      itemName: item.name,
      startTime: data.startTime,
      endTime,
      status,
      requiresApproval: config.requiresApproval,
    },
  });

  return booking;
}

export async function cancelBooking(bookingId: string, cancelledBy: 'guest' | 'staff') {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
  if (['cancelled', 'completed'].includes(booking.status)) {
    throw Object.assign(new Error('Cannot cancel booking in current state'), { statusCode: 400 });
  }

  // Release capacity first
  await TimeSlot.findOneAndUpdate(
    { itemId: booking.itemId, startTime: booking.startTime },
    { $inc: { bookedPersons: -booking.partySize } }
  );

  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.cancelledBy = cancelledBy;
  await booking.save();

  // Find first unnotified waitlist entry, set notifiedAt BEFORE sending email
  const waitlistEntry = await BookingWaitlist.findOne({
    itemId: booking.itemId,
    slotStartTime: booking.startTime,
    notifiedAt: null,
  }).sort({ createdAt: 1 });

  if (waitlistEntry) {
    waitlistEntry.notifiedAt = new Date(); // set before send to prevent duplicate on crash
    await waitlistEntry.save();
    await sendEmail({
      to: waitlistEntry.guestEmail,
      subject: 'Slot available — book now',
      template: 'waitlistAvailable',
      data: { slotStartTime: booking.startTime, itemId: String(booking.itemId) },
    });
  }

  return booking;
}

export async function joinWaitlist(data: {
  itemId: string;
  slotStartTime: Date;
  hotelId: string;
  guestEmail: string;
  guestRoomNumber: string;
  partySize: number;
}) {
  return BookingWaitlist.create(data);
}

async function processWaitlistFollowUps(): Promise<void> {
  const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000);
  // Entries notified 2+ hours ago where the slot is still available
  const expired = await BookingWaitlist.find({ notifiedAt: { $lte: twoHoursAgo } });

  for (const entry of expired) {
    const slot = await TimeSlot.findOne({ itemId: entry.itemId, startTime: entry.slotStartTime });
    if (!slot || slot.bookedPersons >= slot.maxPersons) continue;

    const next = await BookingWaitlist.findOne({
      itemId: entry.itemId,
      slotStartTime: entry.slotStartTime,
      notifiedAt: null,
    }).sort({ createdAt: 1 });

    if (next) {
      next.notifiedAt = new Date();
      await next.save();
      await sendEmail({
        to: next.guestEmail,
        subject: 'Slot available — book now',
        template: 'waitlistAvailable',
        data: { slotStartTime: entry.slotStartTime, itemId: String(entry.itemId) },
      });
    }
  }
}

export function startWaitlistCron(): void {
  cron.schedule('*/15 * * * *', processWaitlistFollowUps);
  logger.info('Waitlist follow-up cron started (every 15 min)');
}
```

- [ ] **Step 2: Register `startWaitlistCron` in `src/index.ts`**

```typescript
import { startWaitlistCron } from './modules/booking/booking.service';
startWaitlistCron();
```

- [ ] **Step 3: Verify TypeScript compiles**

- [ ] **Step 4: Commit**
```bash
git commit -m "feat(wave2): booking service — atomic reservation, cancellation, waitlist + cron"
```

---

## Task 10: Booking Controller + Routes

> **Standalone context:** Backend. HTTP layer over `booking.service.ts`. Guest routes use existing room-token auth (`roomTokenAuth` middleware or equivalent). Staff routes are permission-gated. All booking routes live under `/v1/hotels/:hotelId/bookings`. Separate guest cancel route at `/v1/bookings/:bookingId/cancel` (no hotelId in path, auth by room token). `409 SLOT_UNAVAILABLE` is surfaced to the app to trigger the waitlist flow.

**Files:**
- Create: `src/modules/booking/booking.controller.ts`
- Create: `src/routes/v1/booking.route.ts`
- Modify: `src/routes/v1/index.ts`

- [ ] **Step 1: Create `src/modules/booking/booking.controller.ts`**

```typescript
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import * as bookingService from './booking.service';
import Booking from './booking.model';
import TimeSlot from './time-slot.model';
import CatalogItem from '../catalog/catalog-item.model';

export const createBooking = catchAsync(async (req, res) => {
  try {
    const booking = await bookingService.createBooking({
      ...req.body,
      hotelId: req.params.hotelId,
      roomId: req.user.roomId,
      language: req.user.language ?? 'en',
    });
    res.status(httpStatus.CREATED).json(booking);
  } catch (err: any) {
    if (err.code === 'SLOT_UNAVAILABLE') {
      return res.status(409).json({ code: 'SLOT_UNAVAILABLE', message: 'Slot unavailable. Join the waitlist?' });
    }
    throw err;
  }
});

export const getHotelBookings = catchAsync(async (req, res) => {
  const { status, itemId, date, page = 1, limit = 50 } = req.query;
  const filter: any = { hotelId: req.params.hotelId };
  if (status) filter.status = status;
  if (itemId) filter.itemId = itemId;
  if (date) {
    const d = new Date(date as string);
    filter.startTime = { $gte: d, $lt: new Date(d.getTime() + 86_400_000) };
  }
  const bookings = await Booking.paginate(filter, {
    page, limit,
    populate: [{ path: 'itemId', select: 'name' }, { path: 'staffMemberId', select: 'name' }],
    sort: '-createdAt',
  });
  res.json(bookings);
});

export const getGuestBookings = catchAsync(async (req, res) => {
  // Guest's own bookings — identified by roomId from token
  const bookings = await Booking.find({
    hotelId: req.params.hotelId,
    roomId: req.user.roomId,
    status: { $nin: ['cancelled', 'completed', 'no_show'] },
    startTime: { $gte: new Date() },
  }).populate('itemId', 'name').sort({ startTime: 1 });
  res.json(bookings);
});

export const updateBooking = catchAsync(async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(req.params.bookingId, req.body, { new: true });
  if (!booking) return res.status(httpStatus.NOT_FOUND).json({ message: 'Not found' });
  res.json(booking);
});

export const cancelBooking = catchAsync(async (req, res) => {
  const cancelledBy = (req.query.by as 'guest' | 'staff') ?? 'staff';
  const booking = await bookingService.cancelBooking(req.params.bookingId, cancelledBy);
  res.json(booking);
});

export const joinWaitlist = catchAsync(async (req, res) => {
  const entry = await bookingService.joinWaitlist({ ...req.body, hotelId: req.params.hotelId });
  res.status(httpStatus.CREATED).json(entry);
});

export const getTimeSlots = catchAsync(async (req, res) => {
  const { itemId, from, to } = req.query;
  const items = await CatalogItem.find({ hotelId: req.params.hotelId, type: 'bookable' }, '_id');
  const filter: any = { itemId: { $in: items.map(i => i._id) } };
  if (itemId) filter.itemId = itemId;
  if (from || to) {
    filter.startTime = {};
    if (from) filter.startTime.$gte = new Date(from as string);
    if (to) filter.startTime.$lte = new Date(to as string);
  }
  const slots = await TimeSlot.find(filter).sort({ startTime: 1 }).populate('itemId', 'name');
  res.json(slots);
});

export const blockSlot = catchAsync(async (req, res) => {
  const slot = await TimeSlot.findById(req.params.slotId);
  if (!slot) return res.status(httpStatus.NOT_FOUND).json({ message: 'Slot not found' });
  if (slot.bookedPersons > 0) {
    const affected = await Booking.find({
      itemId: slot.itemId,
      startTime: slot.startTime,
      status: { $nin: ['cancelled', 'completed'] },
    });
    return res.status(httpStatus.CONFLICT).json({ message: 'Slot has active bookings. Cancel them first.', affected });
  }
  slot.isBlocked = true;
  await slot.save();
  res.json(slot);
});

export const unblockSlot = catchAsync(async (req, res) => {
  const slot = await TimeSlot.findByIdAndUpdate(req.params.slotId, { isBlocked: false }, { new: true });
  if (!slot) return res.status(httpStatus.NOT_FOUND).json({ message: 'Not found' });
  res.json(slot);
});
```

- [ ] **Step 2: Create `src/routes/v1/booking.route.ts`**

```typescript
import express from 'express';
import validate from '../middleware/validate';
import bookingValidation from '../../modules/booking/booking.validation';
import * as bookingController from '../../modules/booking/booking.controller';
// import auth + roomTokenAuth from existing middleware — follow Wave 1 pattern

const router = express.Router({ mergeParams: true });

// Guest-facing (room token auth)
router.post('/', roomTokenAuth, validate(bookingValidation.createBooking), bookingController.createBooking);
router.post('/waitlist', roomTokenAuth, validate(bookingValidation.addToWaitlist), bookingController.joinWaitlist);
router.get('/mine', roomTokenAuth, bookingController.getGuestBookings);

// Staff/dash (permission-gated)
router.get('/', auth('bookings:view'), bookingController.getHotelBookings);
router.patch('/:bookingId', auth('bookings:confirm'), validate(bookingValidation.updateBooking), bookingController.updateBooking);
router.patch('/:bookingId/cancel', auth('bookings:cancel'), bookingController.cancelBooking);

// TimeSlot management
router.get('/timeslots', auth('bookings:view'), bookingController.getTimeSlots);
router.patch('/timeslots/:slotId/block', auth('bookings:confirm'), validate(bookingValidation.blockSlot), bookingController.blockSlot);
router.patch('/timeslots/:slotId/unblock', auth('bookings:confirm'), bookingController.unblockSlot);

export default router;
```

- [ ] **Step 3: Register in `src/routes/v1/index.ts`**

```typescript
import bookingRoute from './booking.route';

router.use('/hotels/:hotelId/bookings', bookingRoute);
// Guest cancel without hotelId in path:
router.patch('/bookings/:bookingId/cancel', roomTokenAuth, bookingController.cancelBooking);
```

- [ ] **Step 4: Verify TypeScript compiles**

- [ ] **Step 5: Commit**
```bash
git commit -m "feat(wave2): booking controller + routes"
```

---

## Task 11: Dispatch Integration for Bookings

> **Standalone context:** Backend. The dispatch pipeline (Wave 1 `dispatch.service.ts`) currently routes only orders. Wire `Booking` creation into the same `dispatchService.route()` call so bookings are SSE-notified to the correct NotificationGroup and always to `adminClients`. Escalation is scheduled for `requiresApproval` bookings (default 300s per spec). Cancel escalation when booking leaves pending state.

**Files:**
- Modify: `src/modules/dispatch/dispatch.interfaces.ts`
- Modify: `src/modules/dispatch/dispatch-rule.model.ts`
- Modify: `src/modules/booking/booking.service.ts`

- [ ] **Step 1: Add `'booking'` to eventTypes in `dispatch.interfaces.ts`**

Find the `eventTypes` field type definition and add `'booking'`:
```typescript
// Before:
eventTypes: ('order' | 'housekeeping' | 'maintenance')[];
// After:
eventTypes: ('order' | 'booking' | 'housekeeping' | 'maintenance')[];
```

- [ ] **Step 2: Update `dispatch-rule.model.ts`**

Find the `eventTypes` schema field and add `'booking'` to the enum array.

- [ ] **Step 3: Call dispatch in `booking.service.ts` after `Booking.create()`**

```typescript
import { dispatchService } from '../dispatch/dispatch.service';
import { sendSSEEvent } from '../orders/sse.service';
import { scheduleEscalation, cancelEscalation } from '../scheduler/escalation';

// After booking is created:
const routeResult = await dispatchService.route({
  hotelId: data.hotelId,
  eventType: 'booking',
  itemId: data.itemId,
  categoryId: (item as any).categoryId,
});

if (routeResult?.groupId) {
  sendSSEEvent(String(routeResult.groupId), 'new_booking', booking.toJSON());
}
// Admin dash always receives all booking events
sendSSEEvent(data.hotelId, 'new_booking', booking.toJSON());

if (config.requiresApproval) {
  scheduleEscalation(String(booking._id), routeResult?.escalationSeconds ?? 300);
}
```

- [ ] **Step 4: Cancel escalation when booking is confirmed/cancelled**

In the `cancelBooking` function and in `booking.controller.ts` `updateBooking` (when status changes from pending):
```typescript
import { cancelEscalation } from '../scheduler/escalation';
cancelEscalation(String(booking._id));
```

- [ ] **Step 5: Verify TypeScript compiles**

- [ ] **Step 6: Commit**
```bash
git commit -m "feat(wave2): wire bookings into dispatch pipeline + SSE notifications"
```

---

## Task 12: Dash — `/bookings` Calendar + List Page

> **Standalone context:** `infiora-dash-main/infiora-dash-main/`. New route. Two views: (1) Calendar grid — rows = bookable services, columns = time slots for selected day, each cell shows capacity and block status; (2) List — bookings filterable by status/service/date, with confirm/cancel/complete actions and escalation badges for overdue pending bookings. Follow existing page patterns (OrdersPage, HousekeepingPage, etc.).

**Files:**
- Create: `src/app/[lang]/(private)/bookings/page.tsx`
- Create: `src/views/bookings/pages/BookingsPage.tsx`

- [ ] **Step 1: Create route page**

`src/app/[lang]/(private)/bookings/page.tsx`:
```typescript
import BookingsPage from '@/views/bookings/pages/BookingsPage';
export default BookingsPage;
```

- [ ] **Step 2: Create `src/views/bookings/pages/BookingsPage.tsx`**

Structure:
```typescript
'use client';
// State: view ('calendar' | 'list'), selectedDate, statusFilter, itemFilter, bookings, slots, items

// Calendar view:
//   1. Fetch items (type: 'bookable')
//   2. Fetch slots: GET /api/v1/hotels/:id/bookings/timeslots?from=<date>&to=<date+1d>
//   3. Grid: rows = items, columns = slots for that item
//   4. Each cell: show "<bookedPersons>/<maxPersons>" capacity
//      isBlocked → grey cell with lock icon, "Unblock" button
//      not blocked, available → "Block" button
//      hover/click → show list of bookings in this slot
//   5. Block: PATCH .../timeslots/:slotId/block
//   6. Unblock: PATCH .../timeslots/:slotId/unblock
//   7. 409 on block → show modal listing affected bookings: "Cancel them first"

// List view:
//   1. Fetch: GET /api/v1/hotels/:id/bookings?status=...&itemId=...&date=...
//   2. Table columns: Ref, Room, Service, Start, Party, Status, Staff Note, Actions
//   3. Actions: Confirm (pending → confirmed), Cancel, Complete
//   4. Escalation badge if escalatedIds.has(booking._id) — fed from SSE 'escalation_alert' events
//   5. Confirm: PATCH .../bookings/:id { status: 'confirmed' }
//   6. Cancel: PATCH .../bookings/:id/cancel?by=staff
//   7. Complete: PATCH .../bookings/:id { status: 'completed' }
```

- [ ] **Step 3: Add `/bookings` to sidebar navigation**

Find sidebar nav config and add "Bookings" linking to `/bookings`, gated by `hotel.features.bookableServicesEnabled`.

- [ ] **Step 4: Commit**
```bash
git commit -m "feat(dash): bookings calendar + list page with block/unblock and actions"
```

---

## Task 13: App — Bookings Browse + Slot Picker

> **Standalone context:** `infiora-app-main/infiora-app-main/`. New guest screen. Fetch bookable catalog items, show a service list. Tap a service → date picker + time slot grid. Slots where `bookedPersons >= maxPersons` or `isBlocked: true` are shown as unavailable (greyed, not selectable). For `slotType: 'shared'`, show remaining capacity ("3 spots left").

**Files:**
- Create: `src/screens/bookings/BookingsBrowseScreen.tsx`
- Modify: navigation config (add screen)

- [ ] **Step 1: Create `BookingsBrowseScreen.tsx`**

```typescript
// 1. On mount: fetch GET /api/v1/hotels/:hotelId/catalog?type=bookable
// 2. Show list: service card (image, name, duration, price, slotType label)
// 3. Tap service → expand/navigate to date + slot picker
//    a. Date picker: today to today + advanceMaxDays
//    b. On date select: fetch GET /api/v1/hotels/:hotelId/bookings/timeslots?itemId=<id>&from=<date>&to=<date+1d>
//    c. Show slots grid — each slot:
//       - Unavailable: bookedPersons >= maxPersons || isBlocked → grey, disabled
//       - Available (private): show time, green
//       - Available (shared): show time + "X spots left" where X = maxPersons - bookedPersons
//    d. Tap available slot → navigate to BookingConfirmScreen
//       pass props: { item, slot: { startTime, endTime, maxPersons, bookedPersons } }
```

- [ ] **Step 2: Register screen in navigation**

Add `BookingsBrowseScreen` to the app navigator and add an entry point (e.g., a "Bookings" tab or button on the home screen — follow the existing pattern for how orders/housekeeping are accessed).

- [ ] **Step 3: Commit**
```bash
git commit -m "feat(app): bookings browse screen with slot picker"
```

---

## Task 14: App — Booking Confirmation + My Bookings

> **Standalone context:** `infiora-app-main/infiora-app-main/`. Two more screens: (1) `BookingConfirmScreen` — confirm details and submit; shows waitlist offer on 409. (2) `MyBookingsScreen` — list upcoming bookings with cancel option, respecting `cancelPolicyHours`.

**Files:**
- Create: `src/screens/bookings/BookingConfirmScreen.tsx`
- Create: `src/screens/bookings/MyBookingsScreen.tsx`
- Modify: navigation config

- [ ] **Step 1: Create `BookingConfirmScreen.tsx`**

```typescript
// Props received: { item, slot }
// Fields:
//   - partySize (NumberInput, 1..maxPersons — hidden/locked to 1 for 'private')
//   - note (TextInput, optional)
//   - payment (select: room / cash / card)
//
// On submit: POST /api/v1/hotels/:hotelId/bookings
//   { itemId, startTime, partySize, guestEmail, guestRoomNumber, note, payment }
//   guestEmail + guestRoomNumber from auth context (room token)
//
// Success → navigate to MyBookingsScreen + show toast "Booking confirmed"
// 409 SLOT_UNAVAILABLE → show dialog:
//   "This slot was just taken. Join the waitlist?"
//   Yes → POST /api/v1/hotels/:hotelId/bookings/waitlist
//         { itemId, slotStartTime: startTime, guestEmail, guestRoomNumber, partySize }
//         show "Added to waitlist. We'll email you when a spot opens."
//   No → go back to slot picker
```

- [ ] **Step 2: Create `MyBookingsScreen.tsx`**

```typescript
// On mount: fetch GET /api/v1/hotels/:hotelId/bookings/mine (guest-scoped)
// Show list: service name, date/time, status badge, partySize
// Cancel button logic:
//   - Only show for bookings with status in ['pending', 'confirmed'] and startTime > now
//   - Check cancelPolicyHours: if now > startTime - cancelPolicyHours * 3600s
//     → show "Cancellation deadline has passed"
//   - Otherwise: PATCH /api/v1/bookings/:bookingId/cancel?by=guest
//     On success: refetch list
```

- [ ] **Step 3: Register both screens in navigation**

- [ ] **Step 4: Commit**
```bash
git commit -m "feat(app): booking confirmation + my bookings screens"
```

---

## Task 15: App — "Schedule for Later" Toggle + Time Picker

> **Standalone context:** `infiora-app-main/infiora-app-main/`. The backend cron (Wave 1 Task 10) already surfaces scheduled orders 15 min before their time. This task adds the guest UI: a toggle on the checkout screen + a time picker (today + tomorrow only). The order is submitted with a `scheduledFor` ISO timestamp. Scheduled orders show in order history with a "Scheduled for [time]" label.

**Files:**
- Modify: checkout screen (locate via `Glob('src/screens/**/*heckout*')` or similar)
- Modify: order history screen (add scheduled label)

- [ ] **Step 1: Locate the checkout screen file**

Run `Glob('src/screens/**/*heckout*')` in the app repo. Read the current submit handler to understand how `POST /api/v1/orders` is called.

- [ ] **Step 2: Add toggle + time picker**

```typescript
const [scheduleForLater, setScheduleForLater] = useState(false);
const [scheduledFor, setScheduledFor] = useState<Date | null>(null);

// Render below order summary:
<Switch
  value={scheduleForLater}
  onValueChange={v => { setScheduleForLater(v); if (!v) setScheduledFor(null); }}
  label="Schedule for later"
/>

{scheduleForLater && (
  <DateTimePicker
    value={scheduledFor ?? new Date()}
    onChange={(_, date) => setScheduledFor(date ?? null)}
    minimumDate={new Date()}
    maximumDate={addDays(new Date(), 1)}  // today + tomorrow only (per spec)
    mode="time"
  />
)}
```

- [ ] **Step 3: Pass `scheduledFor` on submit**

```typescript
const payload = {
  ...existingPayload,
  ...(scheduleForLater && scheduledFor ? { scheduledFor: scheduledFor.toISOString() } : {}),
};
```

- [ ] **Step 4: Add "Scheduled for" label in order history**

Find the order history screen. For orders where `order.scheduledFor` is present and `order.surfacedAt` is null, show:
```typescript
{order.scheduledFor && !order.surfacedAt && (
  <Text>Scheduled for {new Date(order.scheduledFor).toLocaleString()}</Text>
)}
```

- [ ] **Step 5: Commit**
```bash
git commit -m "feat(app): schedule for later toggle + time picker on checkout"
```

---

## Task 16: Smart NPS Split (Backend)

> **Standalone context:** Backend. After an order or booking reaches `status: 'Completed'` with a `guestEmail`, schedule an email 2 hours later with 1–5 star rating links. Token is `HMAC-SHA256(entityId:guestEmail)` — signed, unforgeable. Rating 4–5 redirects to thank-you + Google review link. Rating 1–3 redirects to internal feedback form. Saves to `GuestOrder.rating` / `Booking.rating`. Requires `NPS_HMAC_SECRET` and `GUEST_APP_URL` env vars.

**Files:**
- Create: `src/modules/nps/nps.service.ts`
- Create: `src/modules/nps/nps.controller.ts`
- Create: `src/routes/v1/nps.route.ts`
- Modify: `src/modules/orders/orders.service.ts`
- Modify: `src/modules/booking/booking.service.ts`
- Modify: `src/routes/v1/index.ts`

- [ ] **Step 1: Create `src/modules/nps/nps.service.ts`**

```typescript
import crypto from 'crypto';
import { sendEmail } from '../email/email.service';
import GuestOrder from '../orders/guest-order.model';
import Booking from '../booking/booking.model';
import logger from '../logger/logger';

const NPS_SECRET = process.env.NPS_HMAC_SECRET ?? 'change_me_in_env';

export function generateNpsToken(entityId: string, guestEmail: string): string {
  return crypto.createHmac('sha256', NPS_SECRET)
    .update(`${entityId}:${guestEmail}`)
    .digest('hex');
}

export function verifyNpsToken(entityId: string, guestEmail: string, token: string): boolean {
  const expected = generateNpsToken(entityId, guestEmail);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(token, 'hex'));
  } catch {
    return false;
  }
}

export function scheduleNpsEmail(params: {
  entityId: string;
  entityType: 'order' | 'booking';
  guestEmail: string;
  itemName: string;
}): void {
  setTimeout(async () => {
    try {
      const token = generateNpsToken(params.entityId, params.guestEmail);
      const base = process.env.API_BASE_URL ?? '';
      const ratingLinks = [1, 2, 3, 4, 5].map(rating => ({
        rating,
        url: `${base}/v1/feedback?entityId=${params.entityId}&entityType=${params.entityType}&rating=${rating}&email=${encodeURIComponent(params.guestEmail)}&token=${token}`,
      }));
      await sendEmail({
        to: params.guestEmail,
        subject: `How was your ${params.itemName}?`,
        template: 'npsRequest',
        data: { itemName: params.itemName, ratingLinks },
      });
    } catch (err) {
      logger.error(`NPS email failed for ${params.entityId}: ${err}`);
    }
  }, 2 * 60 * 60 * 1000);
}

export async function saveRating(params: {
  entityId: string;
  entityType: 'order' | 'booking';
  rating: number;
  guestEmail: string;
  token: string;
  comment?: string;
}): Promise<'positive' | 'negative'> {
  if (!verifyNpsToken(params.entityId, params.guestEmail, params.token)) {
    throw Object.assign(new Error('Invalid NPS token'), { statusCode: 403 });
  }

  const update: any = { rating: params.rating };
  if (params.comment) update.ratingComment = params.comment;

  if (params.entityType === 'order') {
    await GuestOrder.findByIdAndUpdate(params.entityId, update);
  } else {
    await Booking.findByIdAndUpdate(params.entityId, update);
  }

  return params.rating >= 4 ? 'positive' : 'negative';
}
```

- [ ] **Step 2: Create `src/modules/nps/nps.controller.ts`**

```typescript
import catchAsync from '../utils/catchAsync';
import { saveRating } from './nps.service';

export const submitFeedback = catchAsync(async (req, res) => {
  const { entityId, entityType, rating, email, token, comment } = req.query as Record<string, string>;

  const direction = await saveRating({
    entityId,
    entityType: entityType as 'order' | 'booking',
    rating: Number(rating),
    guestEmail: email,
    token,
    comment,
  });

  const guestApp = process.env.GUEST_APP_URL ?? '';
  if (direction === 'positive') {
    res.redirect(`${guestApp}/feedback/thank-you?googleReview=1`);
  } else {
    if (comment) {
      res.redirect(`${guestApp}/feedback/thank-you`);
    } else {
      res.redirect(
        `${guestApp}/feedback/form?entityId=${entityId}&entityType=${entityType}&rating=${rating}&email=${encodeURIComponent(email)}&token=${token}`
      );
    }
  }
});
```

- [ ] **Step 3: Create `src/routes/v1/nps.route.ts`**

```typescript
import express from 'express';
import { submitFeedback } from '../../modules/nps/nps.controller';
const router = express.Router();
router.get('/feedback', submitFeedback);
export default router;
```

- [ ] **Step 4: Trigger NPS in `orders.service.ts`**

Find the status-update function. When status changes to `'Completed'` and `order.guestEmail` is set:
```typescript
import { scheduleNpsEmail } from '../nps/nps.service';

if (newStatus === 'Completed' && order.guestEmail) {
  const item = await CatalogItem.findById(order.itemId).select('name');
  scheduleNpsEmail({
    entityId: String(order._id),
    entityType: 'order',
    guestEmail: order.guestEmail,
    itemName: item?.name ?? 'your order',
  });
}
```

- [ ] **Step 5: Trigger NPS in `booking.service.ts`**

When booking status is set to `'completed'` (e.g., in `updateBooking` controller or a dedicated complete function):
```typescript
import { scheduleNpsEmail } from '../nps/nps.service';

if (newStatus === 'completed' && booking.guestEmail) {
  const item = await CatalogItem.findById(booking.itemId).select('name');
  scheduleNpsEmail({
    entityId: String(booking._id),
    entityType: 'booking',
    guestEmail: booking.guestEmail,
    itemName: item?.name ?? 'your booking',
  });
}
```

- [ ] **Step 6: Register nps route in `src/routes/v1/index.ts`**

```typescript
import npsRoute from './nps.route';
router.use('/', npsRoute);
```

- [ ] **Step 7: Add to `.env.example`**

```
NPS_HMAC_SECRET=your_secret_here
GUEST_APP_URL=https://app.infiora.com
```

- [ ] **Step 8: Verify TypeScript compiles**

- [ ] **Step 9: Commit**
```bash
git commit -m "feat(wave3): smart NPS split — HMAC token, email scheduler, feedback endpoint"
```

---

## Task 17: Revenue Analytics Endpoints (Backend)

> **Standalone context:** Backend. New endpoints exposing aggregated stats for the analytics dashboard: revenue by category, avg acceptance time, SLA breach proxy count, daily avg ratings. No new collection — pure MongoDB aggregation over GuestOrder and Booking. Date range defaults to last 30 days.

**Files:**
- Create: `src/modules/analytics/analytics.service.ts`
- Create: `src/modules/analytics/analytics.controller.ts`
- Create: `src/routes/v1/analytics.route.ts`
- Modify: `src/routes/v1/index.ts`

- [ ] **Step 1: Create `src/modules/analytics/analytics.service.ts`**

```typescript
import mongoose from 'mongoose';
import GuestOrder from '../orders/guest-order.model';
import Booking from '../booking/booking.model';

export async function getAnalytics(hotelId: string, from: Date, to: Date) {
  const hid = new mongoose.Types.ObjectId(hotelId);
  const base = { hotelId: hid, createdAt: { $gte: from, $lte: to } };

  const [revenueByCategory, acceptanceStats, slaBreaches, dailyRatings, bookingCount] = await Promise.all([
    // Revenue by category (completed orders)
    GuestOrder.aggregate([
      { $match: { ...base, status: 'Completed' } },
      { $lookup: { from: 'catalogitems', localField: 'itemId', foreignField: '_id', as: 'item' } },
      { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$item.categoryId', totalRevenue: { $sum: '$total' }, orderCount: { $sum: 1 } } },
    ]),

    // Avg acceptance time: avg ms from createdAt to updatedAt for completed orders
    GuestOrder.aggregate([
      { $match: { ...base, status: { $in: ['Completed', 'Delivered'] } } },
      { $project: { diffMs: { $subtract: ['$updatedAt', '$createdAt'] } } },
      { $group: { _id: null, avgMs: { $avg: '$diffMs' }, count: { $sum: 1 } } },
    ]),

    // SLA breaches: orders still Awaiting confirmation older than their escalation window
    // Proxy: orders older than 5 min in awaiting state (escalation default is 30s for orders)
    GuestOrder.countDocuments({
      hotelId: hid,
      status: 'Awaiting confirmation',
      createdAt: { $lte: new Date(Date.now() - 5 * 60_000), $gte: from },
    }),

    // Daily avg rating
    GuestOrder.aggregate([
      { $match: { ...base, rating: { $ne: null } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Total booking count + revenue
    Booking.aggregate([
      { $match: { ...base, status: { $in: ['confirmed', 'completed'] } } },
      { $group: { _id: null, total: { $sum: 1 }, revenue: { $sum: '$total' } } },
    ]),
  ]);

  return {
    revenueByCategory,
    avgAcceptanceMs: acceptanceStats[0]?.avgMs ?? 0,
    slaBreaches,
    dailyRatings,
    bookings: bookingCount[0] ?? { total: 0, revenue: 0 },
  };
}
```

- [ ] **Step 2: Create `src/modules/analytics/analytics.controller.ts`**

```typescript
import catchAsync from '../utils/catchAsync';
import { getAnalytics } from './analytics.service';

export const getHotelAnalytics = catchAsync(async (req, res) => {
  const { hotelId } = req.params;
  const from = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 30 * 86_400_000);
  const to = req.query.to ? new Date(req.query.to as string) : new Date();
  const data = await getAnalytics(hotelId, from, to);
  res.json(data);
});
```

- [ ] **Step 3: Create `src/routes/v1/analytics.route.ts`**

```typescript
import express from 'express';
import { auth } from '../middleware/auth';
import { getHotelAnalytics } from '../../modules/analytics/analytics.controller';
const router = express.Router({ mergeParams: true });
router.get('/', auth('analytics:view'), getHotelAnalytics);
export default router;
```

- [ ] **Step 4: Register in `src/routes/v1/index.ts`**

```typescript
import analyticsRoute from './analytics.route';
router.use('/hotels/:hotelId/analytics', analyticsRoute);
```

- [ ] **Step 5: Verify TypeScript compiles**

- [ ] **Step 6: Commit**
```bash
git commit -m "feat(wave3): analytics endpoints — revenue, SLA breaches, acceptance time, ratings"
```

---

## Task 18: Daily Manager Digest Cron (08:00 per Hotel)

> **Standalone context:** Backend. Cron at 08:00 UTC daily. Aggregates yesterday's stats for each active hotel: orders (count, revenue, avg rating), bookings (count), housekeeping (open/resolved), maintenance (open/resolved). Sends an email to hotel owner + `hotel.orders.emails`. No new collection — pure aggregation.

**Files:**
- Create: `src/modules/scheduler/dailyDigest.ts`
- Modify: `src/index.ts`
- Create or add: `dailyDigest` email template in email templates directory

- [ ] **Step 1: Create `src/modules/scheduler/dailyDigest.ts`**

```typescript
import cron from 'node-cron';
import Hotel from '../hotel/hotel.model';
import GuestOrder from '../orders/guest-order.model';
import Booking from '../booking/booking.model';
import { sendEmail } from '../email/email.service';
import logger from '../logger/logger';

async function buildDigest(hotel: any) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const today = new Date(yesterday.getTime() + 86_400_000);
  const range = { createdAt: { $gte: yesterday, $lt: today } };
  const hotelId = hotel._id;

  const [orderStats, bookingStats] = await Promise.all([
    GuestOrder.aggregate([
      { $match: { hotelId, ...range } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          revenue: { $sum: '$total' },
          avgRating: { $avg: '$rating' },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
        },
      },
    ]),
    Booking.aggregate([
      { $match: { hotelId, ...range } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          confirmed: { $sum: { $cond: [{ $in: ['$status', ['confirmed', 'completed']] }, 1, 0] } },
        },
      },
    ]),
  ]);

  // Dynamic imports to avoid circular dependency issues
  const Maintenance = (await import('../maintenance/maintenance.model')).default;
  const Housekeeping = (await import('../housekeeping/housekeeping.model')).default;

  const [maintOpen, maintResolved, hkOpen, hkResolved] = await Promise.all([
    Maintenance.countDocuments({ hotelId, ...range, status: { $ne: 'resolved' } }),
    Maintenance.countDocuments({ hotelId, ...range, status: 'resolved' }),
    Housekeeping.countDocuments({ hotelId, ...range, status: { $ne: 'completed' } }),
    Housekeeping.countDocuments({ hotelId, ...range, status: 'completed' }),
  ]);

  return {
    hotelName: hotel.name,
    date: yesterday.toDateString(),
    orders: orderStats[0] ?? { total: 0, revenue: 0, avgRating: null, completed: 0 },
    bookings: bookingStats[0] ?? { total: 0, confirmed: 0 },
    maintenance: { open: maintOpen, resolved: maintResolved },
    housekeeping: { open: hkOpen, resolved: hkResolved },
  };
}

async function sendDailyDigests(): Promise<void> {
  const hotels = await Hotel.find({ isActive: true });
  for (const hotel of hotels) {
    try {
      const data = await buildDigest(hotel);
      const recipients = [
        hotel.ownerEmail,
        ...((hotel.orders as any)?.emails ?? []),
      ].filter(Boolean);

      for (const to of recipients) {
        await sendEmail({
          to,
          subject: `Daily Digest — ${hotel.name} — ${data.date}`,
          template: 'dailyDigest',
          data,
        });
      }
    } catch (err) {
      logger.error(`Daily digest failed for hotel ${hotel._id}: ${err}`);
    }
  }
}

export function startDailyDigestCron(): void {
  cron.schedule('0 8 * * *', sendDailyDigests, { timezone: 'UTC' });
  logger.info('Daily digest cron started (08:00 UTC)');
}
```

- [ ] **Step 2: Register in `src/index.ts`**

```typescript
import { startDailyDigestCron } from './modules/scheduler/dailyDigest';
startDailyDigestCron();
```

- [ ] **Step 3: Create `dailyDigest` email template**

Find the email templates directory (e.g., `src/modules/email/templates/`). Create `dailyDigest.html` or `.hbs` showing:
- Hotel name + date
- Orders: total, revenue, avg rating, completed count
- Bookings: total, confirmed count
- Maintenance: open / resolved
- Housekeeping: open / resolved

- [ ] **Step 4: Verify TypeScript compiles**

- [ ] **Step 5: Commit**
```bash
git commit -m "feat(wave3): daily manager digest cron (08:00 UTC)"
```

---

## Task 19: Dash — `/analytics` Page

> **Standalone context:** `infiora-dash-main/infiora-dash-main/`. New route. Shows KPI cards + charts using the analytics endpoint from Task 17. Use the existing charting library (check `package.json` — likely `recharts` or `chart.js`) and the `KpiCard` component (see `src/views/`).

**Files:**
- Create: `src/app/[lang]/(private)/analytics/page.tsx`
- Create: `src/views/analytics/pages/AnalyticsPage.tsx`

- [ ] **Step 1: Create route page**

`src/app/[lang]/(private)/analytics/page.tsx`:
```typescript
import AnalyticsPage from '@/views/analytics/pages/AnalyticsPage';
export default AnalyticsPage;
```

- [ ] **Step 2: Create `src/views/analytics/pages/AnalyticsPage.tsx`**

```typescript
'use client';
// State: from, to (default: last 30 days), data

// On mount + on date range change: GET /api/v1/hotels/:hotelId/analytics?from=...&to=...

// Layout:
// 1. Date range picker row (from / to)
// 2. KPI cards row (use existing KpiCard component):
//    - Total revenue (sum of revenueByCategory)
//    - Bookings (data.bookings.total)
//    - Avg acceptance time (format avgAcceptanceMs as "Xm Ys")
//    - SLA breaches (data.slaBreaches)
//    - Avg rating (avg of dailyRatings.avgRating — format "4.2 ★")
// 3. Revenue by category — BarChart
//    x: category name (populate category names from catalog categories API)
//    y: totalRevenue
// 4. Daily ratings — LineChart
//    x: date (_id), y: avgRating, secondary y: count
```

- [ ] **Step 3: Add `/analytics` to sidebar navigation**

Gated by `analytics:view` permission (check from hotel features context).

- [ ] **Step 4: Commit**
```bash
git commit -m "feat(dash): analytics page — revenue, SLA, acceptance time, daily ratings"
```

---

## Design Spec Invariants Checklist

Verify before closing each relevant task:

- [ ] **Task 6/9:** `endTime` on `Booking` is snapshotted at creation from `config.duration` — never re-derived from `CatalogItem.duration` post-creation
- [ ] **Task 9:** `bookedPersons` on `TimeSlot` is the single source of truth — never recomputed from Booking count
- [ ] **Task 11:** Escalation timer is cancelled before status update commits, not after
- [ ] **Task 11:** Admin SSE channel (`adminClients`) always receives every booking event regardless of dispatch routing
- [ ] **Task 10:** Slot blocking returns `409` with affected bookings list if `bookedPersons > 0`
- [ ] **Task 16:** NPS token verified with `crypto.timingSafeEqual` — timing-safe
- [ ] **Task 9:** Waitlist `notifiedAt` is set before the notification email is sent — prevents duplicate on crash/retry
- [ ] **Task 3 (Admin):** PIN uniqueness within hotel is enforced at creation (bcrypt prevents DB index comparison — do it in service logic)
- [ ] **Task 8:** Slot generation uses `$setOnInsert` — safe to re-run, never overwrites existing slot capacity
