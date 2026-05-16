# Restore old front page

This folder contains the previous dashboard front page implementation moved out of the active source tree so new scans and new design work do not pick it up as the current look.

## Archived files

- `src/app/[lang]/(private)/home/page.tsx`
- `src/views/home/pages/HomePage.tsx`
- `src/views/home/components/KeyMetrics.tsx`
- `src/views/home/components/StatsCard.tsx`
- `src/views/home/components/TopRated.tsx`
- `src/views/home/components/UpcomingScheduledOrders.tsx`

## Archived static HTML

All old static website variants that were previously under `archive/` were also moved here under:

- `static-html/root-static-pages/`
- `static-html/legacy-static-frontend-frotnend/`
- `static-html/legacy-static-frontend-frbezanimacija/`

## Restore instructions for Codex

If you want Codex to restore the old front page exactly as it was, use this instruction:

```text
Restore the archived front page from `infiora-dash-main/infiora-dash-main/old look/front-page/` back into the active app.

Move these files back to their original locations:
- `old look/front-page/src/app/[lang]/(private)/home/page.tsx` -> `src/app/[lang]/(private)/home/page.tsx`
- `old look/front-page/src/views/home/pages/HomePage.tsx` -> `src/views/home/pages/HomePage.tsx`
- `old look/front-page/src/views/home/components/KeyMetrics.tsx` -> `src/views/home/components/KeyMetrics.tsx`
- `old look/front-page/src/views/home/components/StatsCard.tsx` -> `src/views/home/components/StatsCard.tsx`
- `old look/front-page/src/views/home/components/TopRated.tsx` -> `src/views/home/components/TopRated.tsx`
- `old look/front-page/src/views/home/components/UpcomingScheduledOrders.tsx` -> `src/views/home/components/UpcomingScheduledOrders.tsx`

Also restore the static HTML files by moving everything from:
- `old look/front-page/static-html/root-static-pages/` -> `archive/root-static-pages/`
- `old look/front-page/static-html/legacy-static-frontend-frotnend/` -> `archive/legacy-static-frontend-frotnend/`
- `old look/front-page/static-html/legacy-static-frontend-frbezanimacija/` -> `archive/legacy-static-frontend-frbezanimacija/`

Replace any current placeholder files with the archived ones.
After restore, verify imports still resolve and remove the placeholder home page if needed.
```

## Original root

All original paths were under:

`infiora-dash-main/infiora-dash-main/`
