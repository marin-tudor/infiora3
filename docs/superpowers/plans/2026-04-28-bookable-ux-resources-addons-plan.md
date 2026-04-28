# Bookable Services UX, Resources & Add-ons — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Date:** 2026-04-28
**Goal:** Four UX reorganisations (analytics, scheduled orders, orders setup, nav cleanup) + full bookable item configuration form + named resource management + resource calendar + add-ons/upsell + blackout dates.

**Related specs/plans (read for extra context but not required to proceed):**
- `docs/superpowers/specs/2026-04-21-booking-engine-rbac-dispatching-design.md`
- `docs/superpowers/plans/2026-04-27-wave2-wave3-implementation-plan.md`

**Repos (all as sub-directories of `~/infiora/`):**
- `infiora-dash-main/infiora-dash-main/` — Next.js 14 App Router dashboard (MUI v5, RTK Query)
- `infiora-backend-main/infiora-backend-main/` — Express + TypeScript + MongoDB/Mongoose
- `infiora-app-main/infiora-app-main/` — React Native guest app

---

## Task Index

| # | Task | Repo |
|---|------|------|
| 1 | Dash — Revenue Analytics → new tab in /insights | dash |
| 2 | Dash — Scheduled Orders → tab in /orders + home dashboard widget | dash |
| 3 | Dash — Orders Setup → move to /settings | dash |
| 4 | Backend — Extend bookingConfig on CatalogItem | backend |
| 5 | Backend — Update slot generation (startInterval + inventory model) | backend |
| 6 | Backend — Extend ServiceResource + CRUD routes | backend |
| 7 | Backend — BlackoutDate model + routes | backend |
| 8 | Backend — Extend Booking model (selected add-ons + assigned resource) | backend |
| 9 | Dash — ItemDialog bookable form (4-section accordion) | dash |
| 10 | Dash — Resource Management tab in /bookings | dash |
| 11 | Dash — Resource Calendar view in /bookings | dash |
| 12 | Dash — Blackout Dates UI in /bookings calendar | dash |
| 13 | App — Add-ons picker in BookingConfirmScreen | app |

---

## File Map

### Modified Backend Files

| File | Change |
|------|--------|
| `src/modules/orders/catalog-item.model.ts` | Extend `bookingConfig` with new fields |
| `src/modules/orders/orders.interfaces.ts` | Update `ICatalogItemBookingConfig` type |
| `src/modules/scheduler/slotGeneration.ts` | Honour `startInterval`; handle inventory model |
| `src/modules/booking/service-resource.model.ts` | Add `identifier`, `isActive` fields |
| `src/modules/booking/booking.model.ts` | Add `assignedResourceId`, `selectedAddons` |
| `src/modules/booking/booking.interfaces.ts` | Update `IBooking` interface |
| `src/routes/v1/booking.route.ts` | Add blackout + resource CRUD routes |
| `src/routes/v1/index.ts` | Register blackout route |

### New Backend Files

| File | Purpose |
|------|---------|
| `src/modules/booking/blackout-date.model.ts` | BlackoutDate schema |
| `src/modules/booking/blackout-date.controller.ts` | HTTP handlers |
| `src/routes/v1/blackout.route.ts` | REST endpoints |

### Modified Dash Files

| File | Change |
|------|--------|
| `src/data/navigation/verticalMenuData.tsx` | Remove "Revenue Analytics" nav item |
| `src/app/[lang]/(private)/analytics/page.tsx` | Redirect to /insights?tab=revenue |
| `src/views/insights/pages/InsightsPage.tsx` | Add Revenue tab (6th tab) |
| `src/views/orders/pages/OrdersPage.tsx` | Add Scheduled tab; remove Settings tab |
| `src/views/home/pages/HomePage.tsx` | Add UpcomingScheduledOrders widget |
| `src/views/settings/Settings.tsx` | Convert to tabbed layout (Account + Orders) |
| `src/views/orders/components/ItemDialog.tsx` | Add type toggle + 4-section bookable form |

### New Dash Files

| File | Purpose |
|------|---------|
| `src/views/insights/components/RevenueAnalyticsTab.tsx` | Revenue Analytics tab content |
| `src/views/home/components/UpcomingScheduledOrders.tsx` | Upcoming scheduled orders widget |
| `src/views/bookings/components/ResourcesTab.tsx` | Resource CRUD management |
| `src/views/bookings/components/ResourceCalendar.tsx` | Timeline view per resource |
| `src/views/bookings/components/BlackoutDatesPanel.tsx` | Blackout date controls in calendar |

---

## Task 1: Dash — Revenue Analytics → New Tab in /insights

> **Standalone context:** `infiora-dash-main/infiora-dash-main/`. The Wave 3 implementation created a separate `/analytics` route and a "Revenue Analytics" sidebar item. This task folds that page into `/insights` as a new "Revenue" tab (making it the 6th tab), then removes the standalone nav entry and redirects the old route.

**Files:**
- Read: `src/views/analytics/pages/AnalyticsPage.tsx` (source content to copy)
- Create: `src/views/insights/components/RevenueAnalyticsTab.tsx`
- Modify: `src/views/insights/pages/InsightsPage.tsx`
- Modify: `src/data/navigation/verticalMenuData.tsx`
- Modify: `src/app/[lang]/(private)/analytics/page.tsx` (redirect)

- [ ] **Step 1: Create `RevenueAnalyticsTab.tsx`**

Read `src/views/analytics/pages/AnalyticsPage.tsx`. Copy its JSX and logic into a new component:

```typescript
// src/views/insights/components/RevenueAnalyticsTab.tsx
'use client'
// Props: { hotelId: string; from: Date; to: Date }
// Data: GET /api/v1/hotels/:hotelId/analytics?from=...&to=...
// Layout:
//   - KPI row: total revenue, bookings, avg acceptance time (ms → "Xm Ys"), SLA breaches, avg rating
//   - BarChart: revenue by category (x = category name, y = totalRevenue)
//   - LineChart: daily avg rating (x = date, y = avgRating)
// Use existing KpiCard component (search: Glob('src/views/**/*KpiCard*') or similar)
// Use AppReactApexCharts for charts (follow InsightsPage pattern)
```

