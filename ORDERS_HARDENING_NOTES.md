# Orders Hardening Notes

This file documents the security and ownership fixes applied to the Infiora orders flow on `2026-04-06`.

## Backend hardening

- Reservation code validation is now scoped by both `roomId` and `hotelId`.
- Guest-selected modifier prices are no longer trusted from the client.
- Order totals are now calculated from catalog data on the server.
- Public order tracking now requires both:
  - `orderId`
  - `trackingToken`
- Guest rating submission now also requires `trackingToken`.
- Order visit conversion now validates that the `visitId` belongs to the same `roomId`.
- Catalog items can only reference categories from the same hotel.
- Promotions can only reference categories/items from the same hotel.

## Guest/app flow changes

- New orders now return a `trackingToken`.
- The guest app stores:
  - `trackId`
  - `trackToken`
  - tracked order snapshot
- Guest polling and rating now send the tracking token.

## Dashboard/UI changes

- Orders UI now shows both:
  - Infiora source room/link room
  - guest-entered room
- Orders UI now highlights whether the two room values match.
- Notifications and CSV export also include both room values.

## Important follow-up

- Existing legacy orders created before the tracking token change may not have a `trackingToken`.
- If old in-flight guest orders must remain trackable, a one-time backfill/migration should be run for historical `GuestOrder` documents missing `trackingToken`.
