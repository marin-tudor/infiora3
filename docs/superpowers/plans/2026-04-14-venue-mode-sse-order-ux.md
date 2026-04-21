# Venue Mode + SSE + Order UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace polling with SSE in the admin dashboard, remove the code-gate on the guest order page, add GDPR notice, and introduce a venue mode (Hotel/Restaurant) with configurable auth and location fields.

**Architecture:** Three projects touched in dependency order — backend first (model + service), then dash (SSE hook + settings UI), then guest app (dynamic checkout). The backend hotel model stores all new venue settings inside the existing `orders` subdocument. SSE is already implemented on the backend; the frontend just needs to connect via `EventSource`.

**Tech Stack:** Node/Express/Mongoose/TypeScript (backend), Next.js 14/RTK Query/MUI (dash), Next.js 14/plain fetch (guest app)

---

## File Map

### Backend (`infiora-backend-main/infiora-backend-main/`)
| Action | File | Change |
|--------|------|--------|
| Modify | `src/modules/group/group.validation.ts` | Add `survey: Joi.any()` to fix TS error |
| Modify | `src/modules/orders/orders.interfaces.ts` | Extend `IHotelOrdersSettings` + `IPlaceOrderBody` |
| Modify | `src/modules/hotel/hotel.model.ts` | Add 5 new fields to `orders` subdocument |
| Modify | `src/modules/orders/orders.service.ts` | PIN rate limiter + venue-aware placeOrder + catalog exposes venue fields |
| Modify | `src/modules/orders/orders.validation.ts` | Make `code` optional, add `tablePin`, add venue fields to updateSettings |

### Dash (`infiora-dash-main/infiora-dash-main/`)
| Action | File | Change |
|--------|------|--------|
| Modify | `src/types/index.ts` | Extend `IOrderSettings` |
| Create | `src/utils/soundUtils.ts` | Extract `playNotificationSound` |
| Modify | `src/components/layout/shared/OrderNotificationBell.tsx` | Use soundUtils, add SSE, remove polling + prevIds logic |
| Modify | `src/views/orders/components/ActiveOrders.tsx` | Use soundUtils, remove `pollingInterval` |
| Create | `src/hooks/useOrdersSSE.ts` | SSE hook that invalidates RTK Query cache |
| Modify | `src/views/orders/pages/OrdersPage.tsx` | Remove `pollingInterval`, use `limit: 50` |
| Modify | `src/views/orders/components/OrderSettings.tsx` | Venue mode UI |

### Guest App (`infiora-app-main/infiora-app-main/`)
| Action | File | Change |
|--------|------|--------|
| Modify | `src/views/orders/GuestOrderPage.tsx` | Skip code screen, dynamic checkout fields, GDPR notice |

---

## Task 1: Fix TypeScript compilation error in group validation

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/group/group.validation.ts`

- [ ] **Step 1: Add the missing `survey` field**

In `group.validation.ts`, the `createGroupBody` object is typed as `Record<keyof NewCreatedGroup, any>`. `NewCreatedGroup` includes `survey` but the object is missing it. Add the field after `feedback`:

```typescript
// Before:
  feedback: Joi.any(),
};

