# Archive Status: infiora-dash-main

**This directory is NOT part of the active Infiora stack.**

This is a hotel-staff dashboard prototype. It is excluded from all root startup scripts, CI validation, and production deployment paths.

## Why it is not active

- Contains `fake-db` server actions not backed by the real MongoDB backend
- Uses a default `NEXTAUTH_SECRET` (insecure for production)
- Has broad NextAuth session checks without hotel-scoped authorization
- Contains placeholder Stripe client references not wired to production Stripe Connect

## What this was

A Next.js hotel-staff dashboard prototype demonstrating operational screens for hotel managers. Some UX patterns may be useful as reference when building hotel-staff features into the active admin surface.

## Active stack

See `/docs/active-system.md` for the production-oriented apps:
- `infiora-backend-main/infiora-backend-main`
- `infiora-admin-main/infiora-admin-main`
- `infiora-app-main/infiora-app-main`
