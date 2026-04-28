# Infiora Dashboard — CLAUDE.md

## Stack
- Next.js 14 App Router, TypeScript, MUI v5 + MUI Lab
- RTK Query (Redux Toolkit) for all API calls
- ApexCharts via `AppReactApexCharts` (`@/libs/styles/AppReactApexCharts`)
- Auth via `useAuthUser()` hook → provides `authUser.hotel.id`

## Routing
- `src/app/[lang]/(private)/` — all protected routes
- `/insights` → `InsightsPage`
- `/orders` → Orders list/management
- `/rooms` → Room management

## Analytics / Insights (`src/views/insights/`)

### `pages/InsightsPage.tsx`
Main page with 5 tabs. URL-based tab state via `useSearchQuery`.
- Params tracked in URL: `startDate`, `endDate`, `language`, `device`, `tab`
- `tab` is excluded from the API call (UI-only)
- Falls back to today if no date selected

### Tab components
| Component | Key data source | Purpose |
|-----------|----------------|---------|
| `OverviewTab.tsx` | `insights` + `useGetHotelFeedbacksQuery` | KPI cards, trend chart, device/language donuts, room table with ratings |
| `RoomsTab.tsx` | `insights` + `useGetHotelFeedbacksQuery` | Detailed room analytics, performance classification, charts |
| `ButtonsTab.tsx` | `insights` (activities for peak hours) | Tap KPIs, taps-over-time, donut, peak-hours bar, top-8 button cards |
| `OrdersAnalyticsTab.tsx` | `useGetOrderAnalyticsQuery` + `useGetOrderVisitAnalyticsQuery` | Order KPIs, revenue chart, status/payment donuts |
| `ReportsTab.tsx` | all queries | CSV export for 5 report types |

### Performance classification (RoomsTab)
```
bounceRate < 30 && timeSpent > 120 → "top"
bounceRate > 60 || timeSpent < 45  → "attention"
avgFeedbackRating < 3              → "attention"
otherwise                          → "average"
```

## RTK Query endpoints (`src/redux/api/`)

| Hook | Endpoint | Used in |
|------|---------|---------|
| `useGetHotelInsightsQuery` | `GET /v1/hotels/:id/insights` | InsightsPage |
| `useGetHotelFeedbacksQuery` | `GET /v1/rooms/feedback` | OverviewTab, RoomsTab, ReportsTab |
| `useGetOrderAnalyticsQuery` | `GET /v1/orders/analytics` | OrdersAnalyticsTab, ReportsTab |
| `useGetOrderVisitAnalyticsQuery` | `GET /v1/orders/visit-analytics` | OrdersAnalyticsTab, ReportsTab |

### `IInsights` shape (from backend)
```ts
{
  keyMetrics: { views, liveViews, uniqueViews, returningViews, taps, timeSpent, bounceRate, viewsByDevices, viewsByLanguages },
  change: { views, uniqueViews, returningViews, taps, timeSpent, bounceRate, engagedViews },
  overTime: { views, uniqueViews, taps, timeSpent, bounceRate, engagedViews, returningViews }, // Record<date, number>
  rooms: IInsightRoom[],  // { id, number, group, views, uniqueViews, returningViews, taps, timeSpent, bounceRate }
  links: IInsightLink[],  // { id, title, taps, room?, group? }
  activities: IActivity[], // raw activities for peak-hours calc
}
```

### `IFeedbackSubmission` shape
```ts
{ id, room, hotel, rating?, email?, message?, createdAt }
```

## Utilities (`src/utils/miscUtils.ts`)
- `getSeriesData(obj: Record<string, number>)` → `{ x: timestamp, y: number }[]` for ApexCharts datetime axis
- `formatTime(seconds: number)` → "1h 23m", "45s" etc.
- `toSearchParams(obj)` → URL query string

## Key patterns

### Chart setup (ApexCharts)
```tsx
<AppReactApexCharts type='line' width='100%' height={260} options={opts} series={series} />
```
Always use `theme.palette.divider`, `theme.palette.text.secondary`, `theme.palette.mode` for chart styling.

### Per-room feedback aggregation (frontend)
```ts
const feedbackByRoom: Record<string, { count: number; total: number }> = {}
fbData.results.forEach(f => {
  if (!f.room || !f.rating) return
  const e = feedbackByRoom[f.room] ?? { count: 0, total: 0 }
  e.count++; e.total += f.rating
  feedbackByRoom[f.room] = e
})
```