The parent (InsightsPage) passes `from`/`to` from the shared date-range state so date pickers remain in sync across all tabs.

- [ ] **Step 2: Add Revenue tab to `InsightsPage.tsx`**

InsightsPage currently has 5 tabs: Overview, Rooms, Buttons, Orders, Reports. Tab state is stored as a URL query param (`tab`).

Add a 6th tab:
```tsx
// In the tabs array:
{ key: 'revenue', label: 'Revenue', icon: 'ri-bar-chart-box-line' }

// In the tab panel switch:
case 'revenue':
  return <RevenueAnalyticsTab hotelId={hotelId} from={startDate} to={endDate} />
```

- [ ] **Step 3: Remove "Revenue Analytics" from sidebar nav**

Open `src/data/navigation/verticalMenuData.tsx`. Find and delete the nav item pointing to `/analytics` (label "Revenue Analytics", icon `ri-bar-chart-box-line`).

- [ ] **Step 4: Redirect old `/analytics` route**

Replace content of `src/app/[lang]/(private)/analytics/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
export default function AnalyticsRedirect() {
  redirect('/insights?tab=revenue')
}
```

- [ ] **Step 5: Verify** — navigate to `/insights`, confirm Revenue tab appears and renders data. Navigate to `/analytics`, confirm redirect fires.

- [ ] **Step 6: Commit**
```bash
git add src/views/insights/ src/data/navigation/ src/app/\[lang\]/\(private\)/analytics/
git commit -m "feat(dash): fold revenue analytics into /insights as Revenue tab"
```

---

## Task 2: Dash — Scheduled Orders Tab + Home Dashboard Widget

> **Standalone context:** `infiora-dash-main/infiora-dash-main/`. Two changes: (1) Scheduled orders content (currently at `/orders/scheduled`, implemented as `ScheduledOrdersPage.tsx`) moves to a new "Scheduled" tab inside the Orders page. (2) A compact widget shows upcoming scheduled orders on the home dashboard (`HomePage.tsx`) so staff see what's queued when they first log in.

**Files:**
- Read: `src/views/orders/pages/ScheduledOrdersPage.tsx` (content to convert to a tab)
- Modify: `src/views/orders/pages/OrdersPage.tsx`
- Create: `src/views/home/components/UpcomingScheduledOrders.tsx`
- Modify: `src/views/home/pages/HomePage.tsx`

- [ ] **Step 1: Add Scheduled tab to `OrdersPage.tsx`**

Current tabs (0-indexed): 0 Dashboard, 1 Orders, 2 Menu, 3 Codes, 4 Settings.

Insert a new tab at index 3 (before Codes):
```tsx
<Tab label={t.scheduledTab || 'Scheduled'} icon={<i className='ri-time-line' />} iconPosition='start' />
```

Shift existing indexes: Codes → 4, Settings → 5.

In the tab panel, add:
```tsx
{tab === 3 && <ScheduledOrdersContent hotelId={hotelId} />}
```

Extract the content from `ScheduledOrdersPage.tsx` into a plain component `ScheduledOrdersContent` (or inline it). The component:
- Fetches `GET /api/v1/orders/hotels/:hotelId?scheduled=true`
- Polls every 60 seconds
- Shows a list: Room, scheduled time (coloured amber if today, grey if tomorrow+), items, status
- Shows "No scheduled orders" when empty

- [ ] **Step 2: Create `UpcomingScheduledOrders.tsx`**

Compact widget for the home screen showing the next N (max 5) scheduled orders:

```typescript
// src/views/home/components/UpcomingScheduledOrders.tsx
'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, Stack, Typography, Chip, Divider } from '@mui/material'
import axios from 'axios'

export default function UpcomingScheduledOrders({ hotelId }: { hotelId: string }) {
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    const fetch = () =>
      axios.get(`/api/v1/orders/hotels/${hotelId}`, { params: { scheduled: true } })
        .then(r => {
          const all = r.data.results ?? r.data
          // Sort by scheduledFor ASC, take first 5
          const sorted = [...all].sort((a, b) =>
            new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
          )
          setOrders(sorted.slice(0, 5))
        })
    fetch()
    const interval = setInterval(fetch, 60_000)
    return () => clearInterval(interval)
  }, [hotelId])

  if (orders.length === 0) return null

  return (
    <Card>
      <CardContent>
        <Stack direction='row' alignItems='center' justifyContent='space-between' mb={1.5}>
          <Typography variant='h6' fontWeight={600}>
            <i className='ri-time-line' style={{ marginRight: 6 }} />
            Upcoming Scheduled Orders
          </Typography>
          <Chip label={orders.length} size='small' color='warning' />
        </Stack>
        <Stack divider={<Divider />} gap={1}>
          {orders.map(order => {
            const scheduled = new Date(order.scheduledFor)
            const isToday = scheduled.toDateString() === new Date().toDateString()
            return (
              <Stack key={order._id} direction='row' justifyContent='space-between' alignItems='center' py={0.5}>
                <Stack gap={0.25}>
                  <Typography variant='body2' fontWeight={600}>
                    Room {order.guestRoomNumber}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {order.items?.map((i: any) => i.name).join(', ')}
                  </Typography>
                </Stack>
                <Typography variant='body2' fontWeight={600} color={isToday ? 'warning.main' : 'text.secondary'}>
                  {isToday ? 'Today ' : scheduled.toLocaleDateString()}{' '}
                  {scheduled.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Stack>
            )
          })}
        </Stack>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Add widget to `HomePage.tsx`**

Find where the orders section is rendered (look for `ordersEnabled` feature flag check). Add `<UpcomingScheduledOrders hotelId={hotelId} />` below the existing orders KPI cards, gated by the same `ordersEnabled` flag.

- [ ] **Step 4: Verify** — orders tab shows Scheduled sub-tab, home screen shows widget with amber timestamps for today's orders.

- [ ] **Step 5: Commit**
```bash
git commit -m "feat(dash): scheduled orders tab in /orders + home dashboard widget"
```

---

## Task 3: Dash — Orders Setup → /settings

> **Standalone context:** `infiora-dash-main/infiora-dash-main/`. The "Settings" tab (tab 4) in OrdersPage contains `OrderSettings.tsx` — a form covering payment methods, status labels, emails, venue type, kiosk mode. This moves to `/settings`, which currently only shows a user account form. `/settings` becomes a two-tab page: Account (existing) + Orders (existing OrderSettings).

**Files:**
- Modify: `src/views/settings/Settings.tsx`
- Modify: `src/views/orders/pages/OrdersPage.tsx`

- [ ] **Step 1: Convert `Settings.tsx` to tabbed layout**

```typescript
// src/views/settings/Settings.tsx
'use client'
import { useState } from 'react'
import { Tabs, Tab, Box } from '@mui/material'
import AccountSettings from './AccountSettings'   // extract existing form (see below)
import OrderSettings from '../orders/components/OrderSettings'
import { useAuthUser } from '@/hooks/useAuthUser'