// After:
  feedback: Joi.any(),
  survey: Joi.any(),
};
```

- [ ] **Step 2: Verify compilation clears**

```bash
cd infiora-backend-main/infiora-backend-main
npx tsc --noEmit 2>&1 | grep "group.validation"
```
Expected: no output (error gone).

- [ ] **Step 3: Commit**

```bash
git add src/modules/group/group.validation.ts
git commit -m "fix: add missing survey field to group validation schema"
```

---

## Task 2: Extend backend interfaces and model for venue mode

**Files:**
- Modify: `src/modules/orders/orders.interfaces.ts`
- Modify: `src/modules/hotel/hotel.model.ts`

- [ ] **Step 1: Extend `IHotelOrdersSettings`**

In `orders.interfaces.ts`, replace the existing `IHotelOrdersSettings` block:

```typescript
export interface IHotelOrdersSettings {
  enabled: boolean;
  availableFrom: string; // 'HH:MM' — '00:00' = 24h
  availableTo: string;
  currencySymbol: string;
  processingLabel: string;
  onTheWayLabel: string;
  completedLabel: string;
  // Venue mode
  venueType: 'hotel' | 'restaurant';
  requireCode: boolean;       // hotel: reservation code; restaurant: table PIN
  requireLocation: boolean;   // hotel: room number; restaurant: table number
  locationLabel: string;      // e.g. 'Room number' or 'Table number'
  tablePin: string;           // restaurant mode PIN (never sent to guest app)
}
```

- [ ] **Step 2: Make `code` optional in `IPlaceOrderBody` and add `tablePin`**

In `orders.interfaces.ts`, replace the existing `IPlaceOrderBody` block:

```typescript
export interface IPlaceOrderBody {
  code?: string;          // hotel mode: reservation code (when requireCode=true)
  tablePin?: string;      // restaurant mode: table PIN (when requireCode=true)
  guestEmail?: string;
  guestRoomNumber?: string;
  language?: string;
  items: { itemId: string; qty: number; selectedModifiers?: ISelectedModifier[] }[];
  payment: PaymentMethod;
  note?: string;
  scheduledFor?: string;
}
```

- [ ] **Step 3: Add new fields to hotel model**

In `src/modules/hotel/hotel.model.ts`, add 5 fields inside the `orders` subdocument (after `paymentMethods`):

```typescript
      // Venue mode
      venueType: { type: String, enum: ['hotel', 'restaurant'], default: 'hotel' },
      requireCode: { type: Boolean, default: true },
      requireLocation: { type: Boolean, default: true },
      locationLabel: { type: String, default: 'Room number' },
      tablePin: { type: String, default: '' },
```

- [ ] **Step 4: Verify compilation**

```bash
cd infiora-backend-main/infiora-backend-main
npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors related to these files.

- [ ] **Step 5: Commit**

```bash
git add src/modules/orders/orders.interfaces.ts src/modules/hotel/hotel.model.ts
git commit -m "feat: extend IHotelOrdersSettings and hotel model with venue mode fields"
```

---

## Task 3: Update placeOrder validation schema

**Files:**
- Modify: `src/modules/orders/orders.validation.ts`

- [ ] **Step 1: Make `code` optional, add `tablePin` to placeOrder body**

Replace the `placeOrder` export (lines 24–47):

```typescript
export const placeOrder = {
  params: Joi.object().keys({
    roomId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    code: Joi.string().allow('', null),
    tablePin: Joi.string().allow('', null).max(10),
    guestEmail: Joi.string().email().allow('', null),
    guestRoomNumber: Joi.string().allow('', null).max(20),
    language: Joi.string().allow('', null),
    items: Joi.array()
      .items(
        Joi.object({
          itemId: Joi.string().required().custom(objectId),
          qty: Joi.number().integer().min(1).required(),
          selectedModifiers: Joi.array().items(selectedModifier).default([]),
        })
      )
      .min(1)
      .required(),
    payment: Joi.string().valid('cash', 'card', 'room', 'online').required(),
    note: Joi.string().allow('', null).max(500),
    scheduledFor: Joi.string().isoDate().allow(null),
  }),
};
```

- [ ] **Step 2: Add venue mode fields to `updateSettings` body**

In the `updateSettings` export body (after the `paymentMethods` block), add:

```typescript
    venueType: Joi.string().valid('hotel', 'restaurant'),
    requireCode: Joi.boolean(),
    requireLocation: Joi.boolean(),
    locationLabel: Joi.string().max(40).allow('', null),
    tablePin: Joi.string().max(10).allow('', null),
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/orders/orders.validation.ts
git commit -m "feat: add venue mode fields to orders validation schemas"
```

---

## Task 4: Add PIN rate limiter and update `placeOrder` service

