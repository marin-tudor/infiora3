# UI QA Checklist

## Guest App

- Verify room page loads on 390px and 768px widths without horizontal overflow.
- Verify keyboard navigation reaches language switcher, main CTAs, dialogs, and form fields.
- Verify loading, not-found, and inactive-room states are readable on mobile.
- Verify order flow works with empty cart, invalid code/PIN, network failure, scheduled order, and completed tracker states.
- Verify interactive controls have visible labels or text.

## Admin and Dashboard

- Verify login, logout, redirect, and session-expiry flows under React Strict Mode.
- Verify staff/tablet pages do not duplicate polling timers or event listeners after remount.
- Verify major tables still paginate and filter correctly on narrow screens.
- Verify empty states and failed API requests show actionable feedback.

## Accessibility Smoke Checks

- Tab through the main guest and operator flows without a mouse.
- Confirm buttons, links, inputs, and dialogs expose readable names.
- Confirm focus remains visible after dialog open/close and route changes.
- Confirm color-only status indicators also include text labels.

## Release Gate

- Run this checklist for guest room, guest ordering, booking, staff tablet, and operator auth flows before release.
