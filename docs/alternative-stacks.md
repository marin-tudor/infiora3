# Alternative And Legacy Stacks

This repository also contains non-default Infiora implementations and historical code. None of these are part of the active production path — do not run security fixes, root scripts, or CI validation against them without explicit intent.

## infiora-dash-main

**Status: Not production-ready. Not included in active startup or test paths.**

A hotel-staff dashboard prototype built on Next.js with NextAuth. Contains fake-db server actions, broad NextAuth session checks, a default `NEXTAUTH_SECRET`, and placeholder Stripe client references. It is kept for reference and potential migration of screens into the active admin or a future staff-facing surface.

Do not deploy this app. Do not run `npm run dev` from root scripts against it.

## infiora-api-main

**Status: Prototype. Not deployed.**

A .NET/C# alternative API implementation. Uses `EnsureCreated()` style database setup and development defaults. Kept for reference only.

## infiora-django-main

**Status: Prototype. Not deployed.**

A Django/DRF alternative API implementation. Has permissive development CORS and fallback secrets. Kept for reference only.

## archive/

Historical guest app snapshots before major migrations. Not maintained.