**Files:**
- Modify: `src/modules/orders/orders.service.ts`

- [ ] **Step 1: Add in-memory PIN rate limiter after imports**

After the import block at the top of `orders.service.ts`, add:

```typescript
// ─── PIN Rate Limiter ─────────────────────────────────────────────────────────
// In-memory per-hotel limiter. Resets on server restart (acceptable for restaurant use case).
const pinAttempts = new Map<string, { count: number; resetAt: number }>();

const checkPinRateLimit = (hotelId: string): void => {
  const entry = pinAttempts.get(hotelId);
  if (entry && Date.now() < entry.resetAt && entry.count >= 5) {
    throw new ApiError(httpStatus.TOO_MANY_REQUESTS, 'Too many PIN attempts. Try again in 15 minutes.');
  }
};

const recordPinFailure = (hotelId: string): void => {
  const entry = pinAttempts.get(hotelId);
  if (!entry || Date.now() >= entry.resetAt) {
    pinAttempts.set(hotelId, { count: 1, resetAt: Date.now() + 15 * 60 * 1000 });
  } else {
    entry.count += 1;
  }
};

const resetPinAttempts = (hotelId: string): void => {
  pinAttempts.delete(hotelId);
};
```

- [ ] **Step 2: Update `getOrdersSettings` defaults**

In `getOrdersSettings`, update the fallback object to include new fields:

```typescript
  return (
    settings ?? {
      enabled: false,
      availableFrom: '00:00',
      availableTo: '00:00',
      currencySymbol: '€',
      processingLabel: 'Processing',
      onTheWayLabel: 'On the way',
      completedLabel: 'Completed',
      venueType: 'hotel' as const,
      requireCode: true,
      requireLocation: true,
      locationLabel: 'Room number',
      tablePin: '',
    }
  );
```

- [ ] **Step 3: Replace the auth block in `placeOrder`**

In `placeOrder`, replace the single line:
```typescript
  const reservationCode = await validateReservationCode(roomId, hotelId, body.code);
```

With venue-aware validation:

```typescript
  const settings = await getOrdersSettings(hotelId);
  const hotelIdStr = String(hotelId);
  let reservationCodeId: mongoose.Types.ObjectId | null = null;

  if (settings.requireCode) {
    if (settings.venueType === 'restaurant') {
      // Table PIN validation with rate limiting
      checkPinRateLimit(hotelIdStr);
      if (!body.tablePin || body.tablePin.trim() !== settings.tablePin.trim()) {
        recordPinFailure(hotelIdStr);
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid PIN');
      }
      resetPinAttempts(hotelIdStr);
    } else {
      // Hotel: reservation code validation (existing logic)
      if (!body.code) throw new ApiError(httpStatus.UNAUTHORIZED, 'Reservation code is required');
      const reservationCode = await validateReservationCode(roomId, hotelId, body.code);
      reservationCodeId = reservationCode._id as mongoose.Types.ObjectId;
    }
  }

  if (settings.requireLocation && !body.guestRoomNumber?.trim()) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${settings.locationLabel || 'Location'} is required`);
  }
```

- [ ] **Step 4: Update `GuestOrder.create` call to use `reservationCodeId`**

The `reservationCodeId` field in the create call should become optional. Replace:
```typescript
    reservationCodeId: reservationCode._id as mongoose.Types.ObjectId,
```
With:
```typescript
    reservationCodeId: reservationCodeId ?? undefined,
```

- [ ] **Step 5: Add time-window enforcement to `placeOrder`**

Add after the rate limiter block, before the items validation:

```typescript
  // Enforce time window at order placement (catalog already checks, but enforce here too)
  if (settings.availableFrom !== '00:00' && !isWithinTimeWindow(settings.availableFrom, settings.availableTo)) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      `Orders available from ${settings.availableFrom} to ${settings.availableTo}`
    );
  }
