# Bookable Slot Picker in Guest Order Page

**Date:** 2026-04-28  
**Status:** Approved

## Problem

The guest order page (`GuestOrderPage.tsx`) shows all catalog items — both `instant` and `bookable` — as identical cards. Clicking "+" on a bookable item adds it to the cart like food, which is wrong: bookable services require a time slot selection and go through a separate booking API (`POST /v1/hotels/:id/bookings`), not the orders API.

## Solution

Bookable items stay on the order page but render differently. Clicking "Book →" opens a bottom sheet slot-picker. After selecting a slot, the guest is redirected to the existing `/[id]/bookings/confirm` page to complete the booking.

## Scope

Three files change:

1. `infiora-backend-main/src/modules/orders/orders.service.ts` — add `hotelId` to catalog response
2. `infiora-app-main/src/views/orders/GuestOrderPage.tsx` — bookable card rendering + slot-picker drawer
3. `infiora-app-main/src/views/bookings/GuestBookingConfirmPage.tsx` — email is already required; no change needed

## Flow

```
Menu → klik "Book →" → Bottom sheet (datum + slot) → "Continue" → /bookings/confirm → Booking potvrđen
```

---

## Backend change — `getCatalogForRoom`

Add `hotelId` to the return value so the guest app can call the timeslots endpoint without a separate room fetch.

**File:** `src/modules/orders/orders.service.ts`, function `getCatalogForRoom`

**Current return:**
```ts
return { settings, categories, items, promotions, hotelName, hotelImage }
```

**Updated return:**
```ts
return { settings, categories, items, promotions, hotelName, hotelImage, hotelId: String(hotelId) }
```

---

## Guest app — `GuestOrderPage.tsx`

### Data model

Extend the `Item` interface to include type and booking config fields:

```ts
interface Item {
  // ...existing fields...
  type?: 'instant' | 'bookable'
  bookingConfig?: {
    duration?: number
    slotType?: 'private' | 'shared'
    maxPersons?: number
    cancelPolicyHours?: number
    advanceMaxDays?: number
    requiresApproval?: boolean
    addons?: { _id: string; name: string; price: number; description: string }[]
    pricePerPerson?: boolean
  }
}
```

Add `hotelId` to state (captured from catalog response).

### Bookable item card

When `item.type === 'bookable'`, the card renders differently:

- **Badge:** `📅 Bookable` (gold, top-left, same style as existing `sale`/`new`/`hit` badges)
- **Duration line:** `⏱ {duration} min · {Private | Shared}` in gold, below description
- **Action button:** `Book →` (solid gold filled button) instead of the "+" circle
- The qty counter (`−  n  +`) is **not shown** for bookable items — they can't be added to cart

### Slot-picker bottom sheet

New state variables:
- `slotPickerItem: Item | null` — item for which the drawer is open
- `slotPickerDate: string` — selected date (ISO `YYYY-MM-DD`), defaults to today
- `slotPickerSlots: TimeSlot[]` — fetched from backend
- `slotPickerLoading: boolean`

New interface:
```ts
interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  maxPersons: number
  bookedPersons: number
  isBlocked: boolean
}
```

**Slot fetch:** when `slotPickerItem` or `slotPickerDate` changes:
```
GET /v1/hotels/{hotelId}/bookings/timeslots?itemId={id}&from={date}&to={nextDay}
```

**Drawer UI:**
- Backdrop overlay (same pattern as existing cart panel)
- Bottom-anchored panel, slides up
- Handle bar at top
- Header: item name + `⏱ {duration} min · {cur}{price}`  + close button
- Date `<input type="date">` with `min=today`, `max=today+advanceMaxDays`
- Slot grid: 3 columns
  - Available: gold border + faint gold bg, clickable
  - Full/blocked: muted, disabled
  - Shared slots show remaining spots
- **"Continue to Confirm →"** CTA button — enabled only when a slot is selected; gold gradient, same style as other primary buttons in the page

**On "Continue":**
Build query params (same shape as `GuestBookingsBrowsePage.handleSelectSlot`) and redirect:
```
router.push(`/${roomId}/bookings/confirm?${params}`)
```

Params passed: `hotelId`, `itemId`, `itemName`, `slotId`, `startTime`, `endTime`, `maxPersons`, `slotType`, `price`, `cancelPolicyHours`, `addons`, `pricePerPerson`

---

## Confirm page — `GuestBookingConfirmPage.tsx`

Email is already a required field — `handleSubmit` checks `if (!guestEmail || !guestRoomNumber)` and blocks submission. No code change needed.

The `placeholder` already shows `Your email *` indicating it is required.

---

## What does NOT change

- Instant items keep exactly the same card rendering and cart logic
- The `/[id]/bookings` standalone page is unchanged
- The bookings confirm and my-bookings pages are unchanged
- No new routes are added
