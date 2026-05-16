# Infiora Workspace

This repository contains multiple Infiora codebases, but the active default system for local development and production-oriented changes is:

- `infiora-backend-main/infiora-backend-main` - authoritative Node API
- `infiora-app-main/infiora-app-main` - guest-facing Next.js app
- `infiora-admin-main/infiora-admin-main` - internal admin console

Non-authoritative alternatives and legacy content are documented in [docs/alternative-stacks.md](/C:/Users/Tudor/infiora/docs/alternative-stacks.md:1).

## Root Commands

Run these from `C:\Users\Tudor\infiora`:

- `npm run install:active` - install dependencies for active apps
- `npm run dev` - start the active backend, admin, and guest app
- `npm run lint` - lint the active apps
- `npm run test` - run tests for active apps that expose a test script
- `npm run build` - build the active apps
- `npm run audit` - validate workspace structure and regenerate the shared contract manifest
- `npm run contract:sync` - regenerate the shared API route manifest only

## Ports

- Backend API: `http://localhost:8080`
- Admin console: `http://localhost:4000`
- Guest app: `http://localhost:4002`

## Databases and Storage

- Node backend: MongoDB plus S3-compatible uploads
- Admin and guest apps: no standalone database; both depend on the Node backend

## Ownership

- Active system owner: Node stack (`backend + admin + app`)
- Alternative stacks: `infiora-dash-main`, `infiora-api-main`, `infiora-django-main`

Read [docs/active-system.md](/C:/Users/Tudor/infiora/docs/active-system.md:1) before changing architecture, deployment, or environment variables.