export default function Settings({ authUser }: any) {
  const [tab, setTab] = useState(0)
  const auth = useAuthUser()
  const hotelId = auth?.hotel?.id

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label='Account' icon={<i className='ri-user-line' />} iconPosition='start' />
        <Tab label='Orders Setup' icon={<i className='ri-settings-3-line' />} iconPosition='start' />
      </Tabs>
      {tab === 0 && <AccountSettings authUser={authUser} />}
      {tab === 1 && hotelId && <OrderSettings hotelId={hotelId} />}
    </Box>
  )
}
```

Move the existing account form code out of `Settings.tsx` into a new file `src/views/settings/AccountSettings.tsx` — just a rename/extract, no logic changes.

- [ ] **Step 2: Remove Settings tab from `OrdersPage.tsx`**

Remove tab index 4 (the Settings tab label and `<Tab>` element). Remove the `{tab === 4 && <OrderSettings ...>}` panel. Remove the `OrderSettings` import.

Adjust any hardcoded tab index references if present.

- [ ] **Step 3: Verify** — `/settings` shows two tabs, Orders Setup tab renders the same form as before. `/orders` no longer has a Settings tab.

- [ ] **Step 4: Commit**
```bash
git commit -m "feat(dash): move Orders Setup to /settings; Settings page becomes tabbed"
```

---

## Task 4: Backend — Extend bookingConfig on CatalogItem

> **Standalone context:** `infiora-backend-main/infiora-backend-main/`. The `CatalogItem` model at `src/modules/orders/catalog-item.model.ts` already has a `bookingConfig` sub-document with: `slotType` (private/shared), `maxPersons`, `duration`, `bufferMinutes`, `advanceMinHours`, `advanceMaxDays`, `requiresApproval`, `cancelPolicyHours`, `resourceIds`, `weeklySchedule`.
>
> This task adds new fields to support the full professional booking form: booking model (exclusive per-unit vs shared per-seat), inventory count, start interval for clean slot times, confirmation type, price mode, add-ons, bookable service category, and a simplified availability option. All new fields have defaults — existing documents are unaffected.

**Files:**
- Modify: `src/modules/orders/catalog-item.model.ts`
- Modify: `src/modules/orders/orders.interfaces.ts` (find the `ICatalogItemBookingConfig` interface)

- [ ] **Step 1: Add new fields to `bookingConfig` in `catalog-item.model.ts`**

Inside the `bookingConfig` block, add after `weeklySchedule`:

```typescript
// Booking model
bookingModel: {
  type: String,
  enum: ['exclusive', 'shared'],
  default: 'exclusive',
  // exclusive = guest books the whole resource (car, room)
  // shared = guest books a seat in a group (bus tour, group class)
},
totalInventory: { type: Number, default: 1 },      // how many units/resources exist
capacityPerUnit: { type: Number, default: 1 },      // max persons per unit (informational for exclusive, seat count for shared)
minPersons: { type: Number, default: 1 },
startInterval: { type: Number, default: 60 },       // minutes; slots start every N min (15/30/60)

// Confirmation
confirmationType: {
  type: String,
  enum: ['instant', 'request'],
  default: 'instant',
  // 'instant' = auto-confirmed, 'request' = staff must manually confirm
},

// Pricing
pricePerPerson: { type: Boolean, default: false },  // false = price is per booking unit

// Cancellation (replaces cancelPolicyHours as a named policy)
cancellationPolicy: {
  type: String,
  enum: ['free_24h', 'free_48h', 'non_refundable', 'custom'],
  default: 'free_24h',
},
// only used when cancellationPolicy === 'custom':
cancellationPolicyHours: { type: Number, default: 24 },

// Bookable service category (for display/filtering in guest app)
bookableCategory: {
  type: String,
  enum: ['transfer', 'tour', 'service', 'rental', 'other'],
  default: 'service',
},

// Add-ons / upsell items
addons: {
  type: [
    {
      name: { type: String, required: true },
      price: { type: Number, default: 0 },
      description: { type: String, default: '' },
    }
  ],
  default: [],
},

// Simple availability (single from/to, same every day)
// When set, slot generation uses this instead of weeklySchedule
simpleAvailability: {
  enabled: { type: Boolean, default: true },
  from: { type: String, default: '08:00' },  // HH:MM
  to: { type: String, default: '22:00' },    // HH:MM
},
```

- [ ] **Step 2: Update `ICatalogItemBookingConfig` in `orders.interfaces.ts`**

Find the file (likely `src/modules/orders/orders.interfaces.ts`). Update the interface to include all new fields:

```typescript
export interface IAddon {
  name: string;
  price: number;
  description: string;
}

