# Hotel Features, Analytics & PDF Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add offline guide download tracking, fix PDF background images, hide Download Guide in kiosk mode, hotel-level offline guide toggle, superadmin feature flags (orders/maintenance/housekeeping) with upgrade lock screens in the dashboard, and redesign the support page.

**Architecture:** Backend adds `settings` (offlineGuideEnabled) and `features` (ordersEnabled/maintenanceEnabled/housekeepingEnabled) subdocuments to the Hotel model with all defaults `true`. No new endpoints — existing PATCH /v1/hotels/:id handles updates. All four apps (backend, app, dash, admin) need type/UI changes.

**Tech Stack:** Node.js/Express/Mongoose/Joi (backend), Next.js 14/TypeScript/MUI v5/RTK Query/react-hook-form (@react-pdf/renderer for PDF)

---

## File Map

| File | Change |
|------|--------|
| `infiora-backend-main/src/modules/hotel/hotel.interfaces.ts` | Add `IHotelSettings`, `IHotelFeatures` interfaces |
| `infiora-backend-main/src/modules/hotel/hotel.model.ts` | Add `settings` + `features` subdocuments |
| `infiora-backend-main/src/modules/hotel/hotel.validation.ts` | Allow `settings` + `features` in update/create Joi schemas |
| `infiora-app-main/src/types/index.ts` | Add `settings` + `features` to `IHotel` |
| `infiora-app-main/src/views/rooms/details/components/RoomView.tsx` | Gate `DownloadGuideButton` on kiosk mode + offlineGuideEnabled |
| `infiora-app-main/src/views/rooms/details/components/DownloadGuideButton.tsx` | Add download tracking request |
| `infiora-app-main/src/utils/pdfGenerator.tsx` | Fetch background image as dataURL, render as absolute `<Image>` in each Page |
| `infiora-dash-main/src/types/index.ts` | Add `settings` + `features` to `IHotel` |
| `infiora-dash-main/src/views/insights/components/OverviewTab.tsx` | Add Guide Downloads KPI card |
| `infiora-dash-main/src/views/hotels/pages/EditHotelPage.tsx` | Add offline guide toggle switch |
| `infiora-dash-main/src/components/common/FeatureLocked.tsx` | **NEW** — upgrade lock overlay component |
| `infiora-dash-main/src/views/orders/pages/OrdersPage.tsx` | Gate with `features.ordersEnabled` |
| `infiora-dash-main/src/views/housekeeping/pages/HousekeepingPage.tsx` | Gate with `features.housekeepingEnabled` |
| `infiora-dash-main/src/views/maintenance/pages/MaintenancePage.tsx` | Gate with `features.maintenanceEnabled` |
| `infiora-dash-main/src/components/layout/vertical/VerticalMenu.tsx` | Skip pending-count queries when feature disabled |
| `infiora-dash-main/src/views/support/Support.tsx` | Redesign — inline suggestion card |
| `infiora-admin-main/src/types/index.ts` | Add `features` to `IHotel` |
| `infiora-admin-main/src/views/hotel/components/HotelForm.tsx` | Add Feature Access section with 3 toggles |
| `infiora-admin-main/src/views/hotel/components/HotelInsights.tsx` | Add Guide Downloads KPI card |

---

### Task 1: Backend — Add `settings` and `features` to Hotel model

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/hotel/hotel.interfaces.ts`
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/hotel/hotel.model.ts`
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/hotel/hotel.validation.ts`

- [ ] **Step 1: Add interfaces to `hotel.interfaces.ts`**

In `hotel.interfaces.ts`, after the `IHotelMapSettings` interface, add:

```typescript
export interface IHotelSettings {
  offlineGuideEnabled?: boolean;
}

export interface IHotelFeatures {
  ordersEnabled?: boolean;
  maintenanceEnabled?: boolean;
  housekeepingEnabled?: boolean;
}
```

Then in `IHotel` (after `mapPoints`), add:

```typescript
  settings?: IHotelSettings;
  features?: IHotelFeatures;
```

- [ ] **Step 2: Add subdocuments to `hotel.model.ts`**

In `hotel.model.ts`, inside `hotelSchema`, after the `mapPoints` field definition and before the closing `}`, add:

```typescript
    settings: {
      offlineGuideEnabled: { type: Boolean, default: true },
    },
    features: {
      ordersEnabled: { type: Boolean, default: true },
      maintenanceEnabled: { type: Boolean, default: true },
      housekeepingEnabled: { type: Boolean, default: true },
    },