```

- [ ] **Step 6: Verify compilation**

```bash
cd infiora-backend-main/infiora-backend-main
npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/modules/orders/orders.service.ts
git commit -m "feat: venue-aware placeOrder with PIN rate limiting and time-window enforcement"
```

---

## Task 5: Expose venue settings to guest app via catalog endpoint

**Files:**
- Modify: `src/modules/orders/orders.service.ts`

The `getCatalogForRoom` function returns `settings` which already comes from `getOrdersSettings`. The guest app just needs to receive it — but we must **not** send `tablePin` to the guest.

- [ ] **Step 1: Strip `tablePin` from catalog response**

In `getCatalogForRoom`, update the return statement at the bottom of the function:

```typescript
  // Never expose tablePin to guest — strip it before returning
  const { tablePin: _pin, ...guestSettings } = settings as any;

  return { settings: guestSettings, categories, items, promotions, hotelName: hotel.name || '', hotelImage: hotel.image || null };
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/orders/orders.service.ts
git commit -m "feat: expose venue settings in catalog, strip tablePin from guest response"
```

---

## Task 6: Update dash `IOrderSettings` type

**Files:**
- Modify: `infiora-dash-main/infiora-dash-main/src/types/index.ts`

- [ ] **Step 1: Extend the interface**

Find `IOrderSettings` (line 435) and replace the block:

```typescript
export interface IOrderSettings {
  enabled: boolean
  availableFrom: string
  availableTo: string
  currencySymbol: string
  processingLabel: string
  onTheWayLabel: string
  completedLabel: string
  emails?: string[]
  paymentMethods?: {
    cash: boolean
    card: boolean
    online: boolean
  }
  // Venue mode
  venueType?: 'hotel' | 'restaurant'
  requireCode?: boolean
  requireLocation?: boolean
  locationLabel?: string
  tablePin?: string
}
```

- [ ] **Step 2: Commit**

```bash
cd infiora-dash-main/infiora-dash-main
git add src/types/index.ts
git commit -m "feat: extend IOrderSettings with venue mode fields"
```

---

## Task 7: Extract `playNotificationSound` to shared util

**Files:**
- Create: `infiora-dash-main/infiora-dash-main/src/utils/soundUtils.ts`
- Modify: `infiora-dash-main/infiora-dash-main/src/components/layout/shared/OrderNotificationBell.tsx`
- Modify: `infiora-dash-main/infiora-dash-main/src/views/orders/components/ActiveOrders.tsx`

- [ ] **Step 1: Create `soundUtils.ts`**

```typescript
export const playNotificationSound = (): void => {
  try {
    const ctx = new AudioContext()

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.35, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration)
    }

    playTone(880, 0, 0.18)
    playTone(1100, 0.2, 0.18)
    playTone(1320, 0.4, 0.28)
  } catch {}
}
```

- [ ] **Step 2: Update `OrderNotificationBell.tsx`**

Remove the `playNotificationSound` function definition (lines 13–35) and add the import:

```typescript
import { playNotificationSound } from '@/utils/soundUtils'
```

- [ ] **Step 3: Update `ActiveOrders.tsx`**

Remove the `playNotificationSound` function definition (lines 24–46) and add the import:

```typescript
import { playNotificationSound } from '@/utils/soundUtils'
```

- [ ] **Step 4: Commit**

```bash
git add src/utils/soundUtils.ts \
        src/components/layout/shared/OrderNotificationBell.tsx \
        src/views/orders/components/ActiveOrders.tsx
git commit -m "refactor: extract playNotificationSound to soundUtils"
```

---

## Task 8: Create `useOrdersSSE` hook

**Files:**
- Create: `infiora-dash-main/infiora-dash-main/src/hooks/useOrdersSSE.ts`

- [ ] **Step 1: Create the hook**

```typescript
'use client'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { toast } from 'react-toastify'

import { ordersApi } from '@/redux/api/ordersApi'
import { playNotificationSound } from '@/utils/soundUtils'
import type { AppDispatch } from '@/redux'

const API = process.env.NEXT_PUBLIC_API_URL

