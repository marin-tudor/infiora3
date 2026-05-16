# Blog Section Improvements — Design Spec

**Date:** 2026-04-14  
**Projects affected:** `infiora-dash-main` (admin), `infiora-app-main` (guest app)

---

## Overview

Four improvements to the blog link type:

1. Raise image limit from 5 to 12 per section
2. Replace single URL + URL Button Text fields with a dynamic list of links
3. Smart URL input with auto-prefix for email (`mailto:`) and phone (`tel:`)
4. Fullscreen image lightbox in the guest view

---

## 1. Image Limit (5 → 12)

**File:** `infiora-dash-main/src/views/links/components/BlogSectionsEditor.tsx`

Change `maxImages={5}` to `maxImages={12}` on the `MultipleImagePicker` component.

No type changes required. No guest view changes required.

---

## 2. Multiple Links per Section

### Data model

Add a new optional field to `ISection` in both projects:

```ts
links?: { url: string; urlButtonText: string }[]
```

Existing fields `url`, `urlButtonText` remain on the type for backward compatibility but are no longer written by the editor.

**Files:**
- `infiora-dash-main/src/types/index.ts`
- `infiora-app-main/src/types/index.ts`

### Admin editor (`BlogSectionsEditor.tsx`)

Remove the two `InputField` components for `sections[i].url` and `sections[i].urlButtonText`.

Replace with a dynamic links list:
- Each entry renders: smart URL input + button text input + X delete button
- `+ Dodaj link` button at the bottom adds a new empty entry
- No reordering needed (add/remove is sufficient)
- Data path: `sections[i].links[j].url` and `sections[i].links[j].urlButtonText`

**Backward compat on load:** When a section has `url` set but `links` is absent/empty, initialise `links` as `[{ url: section.url, urlButtonText: section.urlButtonText ?? '' }]`. This migration happens inside the `withSectionClientIds` function in `infiora-dash-main/src/views/links/components/LinkForm.tsx` (line ~82), which already processes each section before passing to the form default values.

### Guest view (`BlogDrawer.tsx`)

Replace the existing single-link render block with a loop over `section.links`:

```tsx
// prefer links array; fall back to legacy single url
const links = section.links?.length
  ? section.links
  : section.url
    ? [{ url: section.url, urlButtonText: section.urlButtonText }]
    : []

links.map(({ url, urlButtonText }) => /* existing button/icon render logic */)
```

The visual output for each link is identical to the current single-link render.

---

## 3. Smart URL Input

A new inline component (or small UI pattern) used inside the links list for each URL field.

### Behaviour

- Default state: plain textbox, user types a full web URL (`https://...`)
- Two small icon buttons sit to the right of the input: ✉️ (email) and 📞 (phone)
- Clicking ✉️ switches to **email mode**: placeholder becomes `email@hotel.com`, value is stored as `mailto:value`
- Clicking 📞 switches to **phone mode**: placeholder becomes `+385...`, value is stored as `tel:value`
- Clicking the active icon again returns to **web mode**
- On load, detect existing prefix to restore the correct mode:
  - `mailto:` → email mode
  - `tel:` → phone mode
  - anything else (or empty) → web mode
- In email/phone mode the user types only the raw value (no prefix); the prefix is added/removed transparently when reading/writing the form field

### Implementation

Self-contained component `SmartUrlInput` that:
- Accepts `value: string` and `onChange: (value: string) => void`
- Manages internal `mode: 'web' | 'email' | 'phone'` state
- Renders a MUI `TextField` with `InputProps.endAdornment` containing the two icon buttons
- On mode change: strips old prefix from current value, switches mode (prefix added on next save)

**File:** `infiora-dash-main/src/components/common/SmartUrlInput.tsx` (new file)

---

## 4. Fullscreen Image Lightbox (Guest View)

**File:** `infiora-app-main/src/views/rooms/details/components/links/BlogDrawer.tsx`

### Trigger

A small expand icon (`OpenInFull` or `Fullscreen` from MUI icons) overlaid in the bottom-right corner of each image thumbnail. Visible on hover (desktop) and always visible (mobile).

### Lightbox overlay

Implemented as a MUI `Dialog` with `fullScreen` prop (or `maxWidth="xl"` + `fullWidth`):

- Dark background (`#000` or `rgba(0,0,0,0.95)`)
- Image displayed centred, `object-fit: contain`, max width/height fills the viewport
- If the section has multiple images: left/right arrow buttons for navigation (same logic as existing `prevImage`/`nextImage` but within the dialog)
- Image counter badge (e.g. `2 / 5`) bottom-centre
- **X close button** fixed top-right — closes the dialog, user stays on the same page
- Opening the lightbox initialises to the currently visible image index for that section

### State

Add to `BlogDrawer`:
```ts
const [lightbox, setLightbox] = useState<{ sectionId: string; index: number } | null>(null)
```

`null` = closed. Setting a value opens the dialog for that section+image.

---

## Affected Files Summary

| File | Change |
|------|--------|
| `infiora-dash-main/src/types/index.ts` | Add `links?` to `ISection` |
| `infiora-app-main/src/types/index.ts` | Add `links?` to `ISection` |
| `infiora-dash-main/src/views/links/components/BlogSectionsEditor.tsx` | maxImages 5→12, remove url/urlButtonText fields, add links list |
| `infiora-dash-main/src/components/common/SmartUrlInput.tsx` | New component |
| `infiora-app-main/src/views/rooms/details/components/links/BlogDrawer.tsx` | Multiple links render + fullscreen lightbox |

### Not affected
- Backend / API — `links` is an additive field on an existing free-form object; existing `url`/`urlButtonText` fields remain valid on existing records
- Map settings, Phone, Address, Video fields — unchanged
- `MultipleImagePicker` component — unchanged (only the `maxImages` prop value changes)
- All other link types — unchanged
