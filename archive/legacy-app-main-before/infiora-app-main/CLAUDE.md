# Infiora App (Guest-facing) — CLAUDE.md

## Stack
- Next.js 14 App Router, TypeScript, MUI v5
- `react-device-detect` for device detection
- No auth — public guest-facing pages

## Routing
- `src/app/[id]/page.tsx` — Room page (SSG with 60s revalidate)
- `src/app/[id]/order/` — Order flow
- `src/app/order/` — Order confirmation

## Core context: `RoomContext.tsx`
Single context that handles everything for a room session.

### What it does on mount
1. Detects browser language via `getBrowserLanguage()` (maps navigator.language to ILanguage)
2. Detects device: `isDesktop ? "Desktop" : isIOS ? "iOS" : "Android"`
3. Generates/retrieves persistent `visitorId` from localStorage
4. Calls `GET /v1/rooms/:id?action=view&device=X&language=Y&visitorId=Z`
5. Returns `activityId` used for time-spent tracking

### Language tracking
- Sends `language.name` (e.g., "English", "Croatian") — **always the full name, never the code**
- `getBrowserLanguage()` is in `src/utils/miscUtils.ts` — maps browser locale to ILanguage from `src/data/languages1.json`

### Device tracking
- Sends one of: `"Desktop"`, `"iOS"`, `"Android"`
- Uses `isDesktop` from `react-device-detect` for desktop detection

## Tracking components

### `PageTracker.tsx`
- Tracks time spent via 60s intervals
- Sends `GET /v1/rooms/:id?activityId=X&time=120&engaged=true&language=English`
- Also triggers feedback dialog after first engagement (3s delay)
- **Note:** sends `language.name` (not code)

### `LinksList.tsx`
- On button click: `GET /v1/links/:id?room=X&language=English&device=Desktop`
- Uses `language.name` and `isDesktop ? "Desktop" : isIOS ? "iOS" : "Android"`

### `PopupDialog.tsx` / `RoomView.tsx`
- Social link tap: `POST /v1/hotels/:id` with `{ room, language: language.name, device, ... }`

## Key files
| File | Purpose |
|------|---------|
| `src/contexts/RoomContext.tsx` | Main room state, initial tracking call |
| `src/views/rooms/details/components/PageTracker.tsx` | Time-spent tracking |
| `src/views/rooms/details/components/links/LinksList.tsx` | Button tap tracking |
| `src/views/rooms/details/components/PopupDialog.tsx` | Popup tap tracking |
| `src/views/rooms/details/components/RoomView.tsx` | Social link tap tracking |
| `src/utils/miscUtils.ts` | `getBrowserLanguage()`, `getButtonStyles()` |
| `src/data/languages1.json` | List of supported languages `{ code, name, flag }` |
| `src/types/index.ts` | `IRoom`, `ILink`, `ILanguage`, `IFeedback` etc. |
