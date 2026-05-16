# Infiora Backend — CLAUDE.md

## Stack
- Node.js + Express + TypeScript
- MongoDB via Mongoose
- JWT auth (access + refresh tokens in httpOnly cookies)

## Module structure (`src/modules/`)
Each module follows: `model.ts` → `interfaces.ts` → `validation.ts` → `service.ts` → `controller.ts` → `route.ts`

| Module | Purpose |
|--------|---------|
| `activity` | Tracks every view and tap event. Schema: `{ hotel, user?, action: 'view'|'tap', details: Mixed, timestamps }`. `details` holds `device`, `language`, `visitorId`, `time`, `engaged`, `room`, `link`, etc. |
| `insight` | Aggregates activities into analytics. Key file: `insight.service.ts`. `getCounts()` normalizes language (code→name) and device before aggregating. |
| `room` | Room CRUD + view tracking endpoint `GET /v1/rooms/:id?action=view&device=...&language=...&visitorId=...` |
| `link` | Button/link CRUD + tap tracking endpoint `GET /v1/links/:id?room=...&device=...&language=...` |
| `hotel` | Hotel CRUD + `GET /v1/hotels/:id/insights` + `POST /v1/hotels/:id` (social link tap tracking) |
| `orders` | Order management + `GET /v1/orders/analytics` + `GET /v1/orders/visit-analytics` |
| `feedback` | Guest feedback submissions. Schema: `{ hotel, room, rating, email?, message?, createdAt }`. Endpoint: `GET /v1/rooms/feedback?hotel=X&startDate=Y&endDate=Z&limit=N` |
| `auth` | Login/register/refresh/logout |
| `user` | User CRUD (hotel staff) |
| `group` | Room groups |
| `tag` | Tags for rooms/links |

## Key analytics logic (`insight.service.ts`)

### `getCounts(activities, field)`
- Normalizes `language` field: ISO codes (en, de, hr...) → full names (English, German, Croatian...)
- Normalizes `device` field: iOS/iPhone/iPad → "iOS", Desktop/Windows/Mac → "Desktop", Android → "Android"
- Returns top 3 + "Others" as percentages

### `getHotelInsights(params)`
- Params: `hotel`, `startDate`, `endDate`, `language?` (filter), `device?` (filter)
- Returns: `keyMetrics`, `links`, `rooms`, `overTime`, `change`, `activities`, `topRoom`, `topLink`

### `calculateStatsOverTime(activities)`
- Groups by date, computes: views, taps, uniqueViews, timeSpent, bounceRate, engagedViews

## Tracking endpoints

### Room view tracking
`GET /v1/rooms/:id?action=view&device=Desktop|iOS|Android&language=English&visitorId=uuid`
- Creates Activity with `action='view'`
- Returns `activityId` used for time-spent updates

### Time-spent update
`GET /v1/rooms/:id?activityId=X&time=120&engaged=true&language=English`
- Updates existing Activity with time and engagement

### Link tap tracking
`GET /v1/links/:id?room=roomId&device=Desktop|iOS|Android&language=English`
- Creates Activity with `action='tap'`

### Social link tap
`POST /v1/hotels/:id` with body `{ room, language, device, link?, logo?, popup? }`
- Creates Activity with `action='tap'`

## Environment variables
See `.env` / `.env.example` for `MONGODB_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, etc.