export interface ICatalogItemBookingConfig {
  // existing
  slotType: 'private' | 'shared';
  maxPersons: number;
  duration: number;
  bufferMinutes: number;
  advanceMinHours: number;
  advanceMaxDays: number;
  requiresApproval: boolean;
  cancelPolicyHours: number;
  resourceIds: mongoose.Types.ObjectId[];
  weeklySchedule: Record<'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun', { from: string; to: string }[]>;
  // new
  bookingModel: 'exclusive' | 'shared';
  totalInventory: number;
  capacityPerUnit: number;
  minPersons: number;
  startInterval: number;
  confirmationType: 'instant' | 'request';
  pricePerPerson: boolean;
  cancellationPolicy: 'free_24h' | 'free_48h' | 'non_refundable' | 'custom';
  cancellationPolicyHours: number;
  bookableCategory: 'transfer' | 'tour' | 'service' | 'rental' | 'other';
  addons: IAddon[];
  simpleAvailability: { enabled: boolean; from: string; to: string };
}
```

- [ ] **Step 3: Verify TypeScript compiles**
```bash
cd infiora-backend-main/infiora-backend-main && npx tsc --noEmit
```

- [ ] **Step 4: Commit**
```bash
git commit -m "feat(backend): extend bookingConfig — inventory model, startInterval, addons, cancellationPolicy"
```

---

## Task 5: Backend — Update Slot Generation

> **Standalone context:** `infiora-backend-main/infiora-backend-main/`. The nightly slot generation cron is at `src/modules/scheduler/slotGeneration.ts`. It currently steps through slots by `config.duration + config.bufferMinutes`. Two changes: (1) use `startInterval` as the step for clean start times (e.g., every 30 min regardless of duration+buffer); (2) set `maxPersons` on each TimeSlot correctly for the new inventory model: for `exclusive` = `totalInventory` (each booking takes 1 unit, so N units = N simultaneous exclusive bookings); for `shared` = `totalInventory × capacityPerUnit` (total seat count). (3) If `simpleAvailability.enabled`, use from/to for all 7 days instead of weeklySchedule.

**Files:**
- Modify: `src/modules/scheduler/slotGeneration.ts`

- [ ] **Step 1: Update `generateSlotsForHotel` function**

Find the inner loop that iterates over `schedule` entries. Replace the step calculation and `maxPersons` logic:

```typescript
// Step = max(startInterval, duration + bufferMinutes) to ensure slots don't overlap
const step = Math.max(config.startInterval ?? config.duration, config.duration + config.bufferMinutes)

// maxPersons per slot depends on booking model
const maxPersons =
  config.bookingModel === 'exclusive'
    ? (config.totalInventory ?? 1)         // N units = N slots available concurrently
    : (config.totalInventory ?? 1) * (config.capacityPerUnit ?? config.maxPersons ?? 1) // seats
```

- [ ] **Step 2: Handle `simpleAvailability`**

Before iterating over `weeklySchedule`, check:

```typescript
const useSimple = config.simpleAvailability?.enabled !== false && config.simpleAvailability?.from

// Build effective schedule:
const effectiveSchedule: Record<string, { from: string; to: string }[]> = useSimple
  ? { mon: [s], tue: [s], wed: [s], thu: [s], fri: [s], sat: [s], sun: [s] }
  : config.weeklySchedule
where s = { from: config.simpleAvailability.from, to: config.simpleAvailability.to }
```

Use `effectiveSchedule` instead of `config.weeklySchedule` for the day loop.

- [ ] **Step 3: Pass `maxPersons` into the `$setOnInsert` upsert**

The `$setOnInsert` block already has `maxPersons`. Ensure it uses the computed value from Step 1.

- [ ] **Step 4: Verify TypeScript compiles**

- [ ] **Step 5: Commit**
```bash
git commit -m "feat(backend): slot generation honours startInterval + inventory model + simpleAvailability"
```

---

## Task 6: Backend — ServiceResource Extension + CRUD Routes

> **Standalone context:** `infiora-backend-main/infiora-backend-main/`. `ServiceResource` is at `src/modules/booking/service-resource.model.ts`. It currently has: `hotelId`, `name`, `type` (room/equipment/staff_member), `capacity`. This task adds: `identifier` (e.g. plate number "AN 123-ZG"), `isActive` flag. Then wires up REST CRUD so the dashboard can list, create, edit, and delete resources.

**Files:**
- Modify: `src/modules/booking/service-resource.model.ts`
- Modify: `src/modules/booking/booking.interfaces.ts`
- Modify: `src/modules/booking/booking.controller.ts`
- Modify: `src/routes/v1/booking.route.ts`

- [ ] **Step 1: Extend `service-resource.model.ts`**

Add after `capacity`:
```typescript
identifier: { type: String, default: '' },   // plate number, serial, room name, etc.
isActive: { type: Boolean, default: true },
```

- [ ] **Step 2: Update `IServiceResource` interface in `booking.interfaces.ts`**

Add:
```typescript
identifier?: string;
isActive: boolean;
```

- [ ] **Step 3: Add CRUD handlers to `booking.controller.ts`**

```typescript
export const listResources = catchAsync(async (req, res) => {
  const resources = await ServiceResource.find({
    hotelId: req.params.hotelId,
    isActive: req.query.includeInactive === 'true' ? undefined : true,
  }).sort({ type: 1, name: 1 })
  res.json(resources)
})

export const createResource = catchAsync(async (req, res) => {
  const resource = await ServiceResource.create({ ...req.body, hotelId: req.params.hotelId })
  res.status(201).json(resource)
})

export const updateResource = catchAsync(async (req, res) => {
  const resource = await ServiceResource.findOneAndUpdate(
    { _id: req.params.resourceId, hotelId: req.params.hotelId },
    req.body,
    { new: true }
  )
  if (!resource) return res.status(404).json({ message: 'Not found' })
  res.json(resource)
})