export function useOrdersSSE(hotelId: string | undefined): void {
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    if (!hotelId) return

    const es = new EventSource(
      `${API}/v1/orders/hotels/${hotelId}/events`,
      { withCredentials: true }
    )

    const invalidateOrders = () => {
      dispatch(ordersApi.util.invalidateTags([{ type: 'Orders', id: 'LIST' }]) as any)
    }

    es.addEventListener('rs:new-order', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      invalidateOrders()
      playNotificationSound()
      toast.warning(
        `🔔 New order! Room ${data.roomNumber || 'N/A'} · ${data.itemCount} item${data.itemCount !== 1 ? 's' : ''} · ${Number(data.total).toFixed(2)} €`,
        { autoClose: 8000 }
      )
    })

    es.addEventListener('rs:order-updated', () => {
      invalidateOrders()
    })

    // EventSource auto-reconnects on error — no manual retry needed
    es.onerror = () => {}

    return () => es.close()
  }, [hotelId, dispatch])
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useOrdersSSE.ts
git commit -m "feat: add useOrdersSSE hook for real-time order events"
```

---

## Task 9: Remove polling from dash — wire up SSE

**Files:**
- Modify: `src/components/layout/shared/OrderNotificationBell.tsx`
- Modify: `src/views/orders/pages/OrdersPage.tsx`
- Modify: `src/views/orders/components/ActiveOrders.tsx`

- [ ] **Step 1: Rewrite `OrderNotificationBell.tsx`**

The Bell previously polled and tracked new orders via `prevIds`. Now SSE handles detection/sound/toast. The Bell only needs to show the live count. Replace the entire file:

```typescript
'use client'
import { useRouter } from 'next/navigation'
import { Badge, IconButton, Tooltip } from '@mui/material'

import { useGetOrdersQuery } from '@/redux/api/ordersApi'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useOrdersSSE } from '@/hooks/useOrdersSSE'

export default function OrderNotificationBell() {
  const router = useRouter()
  const authUser = useAuthUser()
  const hotelId = (authUser as any)?.hotel?.id

  // SSE: real-time invalidation + sound + toast (replaces polling)
  useOrdersSSE(hotelId)

  const { data } = useGetOrdersQuery(
    { hotelId: hotelId!, status: 'Awaiting confirmation', limit: 50 },
    { skip: !hotelId }
  )

  const pendingCount = (data?.results?.length) || 0

  if (!hotelId) return null

  return (
    <Tooltip title={pendingCount > 0 ? `${pendingCount} order${pendingCount > 1 ? 's' : ''} waiting` : 'No pending orders'}>
      <IconButton onClick={() => router.push('/en/orders')} color={pendingCount > 0 ? 'warning' : 'default'}>
        <Badge badgeContent={pendingCount || undefined} color='warning'>
          <i className={pendingCount > 0 ? 'ri-notification-3-fill' : 'ri-notification-3-line'} style={{ fontSize: 22 }} />
        </Badge>
      </IconButton>
    </Tooltip>
  )
}
```

- [ ] **Step 2: Update `OrdersPage.tsx` — remove `pollingInterval`, use `limit: 50`**

Find the `useGetOrdersQuery` call and update it:

```typescript
  const { data: pendingData } = useGetOrdersQuery(
    { hotelId: hotelId!, status: 'Awaiting confirmation', limit: 50 },
    { skip: !hotelId }
  )
```

(Removed `pollingInterval: 15000`. Changed `limit: 100` → `50` so it shares the cache with Bell.)

- [ ] **Step 3: Remove `pollingInterval` from both queries in `ActiveOrders.tsx`**

Find the two `useGetOrdersQuery` calls and remove `pollingInterval: 15000` from their options:

```typescript
  const { data, isLoading } = useGetOrdersQuery(
    { hotelId, status: statusFilter || undefined, limit: 100, startDate, endDate },
    {}  // no pollingInterval
  )

  const { data: carryData } = useGetOrdersQuery(
    { hotelId, limit: 50 },
    { skip: !isToday || !!statusFilter }  // no pollingInterval
  )
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/shared/OrderNotificationBell.tsx \
        src/views/orders/pages/OrdersPage.tsx \
        src/views/orders/components/ActiveOrders.tsx
