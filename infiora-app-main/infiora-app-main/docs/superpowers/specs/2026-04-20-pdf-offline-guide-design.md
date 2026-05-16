# Offline PDF Guide — Design Spec

**Date:** 2026-04-20  
**App:** infiora-app-main (guest-facing Next.js 14 app)  
**Feature:** Downloadable offline PDF version of the hotel guest guide

---

## Overview

A small download button is placed below the map section in `RoomView.tsx`. When tapped, it generates a multi-page PDF of the entire guest guide using the already-translated data cached in `RoomContext` — zero extra API calls. The PDF is downloaded directly to the guest's device and can be read offline.

---

## Architecture

### PDF generation library
`@react-pdf/renderer` — runs entirely client-side in the browser. Produces a proper vector PDF (sharp text at any zoom level).

### Data flow
1. Guest opens the page → `RoomContext` fetches room + links, translates to browser language, caches in `dictionary[lang.code]`
2. Guest taps "Download offline guide" button
3. `generateGuidePDF(room, links, language)` is called with the already-translated data
4. `@react-pdf/renderer` builds the PDF document in memory
5. A blob URL is created and a download is triggered in the browser
6. No server calls are made during PDF generation

### New files
- `src/utils/pdfGenerator.tsx` — PDF document definition using `@react-pdf/renderer` components
- `src/views/rooms/details/components/DownloadGuideButton.tsx` — the download trigger button

### Modified files
- `src/views/rooms/details/components/RoomView.tsx` — add `<DownloadGuideButton>` below `<RoomMapSection>`

---

## Download Button

**Placement:** Below `<RoomMapSection>` in `RoomView.tsx`, inside the same centered column as the rest of the content.

**Styling:**
- Same `mx={5}` margin as other buttons
- `height: 36px` (smaller than regular 55px app buttons)
- `outlined` variant
- Icon: `DownloadForOffline` from MUI icons
- Label: looked up from a small static map keyed by `language.code` (e.g. `{ en: "Download offline guide", hr: "Preuzmi offline vodič", de: "Offline-Guide herunterladen", … }`), falling back to English. This is a UI string, not hotel content, so it is not in the AI-translated `dictionary`.
- While generating: shows a `CircularProgress` spinner inside the button, button is disabled

---

## PDF Visual Design

### Background & colors
- Background color on all pages: `room.background.color ?? '#ffffff'` (the solid base color, even if the app uses a gradient or image background — keeps the PDF clean and printable)
- Font color: `room.font.color ?? '#000000'`
- Accent color for section titles and QR labels: `room.button.backgroundColor ?? '#1976d2'`

### Footer (every page)
`[Hotel name]  ·  [Language name]  ·  Powered by [Infiora logo image]`

The Infiora logo is embedded from `/images/logo.png` (the same one used in the app).

---

## PDF Page Structure

### Page 1 — Cover
- Background: `room.background.color ?? '#ffffff'`
- Hotel logo centered (circular, if `room.hotel.image` is set)
- Hotel name (large, bold, centered)
- Room description if set (`room.description`)
- If `room.hotel.map?.centerAddress` is set: QR code linking to `https://maps.google.com/?q=<centerAddress>` with label "Scan to find us on Google Maps"

### Pages 2+ — One page per active link (in app display order)

Active links are filtered by `isActive: true` and ordered by `reorderLinks(room, links)`, the same function used in `RoomView.tsx`.

**Skipped button types:** `order`, `housekeeping`, `maintenance` — these require an internet connection and are excluded from the PDF entirely.

---

## Button Type Rendering

### `wifi`
Single page.
- Section header: button title (e.g. "WiFi")
- Fields: Network (SSID), Password, Security type
- Auto-connect QR code: encoded as `WIFI:T:<security>;S:<ssid>;P:<password>;;` — scanned by phone camera to connect automatically without typing
- Label under QR: "Scan with your camera to connect automatically"

### `blog`
One or more pages (4 sections per page, continues onto next page with same title header and numbered sections continuing from where they left off).

Each section contains:
- Section number + title (bold)
- Images: up to 4 images in a row, centered layout scaled by count (see Image Layout Rules below). Images fetched by URL; failed loads are skipped and the next available image fills the slot. If all images fail, no image row is shown.
- Description text (if set)
- If `section.address` is set: small QR code → `https://maps.google.com/?q=<address>` with label "Directions"
- If `section.phone` is set: small QR code → `tel:<phone>` with label "Call"
- Both QR codes are shown side by side when both fields are present

### `link`
Single page.
- Section header: button title
- Description: `link.value` if set (short text explaining what the link is for)
- Large centered QR code encoding the URL
- Label: "Scan to open in browser"
- URL printed in small text below as manual fallback: "Or type: <url>"

### `text`
One or more pages (same title header repeats if content overflows).
- Section header: button title
- Formatted text content rendered as paragraphs

### `group`
Index page + one page per sub-item.

**Index page:**
- Header: group title
- List of sub-items: icon/emoji (if any) + sub-item title + type label + one-line preview of content

**Sub-item pages:**
Each sub-item is rendered using the same rules as its standalone type (`link`, `text`, `blog`, `wifi`). Every sub-item page has a breadcrumb below the header:
```
[Group Title]  ›  [Sub-item Title]
```
This makes it visually clear the page is part of the group and not a new standalone section.

---

## Image Layout Rules

Maximum 4 images per section. Images are always centered in the row.

| Images shown | Layout |
|---|---|
| 4 | Row of 4, each ~25% width |
| 3 | Row of 3, each ~30% width, centered |
| 2 | Row of 2, each ~36% width, centered |
| 1 | Single image, ~55% width, centered |
| 0 (all failed) | No image row rendered |

**Failure handling:** Images are loaded by URL at render time. If an image fails to load, it is skipped and the next image in the array is tried until 4 successful images are found or the array is exhausted. The layout then adapts to however many images successfully loaded.

---

## Translation

The PDF is generated in the guest's currently selected language. The `dictionary[lang.code]` object in `RoomContext` already contains the fully translated room and links data (same data used to render the page). `generateGuidePDF` receives this translated snapshot directly.

If the guest has not changed language, the PDF uses the default data (no translation needed). If they switched language, the translation was already fetched and cached by `RoomContext` — no new API calls are made at download time.

---

## Dependencies

Add to `infiora-app-main/package.json`:
```
@react-pdf/renderer  ^3.x
```

No backend changes required.
