# Infiora Implementation Gap Audit

Date: 2026-05-16

Source of truth reviewed:
- `docs/superpowers/plans/INFIORA_FULL_PROJECT_AUDIT_AND_UPGRADE_PLAN_DEDUPED.md`
- active backend, guest app, admin app, root scripts, and active tests

## Current Status

The previously identified implementation gaps from this audit pass are now closed in active code.

Confirmed fixed:
- INF-AUDIT-012: iCal SSRF hardening is now enforced in active backend code
- INF-AUDIT-003: guest PaymentIntent currency is now server-authoritative
- INF-AUDIT-013: guest status lookup, booking status lookup, maintenance status, and housekeeping status no longer use guest query-token fallback
- INF-AUDIT-020: unauthenticated public room listing now requires explicit hotel scope
- INF-AUDIT-032: active backend package scripts and active README/dev examples are aligned to npm
- Wave wording in the deduped project plan was softened from "closed" to implementation snapshot wording

Additional hardening completed during follow-up:
- guest order polling no longer passes the tracking token in the query string; it now uses `x-order-tracking-token`
- Express 5 compatibility issues found during verification were fixed in the active backend app bootstrap and validation path
- active backend request sanitization now uses an in-repo middleware that mutates request objects safely under the current stack

## Verification

Targeted backend verification passed after the changes:
- `src/modules/orders/orders.controller.test.ts`
- `src/modules/orders/__tests__/ssrf-guards.test.ts`
- `src/modules/room/__tests__/public-room-security.test.ts`
- `src/modules/booking/booking.controller.test.ts`

Result:
- 4 test suites passed
- 37 tests passed

Targeted lint verification on the touched backend files also passed.

## Remaining Items

No remaining material code gaps from the original 2026-05-16 implementation audit were found in the active Node backend and guest app after the remediation pass.

What still exists is either intentional or outside the scope of the fixed findings:
- group SSE device auth still accepts `?token=` fallback in `orders.route.ts` because browser `EventSource` does not support custom headers; this is a separate staff/device transport constraint, not the guest status-token leak that was audited above
- auth reset/verify flows still use query tokens by design; those are separate product flows and were not part of the guest-status remediation item
- deferred plan items remain deferred at the project-plan level, but they are no longer misrepresented by the wording that previously claimed full closure

## Short Summary

As of this snapshot, the active implementation is aligned with the concrete code-level findings that were originally called out by this audit. The remaining concerns are documentation/deferred-planning topics or intentional exceptions for separate flows, not unresolved regressions in the remediated paths.