git commit -m "feat: replace polling with SSE in order components"
```

---

## Task 10: Add venue mode UI to `OrderSettings`

**Files:**
- Modify: `src/views/orders/components/OrderSettings.tsx`

- [ ] **Step 1: Add state variables for venue mode**

After the existing `paymentOnline` state, add:

```typescript
  const [venueType, setVenueType] = useState<'hotel' | 'restaurant'>('hotel')
  const [requireCode, setRequireCode] = useState(true)
  const [requireLocation, setRequireLocation] = useState(true)
  const [locationLabel, setLocationLabel] = useState('Room number')
  const [tablePin, setTablePin] = useState('')
```

- [ ] **Step 2: Populate state from settings in `useEffect`**

Inside the `if (settings)` block, after the payment methods block, add:

```typescript
      setVenueType((settings as any).venueType || 'hotel')
      setRequireCode((settings as any).requireCode ?? true)
      setRequireLocation((settings as any).requireLocation ?? true)
      setLocationLabel((settings as any).locationLabel || 'Room number')
      setTablePin((settings as any).tablePin || '')
```

- [ ] **Step 3: Add venue fields to `handleSave`**

In the `handleSave` function, find where the body object is constructed and add:

```typescript
      venueType,
      requireCode,
      requireLocation,
      locationLabel,
      tablePin,