export const deleteResource = catchAsync(async (req, res) => {
  await ServiceResource.findOneAndUpdate(
    { _id: req.params.resourceId, hotelId: req.params.hotelId },
    { isActive: false }  // soft delete — don't destroy history
  )
  res.status(204).send()
})
```

- [ ] **Step 4: Add resource routes to `booking.route.ts`**

```typescript
// Resource management (before /:bookingId routes)
router.route('/resources')
  .get(auth('bookings:view'), bookingController.listResources)
  .post(auth('bookings:confirm'), bookingController.createResource)

router.route('/resources/:resourceId')
  .patch(auth('bookings:confirm'), bookingController.updateResource)
  .delete(auth('bookings:confirm'), bookingController.deleteResource)
```

- [ ] **Step 5: Verify TypeScript compiles**

- [ ] **Step 6: Commit**
```bash
git commit -m "feat(backend): extend ServiceResource (identifier, isActive) + CRUD routes"
```

---

## Task 7: Backend — BlackoutDate Model + Routes

> **Standalone context:** `infiora-backend-main/infiora-backend-main/`. A BlackoutDate marks a specific calendar date as unavailable — either for a specific bookable item or for all bookable items in the hotel. The slot generation cron skips blackout dates. The booking creation endpoint rejects new bookings on blackout dates.

**Files:**
- Create: `src/modules/booking/blackout-date.model.ts`
- Create: `src/modules/booking/blackout-date.controller.ts`
- Modify: `src/modules/booking/booking.service.ts` (validate on create)
- Modify: `src/modules/scheduler/slotGeneration.ts` (skip blackout dates)
- Modify: `src/routes/v1/booking.route.ts` (add routes)

- [ ] **Step 1: Create `src/modules/booking/blackout-date.model.ts`**

```typescript
import mongoose, { Schema, Document, Model } from 'mongoose'
import toJSON from '../toJSON/toJSON'

export interface IBlackoutDate {
  hotelId: mongoose.Types.ObjectId
  itemId?: mongoose.Types.ObjectId | null  // null = applies to ALL bookable items
  date: string   // 'YYYY-MM-DD' — stored as string for easy comparison
  reason?: string
  createdBy?: mongoose.Types.ObjectId
}
export interface IBlackoutDateDoc extends IBlackoutDate, Document {}

const blackoutDateSchema = new Schema<IBlackoutDateDoc>(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CatalogItem', default: null },
    date: { type: String, required: true },   // e.g. '2026-07-15'
    reason: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)
blackoutDateSchema.index({ hotelId: 1, date: 1 })
blackoutDateSchema.plugin(toJSON)

export default mongoose.model<IBlackoutDateDoc>('BlackoutDate', blackoutDateSchema)
```

- [ ] **Step 2: Create `blackout-date.controller.ts`**

```typescript
import catchAsync from '../utils/catchAsync'
import BlackoutDate from './blackout-date.model'

export const listBlackoutDates = catchAsync(async (req, res) => {
  const filter: any = { hotelId: req.params.hotelId }
  if (req.query.itemId) filter.itemId = req.query.itemId
  if (req.query.from) filter.date = { $gte: req.query.from }
  res.json(await BlackoutDate.find(filter).sort({ date: 1 }))
})

export const createBlackoutDate = catchAsync(async (req, res) => {
  const doc = await BlackoutDate.create({
    ...req.body,
    hotelId: req.params.hotelId,
    createdBy: req.user?.id,
  })
  res.status(201).json(doc)
})

export const deleteBlackoutDate = catchAsync(async (req, res) => {
  await BlackoutDate.findOneAndDelete({
    _id: req.params.blackoutId,
    hotelId: req.params.hotelId,
  })
  res.status(204).send()
})
```

- [ ] **Step 3: Guard booking creation against blackout dates**

In `booking.service.ts`, inside `createBooking`, after validating advance window:

```typescript
import BlackoutDate from './blackout-date.model'

const slotDateStr = data.startTime.toISOString().slice(0, 10)
const blackout = await BlackoutDate.findOne({
  hotelId: data.hotelId,
  date: slotDateStr,
  $or: [{ itemId: null }, { itemId: data.itemId }],
})
if (blackout) {
  throw Object.assign(new Error('Service not available on this date'), { statusCode: 400, code: 'BLACKOUT_DATE' })
}
```

- [ ] **Step 4: Skip blackout dates in slot generation**

In `slotGeneration.ts`, before generating slots for a day, check if that date has a blackout:

```typescript
// Load blackout dates for this hotel at the start of generateSlotsForHotel:
const blackoutSet = new Set(
  (await BlackoutDate.find({ hotelId, $or: [{ itemId: null }, { itemId: item._id }] })).map(b => b.date)
)

// Inside day loop:
const dateStr = date.toISOString().slice(0, 10)
if (blackoutSet.has(dateStr)) continue
```

- [ ] **Step 5: Add routes to `booking.route.ts`**

```typescript
router.route('/blackout')
  .get(auth('bookings:view'), blackoutController.listBlackoutDates)
  .post(auth('bookings:confirm'), blackoutController.createBlackoutDate)

router.route('/blackout/:blackoutId')
  .delete(auth('bookings:confirm'), blackoutController.deleteBlackoutDate)