```

- [ ] **Step 3: Allow `settings` and `features` in Joi validation (`hotel.validation.ts`)**

In the `updateHotel` body schema, add after `mapPoints`:

```typescript
    settings: Joi.object({
      offlineGuideEnabled: Joi.boolean(),
    }),
    features: Joi.object({
      ordersEnabled: Joi.boolean(),
      maintenanceEnabled: Joi.boolean(),
      housekeepingEnabled: Joi.boolean(),
    }),
```

In the `createHotelBody` Record, add after `mapPoints`:

```typescript
  settings: Joi.object({
    offlineGuideEnabled: Joi.boolean(),
  }),
  features: Joi.object({
    ordersEnabled: Joi.boolean(),
    maintenanceEnabled: Joi.boolean(),
    housekeepingEnabled: Joi.boolean(),
  }),
```

- [ ] **Step 4: Commit**

```bash
git add infiora-backend-main/infiora-backend-main/src/modules/hotel/hotel.interfaces.ts \
        infiora-backend-main/infiora-backend-main/src/modules/hotel/hotel.model.ts \
        infiora-backend-main/infiora-backend-main/src/modules/hotel/hotel.validation.ts
git commit -m "feat(hotel): add settings.offlineGuideEnabled and features flags to hotel model"
```

---

### Task 2: App — Types, hide Download Guide in kiosk mode, respect offlineGuideEnabled

**Files:**
- Modify: `infiora-app-main/infiora-app-main/src/types/index.ts`
- Modify: `infiora-app-main/infiora-app-main/src/views/rooms/details/components/RoomView.tsx`

- [ ] **Step 1: Add `settings` and `features` to `IHotel` in app types**

In `infiora-app-main/infiora-app-main/src/types/index.ts`, find `export interface IHotel` and add fields after `activeUntil`:

```typescript
  settings?: {
    offlineGuideEnabled?: boolean;
  };
  features?: {
    ordersEnabled?: boolean;
    maintenanceEnabled?: boolean;
    housekeepingEnabled?: boolean;
  };
```

- [ ] **Step 2: Gate `DownloadGuideButton` in `RoomView.tsx`**

Find this block in `RoomView.tsx` (around line 448):

```tsx
            <DownloadGuideButton
              room={room}
              links={activeLinks}
              language={language}
            />
```

Replace with:

```tsx
            {!room.kioskMode && room.hotel.settings?.offlineGuideEnabled !== false && (
              <DownloadGuideButton
                room={room}
                links={activeLinks}
                language={language}
              />
            )}
```

- [ ] **Step 3: Commit**

```bash
git add infiora-app-main/infiora-app-main/src/types/index.ts \
        infiora-app-main/infiora-app-main/src/views/rooms/details/components/RoomView.tsx
git commit -m "feat(app): hide offline guide button in kiosk mode and when hotel disables it"
```

---

### Task 3: App — Track offline guide downloads

**Files:**
- Modify: `infiora-app-main/infiora-app-main/src/views/rooms/details/components/DownloadGuideButton.tsx`

- [ ] **Step 1: Add tracking to `DownloadGuideButton.tsx`**

Replace the entire file with:

```tsx
'use client';
import React, { useState } from 'react';
import { Button, CircularProgress, Box } from '@mui/material';
import { DownloadForOffline } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { isDesktop, isIOS } from 'react-device-detect';
import type { ILink, IRoom, ILanguage } from '@/types';
import { getDownloadLabel } from '@/utils/pdfGenerator';

const DEFAULT_ACCENT = '#1976d2';

interface DownloadGuideButtonProps {
  room: IRoom;
  links: ILink[];
  language: ILanguage | undefined;
}

