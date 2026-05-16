# Visitor Identity Strategy

## Current Rule

- Infiora uses one anonymous visitor ID per browser tab/session for guest analytics.
- The ID lives in `sessionStorage`, never in cookies or `localStorage`.
- The ID automatically resets when the tab/session ends.
- An additional 8-hour TTL limits long-lived tabs from reusing the same identifier forever.

## Privacy Constraints

- No cross-site tracking.
- No persistent identifier across browser restarts.
- No guest PII is derived from the anonymous visitor ID.
- Bot traffic is ignored for guest room activity creation and order-visit creation.

## Guest Flows Covered

- Room page view/activity tracking
- Room CTA tap tracking
- Order menu visit tracking
- Order activity tracking

## Reset Conditions

- Browser tab/session closes
- Stored session exceeds the 8-hour TTL
- Manual session storage clear

## Product Follow-up

- If product wants cross-tab identity or attribution beyond a single session, that should be a separate consent-reviewed design.
- Keep the current session-scoped strategy as the default privacy-safe baseline.