```

- [ ] **Step 4: Add the "Venue" section to the UI**

After the payment methods `Card` section and before the save button, add a new `Card`:

```typescript
      <Card>
        <CardContent>
          <Typography variant='h6' gutterBottom>Venue</Typography>

          <Stack gap={2}>
            <Box>
              <Typography variant='body2' color='text.secondary' gutterBottom>Venue type</Typography>
              <Stack direction='row' gap={1}>
                {(['hotel', 'restaurant'] as const).map(type => (
                  <Button
                    key={type}
                    variant={venueType === type ? 'contained' : 'outlined'}
                    size='small'
                    onClick={() => {
                      setVenueType(type)
                      if (type === 'hotel') {
                        setRequireCode(true)
                        setRequireLocation(true)
                        setLocationLabel('Room number')
                      } else {
                        setRequireCode(true)
                        setRequireLocation(false)
                        setLocationLabel('Table number')
                      }
                    }}
                    sx={{ textTransform: 'capitalize' }}
                  >
                    {type === 'hotel' ? '🏨 Hotel' : '🍽 Restaurant'}
                  </Button>
                ))}
              </Stack>
            </Box>

            <Divider />

            <FormControlLabel
              control={<Switch checked={requireCode} onChange={e => setRequireCode(e.target.checked)} />}
              label={venueType === 'hotel' ? 'Require reservation code' : 'Require table PIN'}
            />

            <FormControlLabel
              control={<Switch checked={requireLocation} onChange={e => setRequireLocation(e.target.checked)} />}
              label='Require location number'
            />

            <TextField
              label='Location field label'
              value={locationLabel}
              onChange={e => setLocationLabel(e.target.value)}
              size='small'
              helperText='Shown to guest at checkout (e.g. "Room number", "Table number")'
            />

            {venueType === 'restaurant' && requireCode && (
              <Box>
                <Typography variant='body2' color='text.secondary' gutterBottom>Table PIN</Typography>
                <Stack direction='row' gap={1} alignItems='center'>
                  <TextField
                    value={tablePin}
                    onChange={e => setTablePin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    size='small'
                    inputProps={{ inputMode: 'numeric', style: { letterSpacing: 6, fontWeight: 700, fontSize: 18 } }}
                    placeholder='0000'
                    sx={{ width: 120 }}
                  />
                  <Button
                    size='small'
                    variant='outlined'
                    onClick={() => setTablePin(String(Math.floor(1000 + Math.random() * 9000)))}
                  >
                    Generate
                  </Button>
                  <Button
                    size='small'
                    variant='outlined'
                    onClick={() => { navigator.clipboard.writeText(tablePin); }}
                    disabled={!tablePin}
                  >
                    Copy
                  </Button>
                </Stack>
                <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5, display: 'block' }}>
                  Print this PIN and place it visibly on each table
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
```

- [ ] **Step 5: Commit**

```bash
git add src/views/orders/components/OrderSettings.tsx
git commit -m "feat: add venue mode UI to order settings (hotel/restaurant, toggles, table PIN)"
```

---

## Task 11: Update guest order page — skip code screen, dynamic checkout, GDPR

**Files:**
- Modify: `infiora-app-main/infiora-app-main/src/views/orders/GuestOrderPage.tsx`

The guest app gets venue settings from the catalog API (`settings.requireCode`, `settings.requireLocation`, `settings.locationLabel`, `settings.venueType`). The page currently starts at `step === 'code'`. We remove that screen and show fields at checkout instead.

- [ ] **Step 1: Update the `Settings` interface at the top of the file**

Replace:
```typescript
interface Settings {
  currencySymbol: string; processingLabel: string; onTheWayLabel: string
  completedLabel: string; availableFrom?: string; availableTo?: string
  paymentMethods?: { cash: boolean; card: boolean; online: boolean }
}
```

With:
```typescript
interface Settings {
  currencySymbol: string; processingLabel: string; onTheWayLabel: string
  completedLabel: string; availableFrom?: string; availableTo?: string
  paymentMethods?: { cash: boolean; card: boolean; online: boolean }
  venueType?: 'hotel' | 'restaurant'
  requireCode?: boolean
  requireLocation?: boolean
  locationLabel?: string
}
```

- [ ] **Step 2: Change initial step to `'menu'`**

Replace:
```typescript
  const [step, setStep] = useState<'code' | 'menu' | 'checkout'>('code')
```
With:
```typescript
  const [step, setStep] = useState<'code' | 'menu' | 'checkout'>('menu')
```

- [ ] **Step 3: Update "← Back" on menu step to navigate to hotel page**

In the menu step header, find the Back button and replace it:

```typescript
          <button
            onClick={() => { window.location.href = `/${roomId}` }}
            style={{ background: 'transparent', border: 'none', color: c.muted, cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: "'DM Sans',sans-serif" }}
          >← Back</button>
```

- [ ] **Step 4: Remove the `code` step render block**

Delete the entire `if (step === 'code') return (...)` block (currently lines 360–405). The code step is no longer reachable.

- [ ] **Step 5: Update `handlePlace` validation to be settings-aware**

Replace the top of `handlePlace`:

```typescript
  const handlePlace = async () => {
    const needsCode = settings.requireCode ?? true
    const needsLocation = settings.requireLocation ?? true
    const isRestaurant = settings.venueType === 'restaurant'

    if (needsCode && !code.trim()) {
      setCodeError(isRestaurant ? 'Enter the table PIN' : 'Enter your reservation code')
      return
    }
    if (needsLocation && !guestRoomNumber.trim()) {
      setRoomNumberError(`Enter your ${settings.locationLabel || 'room number'}`)
      return
    }
    setPlacing(true)
    const r = await fetch(`${API}/v1/orders/rooms/${roomId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(isRestaurant ? { tablePin: code.trim() } : { code: code.trim() }),
        guestRoomNumber: guestRoomNumber.trim() || undefined,
        items: cart.map(c => ({ itemId: c.item.id, qty: c.qty })),
        payment, note: note.trim() || undefined,
        guestEmail: email.trim() || undefined,
        language: getBrowserLanguage()?.name || undefined
      })
    })
```

- [ ] **Step 6: Move code and room number fields into checkout step**

Find the checkout step render. Locate where `payment`, `note`, `email` fields are shown. Add the conditional code/PIN and location fields **before** the payment section:

```typescript
            {/* Code / PIN field */}
            {(settings.requireCode ?? true) && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: c.muted, display: 'block', marginBottom: 5 }}>
                  {settings.venueType === 'restaurant' ? 'Table PIN' : 'Reservation Code'}
                </label>
                <input
                  style={{ ...s.input, letterSpacing: 3, fontSize: 18, fontFamily: "'Cormorant Garamond',serif", textTransform: settings.venueType === 'restaurant' ? 'none' : 'uppercase', borderColor: codeError ? c.red : undefined } as any}
                  value={code}
                  onChange={e => { setCode(settings.venueType === 'restaurant' ? e.target.value : e.target.value.toUpperCase()); setCodeError('') }}
                  placeholder={settings.venueType === 'restaurant' ? '0000' : 'e.g. SMITH101'}
                  inputMode={settings.venueType === 'restaurant' ? 'numeric' : undefined}
                />
                {codeError && <p style={{ color: c.red, fontSize: 12, marginTop: 5 }}>{codeError}</p>}
              </div>
            )}

            {/* Location / room number field */}
            {(settings.requireLocation ?? true) && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: c.muted, display: 'block', marginBottom: 5 }}>
                  {settings.locationLabel || 'Room number'}
                </label>
                <input
                  style={{ ...s.input, borderColor: roomNumberError ? c.red : undefined } as any}
                  value={guestRoomNumber}
                  onChange={e => { setGuestRoomNumber(e.target.value); setRoomNumberError('') }}
                  placeholder={settings.locationLabel || 'Room number'}
                />
                {roomNumberError && <p style={{ color: c.red, fontSize: 12, marginTop: 5 }}>{roomNumberError}</p>}
              </div>
            )}
```

- [ ] **Step 7: Add GDPR notice below Place Order button**

After the Place Order `<button>`, add:

```typescript
            <p style={{ fontSize: 11, color: c.muted, textAlign: 'center', margin: '10px 0 0', lineHeight: 1.6 }}>
              By placing your order, you agree to the processing of your personal data solely for order fulfillment, in accordance with GDPR Regulation (EU) 2016/679.
            </p>
```

- [ ] **Step 8: Commit**

```bash
cd infiora-app-main/infiora-app-main
git add src/views/orders/GuestOrderPage.tsx
git commit -m "feat: skip code screen, dynamic checkout fields by venue settings, GDPR notice"
```

---

## Self-Review

**Spec coverage check:**
- ✅ TypeScript group validation error fixed (Task 1)
- ✅ Polling replaced with SSE in dash — Bell, OrdersPage, ActiveOrders (Tasks 8–9)
- ✅ Bell + OrdersPage share same cache key `limit:50` (Task 9)
- ✅ `playNotificationSound` extracted to shared util (Task 7)
- ✅ Venue mode: hotel/restaurant with defaults (Tasks 2, 10)
- ✅ requireCode, requireLocation, locationLabel, tablePin toggleable per hotel (Tasks 2–5, 10)
- ✅ Table PIN rate limiting: 5 attempts → 15 min block (Task 4)
- ✅ Time-window enforced at placeOrder level in restaurant mode (Task 4)
- ✅ tablePin never sent to guest app (Task 5)
- ✅ Guest app: no code screen on page load (Task 11)
- ✅ Guest app: "← Back" → hotel main page (Task 11)
- ✅ Guest app: checkout fields driven by settings (Task 11)
- ✅ GDPR notice in checkout (Task 11)

**Placeholder scan:** None found.

**Type consistency:**
- `IHotelOrdersSettings` extended in Task 2, consumed in Tasks 4, 5, 11
- `IOrderSettings` extended in Task 6, consumed in Task 10
- `IPlaceOrderBody` updated in Task 2, validation updated in Task 3, service updated in Task 4
- `useOrdersSSE` created in Task 8, used in Task 9
- `playNotificationSound` created in Task 7, used in Tasks 7 and 8

All consistent.