```

- [ ] **Step 6: Verify TypeScript compiles**

- [ ] **Step 7: Commit**
```bash
git commit -m "feat(backend): BlackoutDate model + routes + booking guard + slot generation skip"
```

---

## Task 8: Backend — Extend Booking Model (Add-ons + Assigned Resource)

> **Standalone context:** `infiora-backend-main/infiora-backend-main/`. Two additions to the `Booking` model at `src/modules/booking/booking.model.ts`: (1) `assignedResourceId` — which specific `ServiceResource` was assigned (set by staff when confirming); (2) `selectedAddons` — the add-ons the guest chose at booking time with name and price snapshotted. Total calculation on create should sum `item.price + selectedAddons sum`.

**Files:**
- Modify: `src/modules/booking/booking.model.ts`
- Modify: `src/modules/booking/booking.interfaces.ts`
- Modify: `src/modules/booking/booking.service.ts` (include addons in total)
- Modify: `src/modules/booking/booking.controller.ts` (accept assignedResourceId on update)

- [ ] **Step 1: Extend `booking.model.ts`**

Add inside the bookingSchema:
```typescript
assignedResourceId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'ServiceResource',
  default: null,
},
selectedAddons: {
  type: [
    {
      addonId: { type: String },       // matches addon _id from bookingConfig.addons
      name: { type: String },
      price: { type: Number, default: 0 },
    }
  ],
  default: [],
},
```

- [ ] **Step 2: Update `IBooking` in `booking.interfaces.ts`**

```typescript
assignedResourceId?: mongoose.Types.ObjectId | null;
selectedAddons: { addonId: string; name: string; price: number }[];
```

- [ ] **Step 3: Include addons in total in `booking.service.ts`**

In `createBooking`, after resolving `item`:
```typescript
const addonTotal = (data.selectedAddons ?? []).reduce((sum: number, a: any) => sum + (a.price ?? 0), 0)
const basePrice = config.pricePerPerson
  ? (item as any).price * data.partySize
  : (item as any).price ?? 0
const total = basePrice + addonTotal
```

Pass `total` and `selectedAddons` into `Booking.create()`.

- [ ] **Step 4: Verify TypeScript compiles**

- [ ] **Step 5: Commit**
```bash
git commit -m "feat(backend): booking model + assignedResourceId + selectedAddons + addon total"
```

---

## Task 9: Dash — ItemDialog Bookable Form (4-Section Accordion)

> **Standalone context:** `infiora-dash-main/infiora-dash-main/`. The catalog item create/edit dialog is at `src/views/orders/components/ItemDialog.tsx`. Currently it only has basic info fields (name, category, description, price, badge, image, available toggle). The CatalogItem schema already has a `type` field (`'instant' | 'bookable'`) and a `bookingConfig` sub-document. This task adds a **type toggle** at the top and, when Bookable is selected, shows a **4-section accordion** for the booking config.

**Files:**
- Modify: `src/views/orders/components/ItemDialog.tsx`

### Form structure

**Type toggle** (always visible, near the top):
```tsx
<ToggleButtonGroup
  value={form.type}
  exclusive
  onChange={(_, v) => v && setValue('type', v)}
>
  <ToggleButton value='instant'>⚡ Instant Order</ToggleButton>
  <ToggleButton value='bookable'>📅 Bookable Service</ToggleButton>