const DownloadGuideButton: React.FC<DownloadGuideButtonProps> = ({
  room,
  links,
  language,
}) => {
  const [loading, setLoading] = useState(false);

  if (!language) return null;

  const trackDownload = async () => {
    try {
      const device = isDesktop ? 'Desktop' : isIOS ? 'iOS' : 'Android';
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
      const url = new URL(`${baseUrl}/v1/rooms/${room.id}`);
      url.search = new URLSearchParams({
        action: 'tap',
        button: 'offlineGuide',
        language: language.name,
        device,
      }).toString();
      await fetch(url.toString());
    } catch {
      // non-critical — don't block PDF generation
    }
  };

  const handleDownload = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await trackDownload();
      const { generateGuidePDF } = await import('@/utils/pdfGenerator');
      await generateGuidePDF(room, links, language);
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Could not generate PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box mx={5}>
      <Button
        variant="outlined"
        fullWidth
        disabled={loading}
        onClick={handleDownload}
        startIcon={
          loading ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            <DownloadForOffline />
          )
        }
        sx={{
          height: '36px',
          borderRadius: room.button?.borderRadius ?? '30px',
          color: room.button?.backgroundColor ?? DEFAULT_ACCENT,
          borderColor: room.button?.backgroundColor ?? DEFAULT_ACCENT,
          fontFamily: room.font?.family ?? 'inherit',
          textTransform: 'none',
          '&:hover': {
            borderColor: room.button?.backgroundColor ?? DEFAULT_ACCENT,
            backgroundColor: 'transparent',
          },
          '&.Mui-disabled': {
            opacity: 0.6,
          },
        }}
      >
        {getDownloadLabel(language.code)}
      </Button>
    </Box>
  );
};

export default DownloadGuideButton;
```

- [ ] **Step 2: Commit**

```bash
git add infiora-app-main/infiora-app-main/src/views/rooms/details/components/DownloadGuideButton.tsx
git commit -m "feat(app): track offline guide downloads as tap activity"
```

---

### Task 4: App — Fix PDF background image

**Files:**
- Modify: `infiora-app-main/infiora-app-main/src/utils/pdfGenerator.tsx`

- [ ] **Step 1: Add `bgImageDataUrl` to `PreProcessedData` interface**

Find:
```typescript
interface PreProcessedData {
  coverAddressQr: string | null;
  hotelLogoDataUrl: string | null;
  infiOraLogoDataUrl: string | null;
  processedLinks: ProcessedLink[];
}
```

Replace with:
```typescript
interface PreProcessedData {
  coverAddressQr: string | null;
  hotelLogoDataUrl: string | null;
  infiOraLogoDataUrl: string | null;
  bgImageDataUrl: string | null;
  processedLinks: ProcessedLink[];
}
```

- [ ] **Step 2: Fetch background image in `preProcess()`**

Find:
```typescript
  const [coverAddressQr, hotelLogoDataUrl, infiOraLogoDataUrl] = await Promise.all([
    room.hotel.map?.centerAddress
      ? safeQr(`https://maps.google.com/?q=${encodeURIComponent(room.hotel.map.centerAddress)}`)
      : Promise.resolve(null),
    room.hotel.image ? fetchAsDataUrl(proxyUrl(room.hotel.image, origin)) : Promise.resolve(null),
    fetchAsDataUrl(`${origin}/images/logo.png`),
  ]);
```

Replace with:
```typescript
  const [coverAddressQr, hotelLogoDataUrl, infiOraLogoDataUrl, bgImageDataUrl] = await Promise.all([
    room.hotel.map?.centerAddress
      ? safeQr(`https://maps.google.com/?q=${encodeURIComponent(room.hotel.map.centerAddress)}`)
      : Promise.resolve(null),
    room.hotel.image ? fetchAsDataUrl(proxyUrl(room.hotel.image, origin)) : Promise.resolve(null),
    fetchAsDataUrl(`${origin}/images/logo.png`),
    room.background?.type === 'image' && room.background?.image
      ? fetchAsDataUrl(proxyUrl(room.background.image, origin))
      : Promise.resolve(null),
  ]);
```

- [ ] **Step 3: Include `bgImageDataUrl` in the return of `preProcess()`**

Find:
```typescript
  return { coverAddressQr, hotelLogoDataUrl, infiOraLogoDataUrl, processedLinks };
```

Replace with:
```typescript
  return { coverAddressQr, hotelLogoDataUrl, infiOraLogoDataUrl, bgImageDataUrl, processedLinks };