</ToggleButtonGroup>
```

When `type === 'bookable'`, render 4 MUI `Accordion` sections below the existing basic fields:

---

**Section A — Service Identity**

Fields:
- `bookingConfig.bookableCategory` — MUI Select:
  - Transfer / Transport
  - Tour / Activity
  - Service (Spa, Massage…)
  - Equipment Rental
  - Other
- Short description textarea already exists as main `description` field — no duplicate needed.

---

**Section B — Capacity & Booking Model** *(most important section)*

Fields:
- `bookingConfig.bookingModel` — Radio group:
  - `exclusive` — "Per Unit (Exclusive)" — guest books the whole resource (car, room, guide)
  - `shared` — "Per Seat (Shared)" — guest books one seat in a group
- `bookingConfig.totalInventory` — NumberInput — label: "Number of units available"
  - Helper: "How many of this resource do you have? (e.g. 3 cars)"
- `bookingConfig.capacityPerUnit` — NumberInput — label: "Max persons per unit"
  - Helper for exclusive: "Max passengers per car / guests per room"
  - Helper for shared: "Total seats per group"
- Min / Max persons — `bookingConfig.minPersons` and `bookingConfig.capacityPerUnit` (max = same field, just capped)
- Show computed capacity summary: `"Up to {totalInventory × capacityPerUnit} total guests per slot"`

---

**Section C — Schedule & Duration**

Fields:
- `bookingConfig.duration` — NumberInput — label: "Duration (minutes)"
- `bookingConfig.bufferMinutes` — NumberInput — label: "Prep/gap time between bookings (minutes)"
  - Helper: "Buffer for driver to return or room to be cleaned"
- `bookingConfig.startInterval` — Select:
  - Every 15 min | Every 30 min | Every 1 hour | Every 2 hours
  - Helper: "Slots start at clean intervals (e.g. 10:00, 10:30, 11:00)"
- `bookingConfig.advanceMinHours` — NumberInput — label: "Min hours in advance"
- `bookingConfig.advanceMaxDays` — NumberInput — label: "Max days in advance"
- **Availability pattern** — Switch: "Simple (same every day)" / "Advanced (per day)"
  - **Simple** (`bookingConfig.simpleAvailability.enabled = true`):
    - Two time pickers: `from` and `to` (e.g. 08:00 – 22:00)
  - **Advanced** (`bookingConfig.simpleAvailability.enabled = false`):
    - "Configure weekly schedule" button → inline grid:
      - 7 rows (Mon–Sun), each row: checkbox (day active) + from/to time inputs + "Add another window" link
      - Saves to `bookingConfig.weeklySchedule`

---

**Section D — Pricing & Policies**

Fields:
- `bookingConfig.pricePerPerson` — Switch: "Price is per person" (default off = per booking)
  - Show hint: off = "€{price} for the entire booking"; on = "€{price} × number of guests"
- `bookingConfig.cancellationPolicy` — Select:
  - Free until 24h before
  - Free until 48h before
  - Non-refundable
  - Custom (shows `cancellationPolicyHours` number input)
- `bookingConfig.confirmationType` — Radio:
  - Instant — "Automatically confirmed"
  - On Request — "Hotel must approve each booking" (staff gets notification, booking stays pending)
- **Add-ons manager** — label: "Upsell options (optional)"
  - List of existing addons: name, price, remove button
  - "Add option" button → inline row: name input, price input, add button
  - Each addon stored in `bookingConfig.addons[]`

---

- [ ] **Step 1: Add type toggle to form state and UI**

Add `type: 'instant' | 'bookable'` to the form's default values and react-hook-form schema. Render the toggle group near the top of the dialog (after category, before price or description — your call based on current layout).

- [ ] **Step 2: Add 4 Accordion sections** (only visible when `type === 'bookable'`)

Each section: `<Accordion defaultExpanded={false}>` with a clear title and the fields listed above. Use existing `InputField`, `Controller`, MUI `Switch`, `Select`, `RadioGroup` — follow the patterns already in `ItemDialog.tsx`.

- [ ] **Step 3: Include `bookingConfig` in form submit payload**

In the submit handler, when `type === 'bookable'`, merge `bookingConfig` into the body sent to `POST/PATCH /api/v1/catalog/:id`. Ensure `bookingConfig.weeklySchedule` is only sent when advanced mode is active; otherwise send `simpleAvailability`.

- [ ] **Step 4: Verify in browser** — open the menu tab in /orders, create a new item, toggle to Bookable, confirm all 4 sections render and save correctly.

- [ ] **Step 5: Commit**
```bash
git commit -m "feat(dash): ItemDialog bookable type toggle + 4-section booking config form"
```

---

## Task 10: Dash — Resource Management Tab in /bookings

> **Standalone context:** `infiora-dash-main/infiora-dash-main/`. The `/bookings` page is at `src/views/bookings/pages/BookingsPage.tsx`. It currently has Calendar and List view modes. This task adds a third mode/tab: **Resources** — a management UI where staff can see all named resources (vehicles, spa rooms, equipment), add new ones, edit name/identifier, and soft-delete them.
>
> Backend endpoints from Task 6: `GET/POST /api/v1/hotels/:hotelId/bookings/resources` and `PATCH/DELETE .../resources/:resourceId`.

**Files:**
- Create: `src/views/bookings/components/ResourcesTab.tsx`
- Modify: `src/views/bookings/pages/BookingsPage.tsx`

- [ ] **Step 1: Create `ResourcesTab.tsx`**

```typescript
// src/views/bookings/components/ResourcesTab.tsx
'use client'
// Props: { hotelId: string }
// State: resources[], addForm { name, type, identifier, capacity }, editId
// On mount: GET /api/v1/hotels/:hotelId/bookings/resources?includeInactive=true
//
// Layout:
// - "Add Resource" button → opens inline form or dialog
//   Fields: name (required), type (select: room/equipment/staff_member/vehicle), identifier (optional), capacity (number)
//   Submit: POST .../resources
// - Resource list grouped by type (use MUI List + ListSubheader)
//   Each row: name, identifier (chip if set), capacity badge, Edit icon, Delete icon
//   Inactive resources: shown dimmed with "Inactive" chip, toggle to restore
// - Edit: PATCH .../resources/:resourceId
// - Delete: PATCH .../resources/:resourceId { isActive: false } (soft delete, confirmed via dialog)
```

- [ ] **Step 2: Add Resources tab to `BookingsPage.tsx`**

The page currently has view mode buttons (Calendar / List). Add a third: "Resources". When selected, render `<ResourcesTab hotelId={hotelId} />` instead of calendar/list content.

- [ ] **Step 3: Verify in browser** — navigate to /bookings, click Resources, add a test resource, confirm it appears in the list.

- [ ] **Step 4: Commit**
```bash
git commit -m "feat(dash): resource management tab in /bookings"
```

---

## Task 11: Dash — Resource Calendar View in /bookings

> **Standalone context:** `infiora-dash-main/infiora-dash-main/`. This adds a visual timeline to the Calendar view in `/bookings` that shows resource-level availability. Each row represents a named `ServiceResource`; columns are time slots for the selected day. Staff can see at a glance which car/room/guide is busy when, and manually assign a resource when confirming a booking.

**Files:**
- Create: `src/views/bookings/components/ResourceCalendar.tsx`
- Modify: `src/views/bookings/pages/BookingsPage.tsx`

- [ ] **Step 1: Create `ResourceCalendar.tsx`**

```typescript
// src/views/bookings/components/ResourceCalendar.tsx
'use client'
// Props: { hotelId: string; selectedDate: Date }
//
// Data fetching:
//   resources: GET .../bookings/resources
//   slots: GET .../bookings/timeslots?from=<date>&to=<date+1d>
//   bookings: GET .../bookings?date=<YYYY-MM-DD>
//
// Layout: CSS Grid or MUI Table
//   Columns = unique start times across all slots (e.g. 08:00, 08:30, 09:00...)
//   Rows = resources
//   Each cell:
//     - grey = slot doesn't exist for this resource's item
//     - green = slot exists + available (bookedPersons < maxPersons, not blocked)
//     - amber = slot partially filled (shared only)
//     - red/striped = slot blocked or blackout
//     - blue = slot has booking — shows guestRoomNumber + item name
//       clicking a blue cell: opens popover with booking details + "Assign this resource" button
//         → PATCH .../bookings/:bookingId { assignedResourceId: resource._id }
//
// For exclusive model: slot is either free or taken (1 booking = 1 unit used)
// For shared model: cell shows "X/Y seats" indicator
```

- [ ] **Step 2: Integrate into BookingsPage Calendar view**

Add a "Resource view" toggle (switch or button) within the Calendar view. When enabled, swap the existing slot grid for `<ResourceCalendar>`.

- [ ] **Step 3: Verify in browser** — create test resources and bookings, confirm the timeline renders with correct colours and the assign action works.

- [ ] **Step 4: Commit**
```bash
git commit -m "feat(dash): resource calendar timeline in /bookings"
```

---

## Task 12: Dash — Blackout Dates UI in /bookings

> **Standalone context:** `infiora-dash-main/infiora-dash-main/`. Staff need a way to mark specific dates as unavailable from the `/bookings` calendar. Backend from Task 7: `GET/POST/DELETE /api/v1/hotels/:hotelId/bookings/blackout`.

**Files:**
- Create: `src/views/bookings/components/BlackoutDatesPanel.tsx`
- Modify: `src/views/bookings/pages/BookingsPage.tsx`

- [ ] **Step 1: Create `BlackoutDatesPanel.tsx`**

```typescript
// src/views/bookings/components/BlackoutDatesPanel.tsx
'use client'
// Props: { hotelId: string; selectedDate: Date; items: CatalogItem[] }
//
// Fetch: GET .../blackout?from=<month start>
// Display: compact list of current blackout dates for the hotel (date, reason, item or "All services", delete button)
//
// "Block a date" form:
//   - Date picker (defaults to selectedDate)
//   - Applies to: "All bookable services" (itemId=null) or select specific item
//   - Reason: text input (optional)
//   - Submit: POST .../blackout
//
// Delete: DELETE .../blackout/:blackoutId
// On change: refetch + trigger parent to re-render calendar
```

- [ ] **Step 2: Add "Blackout Dates" panel to BookingsPage**

Render `<BlackoutDatesPanel>` as a collapsible side panel or modal, accessible via a "Manage Blackout Dates" button in the BookingsPage toolbar.

- [ ] **Step 3: Visual indicator in existing calendar**

In the existing date-column headers of the slot grid, mark blackout days:
```tsx
{isBlackout(date) && (
  <Chip label='Blocked' size='small' color='error' sx={{ ml: 1, height: 16 }} />
)}
```

Check against the fetched blackout set on each render.

- [ ] **Step 4: Verify in browser** — block a date, confirm calendar shows it, confirm booking attempt for that date returns 400.

- [ ] **Step 5: Commit**
```bash
git commit -m "feat(dash): blackout dates UI + visual indicator in /bookings calendar"
```

---

## Task 13: App — Add-ons Picker in BookingConfirmScreen

> **Standalone context:** `infiora-app-main/infiora-app-main/`. The booking confirm screen is at `src/screens/bookings/BookingConfirmScreen.tsx`. The `item` prop now includes `bookingConfig.addons[]`. This task shows a checklist of optional add-ons before the guest submits the booking, updates the running total, and includes `selectedAddons` in the POST body.

**Files:**
- Modify: `src/screens/bookings/BookingConfirmScreen.tsx`

- [ ] **Step 1: Add add-ons state**

```typescript
const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set())
const addons = item.bookingConfig?.addons ?? []