```

- [ ] **Step 4: Add `PdfBgImage` component**

After the `PdfFooter` component definition, add:

```typescript
const PdfBgImage = ({ dataUrl }: { dataUrl: string | null }) => {
  if (!dataUrl) return null;
  return (
    <Image
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      src={dataUrl}
    />
  );
};
```

- [ ] **Step 5: Update `GuidePDF` to accept and render `bgImageDataUrl`**

Find the `GuidePDF` component props type:
```typescript
const GuidePDF = ({
  room, language, coverAddressQr, hotelLogoDataUrl, infiOraLogoDataUrl, processedLinks, S,
}: {
  room: IRoom;
  language: ILanguage;
  coverAddressQr: string | null;
  hotelLogoDataUrl: string | null;
  infiOraLogoDataUrl: string | null;
  processedLinks: ProcessedLink[];
  S: Styles;
}) => {
```

Replace with:
```typescript
const GuidePDF = ({
  room, language, coverAddressQr, hotelLogoDataUrl, infiOraLogoDataUrl, bgImageDataUrl, processedLinks, S,
}: {
  room: IRoom;
  language: ILanguage;
  coverAddressQr: string | null;
  hotelLogoDataUrl: string | null;
  infiOraLogoDataUrl: string | null;
  bgImageDataUrl: string | null;
  processedLinks: ProcessedLink[];
  S: Styles;
}) => {
```

Then find the Cover page:
```tsx
      {/* Cover */}
      <Page size="A4" style={S.page}>
        <View style={S.coverContainer}>
```

Replace with:
```tsx
      {/* Cover */}
      <Page size="A4" style={S.page}>
        <PdfBgImage dataUrl={bgImageDataUrl} />
        <View style={S.coverContainer}>
```

Then for every other `<Page` opening that renders content pages, add `<PdfBgImage dataUrl={bgImageDataUrl} />` as the first child. The pages are:
- wifi page: `<Page key={link.id} size="A4" style={S.page}>`
- link page: `<Page key={link.id} size="A4" style={S.page}>`
- text page: `<Page key={link.id} size="A4" style={S.page}>`
- blog page: `<Page key={\`${link.id}-${pi}\`} size="A4" style={S.page}>`
- group page: `<Page key={\`${link.id}-group\`} size="A4" style={S.page}>`

For each of these, find the opening `<Page` tag and the first child after it, and add `<PdfBgImage dataUrl={bgImageDataUrl} />` as the first child. For example, the wifi page:

Find:
```tsx
          return [
            <Page key={link.id} size="A4" style={S.page}>
              <PdfPageHeader title={link.title ?? ''} S={S} />
              <PdfWifiContent ssid={ssid} password={password} security={security} wifiQr={wifiQr} S={S} />
              <F />
            </Page>,
          ];
```

Replace with:
```tsx
          return [
            <Page key={link.id} size="A4" style={S.page}>
              <PdfBgImage dataUrl={bgImageDataUrl} />
              <PdfPageHeader title={link.title ?? ''} S={S} />
              <PdfWifiContent ssid={ssid} password={password} security={security} wifiQr={wifiQr} S={S} />
              <F />
            </Page>,
          ];
```

Apply the same pattern (adding `<PdfBgImage dataUrl={bgImageDataUrl} />` as first child) to the link page, text page, blog page, and group page.

- [ ] **Step 6: Pass `bgImageDataUrl` in `generateGuidePDF()`**

Find:
```typescript
  const doc = (
    <GuidePDF
      room={room}
      language={language}
      coverAddressQr={data.coverAddressQr}
      hotelLogoDataUrl={data.hotelLogoDataUrl}
      infiOraLogoDataUrl={data.infiOraLogoDataUrl}
      processedLinks={data.processedLinks}
      S={S}
    />
  );
```

Replace with:
```typescript
  const doc = (
    <GuidePDF
      room={room}
      language={language}
      coverAddressQr={data.coverAddressQr}
      hotelLogoDataUrl={data.hotelLogoDataUrl}
      infiOraLogoDataUrl={data.infiOraLogoDataUrl}
      bgImageDataUrl={data.bgImageDataUrl}
      processedLinks={data.processedLinks}
      S={S}
    />
  );
```

- [ ] **Step 7: Commit**

```bash
git add infiora-app-main/infiora-app-main/src/utils/pdfGenerator.tsx
git commit -m "fix(pdf): render background image in offline guide PDF"
```

---

### Task 5: Dashboard — Types + Guide Downloads KPI in OverviewTab

**Files:**
- Modify: `infiora-dash-main/infiora-dash-main/src/types/index.ts`
- Modify: `infiora-dash-main/infiora-dash-main/src/views/insights/components/OverviewTab.tsx`

- [ ] **Step 1: Add `settings` and `features` to `IHotel` in dashboard types**

In `infiora-dash-main/infiora-dash-main/src/types/index.ts`, find `export interface IHotel` (line 41) and add after `isActive`:

```typescript
  settings?: {
    offlineGuideEnabled?: boolean;
  };
  features?: {
    ordersEnabled?: boolean;
    maintenanceEnabled?: boolean;
    housekeepingEnabled?: boolean;
  };
```

- [ ] **Step 2: Add Guide Downloads KPI to `OverviewTab.tsx`**

In `OverviewTab.tsx`, find the `useMemo` for `globalAvgRating` and add after it:

```typescript
  const guideDownloads = useMemo(
    () => (insights.activities || []).filter((a: any) => a.details?.button === 'offlineGuide').length,
    [insights.activities]
  )
```

Then find the KPI Grid cards section. After the `Engaged Views` card:

```tsx
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard
            label='Engaged Views'
            ...
          />
        </Grid>
```

Add a new card after it:

```tsx
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard
            label='Guide Downloads'
            value={guideDownloads}
            color='info.main'
            sub='Offline PDF downloaded'
          />
        </Grid>
```

- [ ] **Step 3: Commit**

```bash
git add infiora-dash-main/infiora-dash-main/src/types/index.ts \
        infiora-dash-main/infiora-dash-main/src/views/insights/components/OverviewTab.tsx
git commit -m "feat(dash): add guide downloads KPI to analytics overview"
```

---

### Task 6: Dashboard — Offline guide toggle in EditHotelPage

**Files:**
- Modify: `infiora-dash-main/infiora-dash-main/src/views/hotels/pages/EditHotelPage.tsx`

- [ ] **Step 1: Add `offlineGuideEnabled` state and toggle to `EditHotelPage.tsx`**

Add these imports at the top of the file (with the existing MUI imports):

```typescript
import { FormControlLabel, Switch } from '@mui/material'
```

Add state after the existing state declarations (`const [map, setMap] = ...`):

```typescript
  const [offlineGuideEnabled, setOfflineGuideEnabled] = useState(
    hotel.settings?.offlineGuideEnabled !== false
  )
```

In `onSubmit`, find:
```typescript
      const updatedHotel = await updateHotel({
        id: hotel.id,
        hotel: { ...data, image, cover, map, mapPoints }
      }).unwrap()
```

Replace with:
```typescript
      const updatedHotel = await updateHotel({
        id: hotel.id,
        hotel: { ...data, image, cover, map, mapPoints, settings: { offlineGuideEnabled } }
      }).unwrap()
```

In the form, after the `<MapSettingsSection ... />` line and before the buttons Stack, add:

```tsx
              <Stack>
                <Typography variant='subtitle2' fontWeight={600} mb={1}>
                  Guest App Settings
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={offlineGuideEnabled}
                      onChange={(e) => setOfflineGuideEnabled(e.target.checked)}
                    />
                  }
                  label='Show offline guide download button'
                />
              </Stack>
```

- [ ] **Step 2: Commit**

```bash
git add infiora-dash-main/infiora-dash-main/src/views/hotels/pages/EditHotelPage.tsx
git commit -m "feat(dash): add offline guide enable/disable toggle to hotel settings"
```

---

### Task 7: Dashboard — FeatureLocked component and gated pages

**Files:**
- Create: `infiora-dash-main/infiora-dash-main/src/components/common/FeatureLocked.tsx`
- Modify: `infiora-dash-main/infiora-dash-main/src/views/orders/pages/OrdersPage.tsx`
- Modify: `infiora-dash-main/infiora-dash-main/src/views/housekeeping/pages/HousekeepingPage.tsx`
- Modify: `infiora-dash-main/infiora-dash-main/src/views/maintenance/pages/MaintenancePage.tsx`
- Modify: `infiora-dash-main/infiora-dash-main/src/components/layout/vertical/VerticalMenu.tsx`

- [ ] **Step 1: Create `FeatureLocked.tsx`**

Create file `infiora-dash-main/infiora-dash-main/src/components/common/FeatureLocked.tsx`:

```tsx
'use client'

import { Box, Button, Stack, Typography } from '@mui/material'
import { Lock } from '@mui/icons-material'

import useDialog from '@/@core/hooks/useDialog'
import RequestFeatureDialog from '@/views/support/components/RequestFeatureDialog'

interface FeatureLockedProps {
  featureName: string
}

export default function FeatureLocked({ featureName }: FeatureLockedProps) {
  const dialog = useDialog()

  return (
    <Box display='flex' justifyContent='center' alignItems='center' minHeight='60vh'>
      <Stack alignItems='center' gap={3} textAlign='center' maxWidth={420}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Lock sx={{ fontSize: 40, color: 'text.disabled' }} />
        </Box>
        <Stack gap={1}>
          <Typography variant='h5' fontWeight={600}>
            {featureName} is not active
          </Typography>
          <Typography color='text.secondary' variant='body2'>
            This feature is not included in your current plan. Contact us to activate it for your hotel.
          </Typography>
        </Stack>
        <Button variant='contained' onClick={dialog.open}>
          Contact us to activate
        </Button>
      </Stack>
      {dialog.isOpen && <RequestFeatureDialog onClose={dialog.close} />}
    </Box>
  )
}
```

- [ ] **Step 2: Gate `OrdersPage.tsx`**

In `infiora-dash-main/infiora-dash-main/src/views/orders/pages/OrdersPage.tsx`, add this import at the top:

```typescript
import FeatureLocked from '@/components/common/FeatureLocked'
```

After `if (!hotelId) { ... }` block and before `const currency = ...`, add:

```typescript
  if ((authUser.hotel as any)?.features?.ordersEnabled === false) {
    return <FeatureLocked featureName='Orders' />
  }
```

- [ ] **Step 3: Gate `HousekeepingPage.tsx`**

In `infiora-dash-main/infiora-dash-main/src/views/housekeeping/pages/HousekeepingPage.tsx`, add import:

```typescript
import FeatureLocked from '@/components/common/FeatureLocked'
```

After the line `const hotelId = (authUser as any)?.hotel?.id` and before the RTK Query calls, add:

```typescript
  if ((authUser as any)?.hotel?.features?.housekeepingEnabled === false) {
    return <FeatureLocked featureName='Housekeeping' />
  }
```

- [ ] **Step 4: Gate `MaintenancePage.tsx`**

In `infiora-dash-main/infiora-dash-main/src/views/maintenance/pages/MaintenancePage.tsx`, add import:

```typescript
import FeatureLocked from '@/components/common/FeatureLocked'
```

After the line where `hotelId` is extracted from `authUser`, add:

```typescript
  if ((authUser as any)?.hotel?.features?.maintenanceEnabled === false) {
    return <FeatureLocked featureName='Maintenance' />
  }
```

- [ ] **Step 5: Skip pending-count queries when feature disabled in `VerticalMenu.tsx`**

In `VerticalMenu.tsx`, find:
```typescript
  const { data: housekeepingPending } = useGetHousekeepingPendingCountQuery(hotelId, {
    skip: !hotelId,
    pollingInterval: 30000
  })

  const { data: maintenancePending } = useGetMaintenancePendingCountQuery(hotelId, {
    skip: !hotelId,
    pollingInterval: 30000
  })
```

Replace with:
```typescript
  const hotelFeatures = (authUser as any)?.hotel?.features

  const { data: housekeepingPending } = useGetHousekeepingPendingCountQuery(hotelId, {
    skip: !hotelId || hotelFeatures?.housekeepingEnabled === false,
    pollingInterval: 30000
  })

  const { data: maintenancePending } = useGetMaintenancePendingCountQuery(hotelId, {
    skip: !hotelId || hotelFeatures?.maintenanceEnabled === false,
    pollingInterval: 30000
  })
```

- [ ] **Step 6: Commit**

```bash
git add infiora-dash-main/infiora-dash-main/src/components/common/FeatureLocked.tsx \
        infiora-dash-main/infiora-dash-main/src/views/orders/pages/OrdersPage.tsx \
        infiora-dash-main/infiora-dash-main/src/views/housekeeping/pages/HousekeepingPage.tsx \
        infiora-dash-main/infiora-dash-main/src/views/maintenance/pages/MaintenancePage.tsx \
        infiora-dash-main/infiora-dash-main/src/components/layout/vertical/VerticalMenu.tsx
git commit -m "feat(dash): add feature lock overlay for orders/housekeeping/maintenance"
```

---

### Task 8: Dashboard — Support page redesign

**Files:**
- Modify: `infiora-dash-main/infiora-dash-main/src/views/support/Support.tsx`

- [ ] **Step 1: Rewrite `Support.tsx` with inline suggestion card**

Replace the entire file content with:

```tsx
'use client'

import { Mail, Lightbulb } from '@mui/icons-material'
import { Box, Button, Card, CardContent, CardHeader, Grid, Stack, Typography } from '@mui/material'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { toast } from 'react-toastify'
import { LoadingButton } from '@mui/lab'

import useDialog from '@/@core/hooks/useDialog'
import EmailDialog from './components/EmailDialog'
import InputField from '@/components/common/InputField'
import { useCreateTicketMutation } from '@/redux/api/ticketApi'
import { useDictionary } from '@/contexts/DictionaryContext'
import { stringRequiredMax255 } from '@/utils/validationSchemas'

const schema = yup.object().shape({
  message: stringRequiredMax255,
})

type FormData = yup.InferType<typeof schema>

const Support = () => {
  const dictionary = useDictionary()
  const emailDialog = useDialog()
  const [createTicket, { isLoading }] = useCreateTicketMutation()

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: yupResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      await createTicket({ ...data, subject: 'Feature Request', category: 'feature' }).unwrap()
      toast.success('Your suggestion has been sent. Thank you!')
      reset()
    } catch (error: any) {
      toast.error(error?.data?.message || error.message)
    }
  }

  return (
    <Stack gap={5}>
      <Typography variant='h4'>{dictionary.pages.support.howCanWeHelp}</Typography>

      <Grid container spacing={3}>
        {/* Contact Us */}
        <Grid item xs={12} md={6}>
          <Card variant='outlined' sx={{ height: '100%' }}>
            <CardHeader
              title={dictionary.pages.support.contactUs}
              subheader={dictionary.pages.support.teamAvailability}
            />
            <CardContent>
              <Stack direction='row' alignItems='center' gap={2}>
                <Mail color='primary' />
                <Stack flex={1}>
                  <Typography fontWeight='bold'>{dictionary.pages.support.emailTeam}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {dictionary.pages.support.averageResponseTime}
                  </Typography>
                </Stack>
                <Button variant='contained' size='small' onClick={emailDialog.open}>
                  {dictionary.sendEmail}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Suggestions */}
        <Grid item xs={12} md={6}>
          <Card variant='outlined' sx={{ height: '100%' }}>
            <CardHeader
              avatar={<Lightbulb color='warning' />}
              title={dictionary.pages.support.requestFeature}
              subheader='Share your ideas and help us improve the platform'
            />
            <CardContent>
              <form noValidate onSubmit={handleSubmit(onSubmit)}>
                <Stack gap={2}>
                  <InputField
                    name='message'
                    label={`${dictionary.message} *`}
                    control={control}
                    errors={errors}
                    multiline
                    minRows={4}
                  />
                  <Box>
                    <LoadingButton loading={isLoading} variant='contained' type='submit' disabled={isLoading}>
                      {dictionary.sendFeedback}
                    </LoadingButton>
                  </Box>
                </Stack>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {emailDialog.isOpen && <EmailDialog onClose={emailDialog.close} />}
    </Stack>
  )
}

export default Support
```

- [ ] **Step 2: Commit**

```bash
git add infiora-dash-main/infiora-dash-main/src/views/support/Support.tsx
git commit -m "feat(dash): redesign support page with inline suggestion card"
```

---

### Task 9: Admin — Types + HotelForm feature toggles

**Files:**
- Modify: `infiora-admin-main/infiora-admin-main/src/types/index.ts`
- Modify: `infiora-admin-main/infiora-admin-main/src/views/hotel/components/HotelForm.tsx`

- [ ] **Step 1: Add `features` to `IHotel` in admin types**

In `infiora-admin-main/infiora-admin-main/src/types/index.ts`, find `export interface IHotel` (line 42) and add after `isActive`:

```typescript
  features?: {
    ordersEnabled?: boolean;
    maintenanceEnabled?: boolean;
    housekeepingEnabled?: boolean;
  };
```

- [ ] **Step 2: Add feature toggles to `HotelForm.tsx`**

Add imports at the top of `HotelForm.tsx` (with the existing MUI imports):

```typescript
import { Divider, FormControlLabel, Switch } from '@mui/material';
```

Add state after the existing mutations:

```typescript
  const [features, setFeatures] = React.useState({
    ordersEnabled: hotel?.features?.ordersEnabled !== false,
    maintenanceEnabled: hotel?.features?.maintenanceEnabled !== false,
    housekeepingEnabled: hotel?.features?.housekeepingEnabled !== false,
  });
```

Note: `React` needs to be imported — add `import React from 'react';` if not already present (check file imports; currently it uses `useForm` from react-hook-form but doesn't import React directly for hooks — add it).

In `onSubmit`, find:
```typescript
      const body = { ...data };
      if (hotel) {
        await updateHotel({
          id: hotel.id,
          hotel: body,
        }).unwrap();
```

Replace with:
```typescript
      const body = { ...data, features };
      if (hotel) {
        await updateHotel({
          id: hotel.id,
          hotel: body,
        }).unwrap();
```

In the JSX form, after the note `InputField` and before the Save button `Grid item`, add:

```tsx
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <Typography variant='subtitle2' fontWeight={600} mb={2}>
            Feature Access
          </Typography>
          <Stack gap={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={features.ordersEnabled}
                  onChange={(e) => setFeatures((f) => ({ ...f, ordersEnabled: e.target.checked }))}
                />
              }
              label='Orders (Room Service)'
            />
            <FormControlLabel
              control={
                <Switch
                  checked={features.housekeepingEnabled}
                  onChange={(e) => setFeatures((f) => ({ ...f, housekeepingEnabled: e.target.checked }))}
                />
              }
              label='Housekeeping'
            />
            <FormControlLabel
              control={
                <Switch
                  checked={features.maintenanceEnabled}
                  onChange={(e) => setFeatures((f) => ({ ...f, maintenanceEnabled: e.target.checked }))}
                />
              }
              label='Maintenance'
            />
          </Stack>
        </Grid>
```

- [ ] **Step 3: Commit**

```bash
git add infiora-admin-main/infiora-admin-main/src/types/index.ts \
        infiora-admin-main/infiora-admin-main/src/views/hotel/components/HotelForm.tsx
git commit -m "feat(admin): add orders/housekeeping/maintenance feature toggles to hotel form"
```

---

### Task 10: Admin — Guide Downloads KPI in HotelInsights

**Files:**
- Modify: `infiora-admin-main/infiora-admin-main/src/views/hotel/components/HotelInsights.tsx`

- [ ] **Step 1: Add `guideDownloads` computed value in `OverviewContent`**

In `HotelInsights.tsx`, find the `OverviewContent` function. Find the `globalAvgRating` useMemo and add after it:

```typescript
  const guideDownloads = useMemo(
    () => (insights.activities || []).filter((a: any) => a.details?.button === 'offlineGuide').length,
    [insights.activities]
  );
```

- [ ] **Step 2: Add Guide Downloads KPI card**

In the KPI Grid section of `OverviewContent`, after the `Avg Guest Rating` card, add:

```tsx
        <Grid item xs={6} sm={4} md={3}>
          <StatKpiCard
            label="Guide Downloads"
            value={guideDownloads}
            sub="Offline PDF"
            color="info.main"
          />
        </Grid>
```

- [ ] **Step 3: Commit**

```bash
git add infiora-admin-main/infiora-admin-main/src/views/hotel/components/HotelInsights.tsx
git commit -m "feat(admin): add guide downloads KPI to hotel insights overview"
```

---

## Self-Review

### Spec coverage check
| Requirement | Task |
|-------------|------|
| Track guide downloads in dashboard analytics | Tasks 3, 5 |
| Track guide downloads in admin analytics | Tasks 3, 10 |
| PDF background image fix | Task 4 |
| Hide Download Guide in kiosk mode | Task 2 |
| Hotel setting to enable/disable offline guide | Tasks 1, 2, 6 |
| Superadmin feature toggles (orders/maintenance/housekeeping) | Tasks 1, 9 |
| Dashboard lock screen when feature disabled | Task 7 |
| Support page redesign | Task 8 |

### Consistency check
- `features.ordersEnabled / housekeepingEnabled / maintenanceEnabled` — names consistent across backend model, interfaces, admin form, dash gate checks ✓
- `settings.offlineGuideEnabled` — consistent across backend, app types, dash types, EditHotelPage toggle, RoomView gate ✓
- `details.button === 'offlineGuide'` — set in DownloadGuideButton tracking call, read in OverviewTab + HotelInsights ✓
- `bgImageDataUrl` — PreProcessedData, preProcess return, GuidePDF props, generateGuidePDF call ✓