const toggleAddon = (addonId: string) => {
  setSelectedAddonIds(prev => {
    const next = new Set(prev)
    next.has(addonId) ? next.delete(addonId) : next.add(addonId)
    return next
  })
}
```

- [ ] **Step 2: Render add-ons checklist** (only if `addons.length > 0`)

```tsx
{addons.length > 0 && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Add-ons</Text>
    {addons.map((addon: any) => (
      <TouchableOpacity key={addon._id} onPress={() => toggleAddon(addon._id)} style={styles.addonRow}>
        <View style={[styles.checkbox, selectedAddonIds.has(addon._id) && styles.checked]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.addonName}>{addon.name}</Text>
          {addon.description ? <Text style={styles.addonDesc}>{addon.description}</Text> : null}
        </View>
        <Text style={styles.addonPrice}>
          {addon.price === 0 ? 'Free' : `+€${addon.price.toFixed(2)}`}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
)}
```

- [ ] **Step 3: Update running total**

```typescript
const addonTotal = addons
  .filter((a: any) => selectedAddonIds.has(a._id))
  .reduce((sum: number, a: any) => sum + a.price, 0)

const basePrice = item.bookingConfig?.pricePerPerson
  ? item.price * partySize
  : item.price

const displayTotal = basePrice + addonTotal
```

Show `displayTotal` in the order summary.

- [ ] **Step 4: Include in submit payload**

```typescript
const selectedAddonsPayload = addons
  .filter((a: any) => selectedAddonIds.has(a._id))
  .map((a: any) => ({ addonId: a._id, name: a.name, price: a.price }))

const payload = {
  ...existingPayload,
  selectedAddons: selectedAddonsPayload,
}
```

- [ ] **Step 5: Verify on device** — create a bookable item with add-ons, open app, go through booking flow, confirm add-ons appear and total updates.

- [ ] **Step 6: Commit**
```bash
git commit -m "feat(app): add-ons picker in BookingConfirmScreen with running total"
```

---

## Design Invariants Checklist

Verify before closing each relevant task:

- [ ] **Task 5:** `startInterval` step is `max(startInterval, duration + bufferMinutes)` — slots never overlap
- [ ] **Task 5:** Exclusive model: `maxPersons on TimeSlot = totalInventory` (not capacityPerUnit) — each booking takes 1 unit
- [ ] **Task 7:** Blackout date check in `createBooking` runs before the atomic slot lock — no wasted lock on blackout dates
- [ ] **Task 7:** Slot generation blackout check uses a Set loaded once per item — not a DB call per day
- [ ] **Task 8:** `selectedAddons` are snapshotted at booking time (name + price copied) — changing item addons later doesn't affect existing bookings
- [ ] **Task 9:** Weekly schedule grid is only sent when `simpleAvailability.enabled = false` — never send both
- [ ] **Task 11:** Resource calendar "assign resource" action uses `PATCH .../bookings/:id { assignedResourceId }` — does not change booking status
- [ ] **Task 13:** Add-on prices are sent in the POST payload and not re-fetched from item at backend — backend snapshots them into `selectedAddons[]`
