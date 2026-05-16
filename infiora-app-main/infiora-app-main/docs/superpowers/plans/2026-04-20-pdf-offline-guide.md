# Offline PDF Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a download button to the guest app that generates a complete offline PDF guide of the hotel, using already-translated in-memory data with zero extra API calls.

**Architecture:** `@react-pdf/renderer` runs entirely client-side. A `preProcess` step pre-fetches all images as base64 data URLs and generates QR codes as PNG data URLs so react-pdf never makes network calls during render. The PDF is built from translated `room` + `links` data already cached in `RoomContext`.

**Tech Stack:** `@react-pdf/renderer` ^3, `qrcode` + `@types/qrcode`, Next.js 14 App Router, TypeScript, MUI v5.

---

### Task 1: Install dependencies and update next.config.mjs

**Files:**
- Modify: `infiora-app-main/package.json`
- Modify: `infiora-app-main/next.config.mjs`

- [ ] **Step 1: Install packages**

```bash
cd C:/Users/Tudor/infiora/infiora-app-main/infiora-app-main
npm install @react-pdf/renderer@^3 qrcode @types/qrcode
```

Expected: packages added to `node_modules`, `package-lock.json` updated.

- [ ] **Step 2: Add serverExternalPackages to next.config.mjs**

Current file content:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [ ... ],
  },
};
export default nextConfig;
```

Replace with:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@react-pdf/renderer', 'qrcode'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'infiora-bucket.s3.eu-north-1.amazonaws.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
        pathname: '**',
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 3: Verify TypeScript sees the qrcode types**

```bash
cd C:/Users/Tudor/infiora/infiora-app-main/infiora-app-main
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors (or only pre-existing errors unrelated to qrcode).

- [ ] **Step 4: Commit**

```bash
cd C:/Users/Tudor/infiora/infiora-app-main/infiora-app-main
git add package.json package-lock.json next.config.mjs
git commit -m "feat: install @react-pdf/renderer and qrcode for offline PDF guide"
```

---

### Task 2: Create `src/utils/pdfGenerator.tsx`

This is the core file. It exports `generateGuidePDF` (called on button click) and `getDownloadLabel` (used by the button to show translated label).

**Files:**
- Create: `src/utils/pdfGenerator.tsx`

- [ ] **Step 1: Create the file with full content**

```tsx
// src/utils/pdfGenerator.tsx
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import QRCode from 'qrcode';
import type { ILink, IItem, IRoom, ILanguage, ISection } from '@/types';
import { reorderLinks } from '@/utils/arrayUtils';

// ── Constants ────────────────────────────────────────────────────────────────

const SKIPPED_TYPES = new Set(['order', 'housekeeping', 'maintenance']);
const SECTIONS_PER_PAGE = 4;
const MAX_IMAGES = 4;
const CONTENT_WIDTH = 535; // A4 (595pt) minus 30pt margins on each side

// ── Download button label map ─────────────────────────────────────────────────
// UI string — not hotel content, not in the AI translation dictionary.

export const DOWNLOAD_LABELS: Record<string, string> = {
  en: 'Download offline guide',
  hr: 'Preuzmi offline vodič',
  bs: 'Preuzmi offline vodič',
  sr: 'Preuzmi offline vodič',
  de: 'Offline-Guide herunterladen',
  fr: 'Télécharger le guide hors ligne',
  it: 'Scarica la guida offline',
  es: 'Descargar guía sin conexión',
  pt: 'Baixar guia offline',
  nl: 'Offline gids downloaden',
  pl: 'Pobierz przewodnik offline',
  ru: 'Скачать офлайн-гид',
  cs: 'Stáhnout offline průvodce',
  sk: 'Stiahnuť offline sprievodcu',
  sl: 'Prenesi offline vodič',
  ro: 'Descarcă ghidul offline',
  hu: 'Offline útmutató letöltése',
  tr: 'Çevrimdışı rehberi indir',
  sv: 'Ladda ner offline-guide',
  da: 'Download offline guide',
  fi: 'Lataa offline-opas',
  nb: 'Last ned offline-guide',
  ar: 'تحميل الدليل بدون إنترنت',
  zh: '下载离线指南',
  ja: 'オフラインガイドをダウンロード',
  ko: '오프라인 가이드 다운로드',
};

export function getDownloadLabel(langCode: string): string {
  return DOWNLOAD_LABELS[langCode] ?? DOWNLOAD_LABELS.en;
}

// ── Internal types ────────────────────────────────────────────────────────────

interface ProcessedSection extends ISection {
  sectionNumber: number;
  validImages: string[];   // base64 data URLs, max MAX_IMAGES
  addressQr: string | null;
  phoneQr: string | null;
}

interface ProcessedGroupItem {
  item: IItem;
  linkQr: string | null;
  wifiQr: string | null;
}

interface ProcessedLink {
  link: ILink;
  blogPages: ProcessedSection[][];  // chunked into pages of SECTIONS_PER_PAGE
  linkQr: string | null;
  wifiQr: string | null;
  groupItems: ProcessedGroupItem[];
}

interface PreProcessedData {
  coverAddressQr: string | null;
  hotelLogoDataUrl: string | null;
  infiOraLogoDataUrl: string | null;
  processedLinks: ProcessedLink[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function safeQr(value: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 200,
    });
  } catch {
    return null;
  }
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function getValidImages(images: string[] | undefined): Promise<string[]> {
  if (!images || images.length === 0) return [];
  // Try up to MAX_IMAGES*3 candidates to find MAX_IMAGES that load successfully
  const candidates = images.slice(0, MAX_IMAGES * 3);
  const results = await Promise.allSettled(candidates.map(fetchImageAsDataUrl));
  return results
    .filter(
      (r): r is PromiseFulfilledResult<string> =>
        r.status === 'fulfilled' && r.value !== null
    )
    .map((r) => r.value)
    .slice(0, MAX_IMAGES);
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function stripHtml(str?: string): string {
  return (str ?? '').replace(/<[^>]*>/g, '').trim();
}

function imageWidthForCount(count: number): number {
  const gap = 4;
  switch (count) {
    case 4: return (CONTENT_WIDTH - gap * 3) / 4;
    case 3: return CONTENT_WIDTH * 0.28;
    case 2: return CONTENT_WIDTH * 0.34;
    case 1: return CONTENT_WIDTH * 0.52;
    default: return CONTENT_WIDTH * 0.25;
  }
}

// ── Styles factory ────────────────────────────────────────────────────────────
// Called once per PDF with the room's color settings.

function createStyles(bgColor: string, fontColor: string, accentColor: string) {
  return StyleSheet.create({
    page: {
      backgroundColor: bgColor,
      paddingHorizontal: 30,
      paddingTop: 30,
      paddingBottom: 50,
    },
    // Footer
    footer: {
      position: 'absolute',
      bottom: 12,
      left: 30,
      right: 30,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    footerText: { fontSize: 7, color: fontColor, opacity: 0.55 },
    footerLogo: { width: 44, height: 15 },
    // Cover
    coverContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    hotelLogo: { width: 80, height: 80, borderRadius: 40 },
    hotelName: {
      fontSize: 22,
      fontFamily: 'Helvetica-Bold',
      color: fontColor,
      textAlign: 'center',
    },
    hotelDesc: { fontSize: 10, color: fontColor, textAlign: 'center', opacity: 0.7 },
    coverQr: { width: 110, height: 110 },
    coverQrLabel: { fontSize: 8, color: fontColor, textAlign: 'center', opacity: 0.55 },
    // Page header
    pageTitle: {
      fontSize: 16,
      fontFamily: 'Helvetica-Bold',
      color: fontColor,
      marginBottom: 8,
    },
    divider: {
      height: 1,
      backgroundColor: fontColor,
      opacity: 0.15,
      marginBottom: 10,
    },
    // Blog sections
    sectionTitle: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: fontColor,
      marginBottom: 3,
    },
    sectionDesc: {
      fontSize: 8,
      color: fontColor,
      opacity: 0.75,
      lineHeight: 1.4,
      marginBottom: 3,
    },
    imagesRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 4,
      marginBottom: 4,
    },
    sectionSep: {
      height: 1,
      backgroundColor: fontColor,
      opacity: 0.1,
      marginVertical: 6,
    },
    qrRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      marginTop: 2,
      marginBottom: 6,
    },
    qrSmall: { width: 30, height: 30 },
    qrLabel: { fontSize: 7, color: fontColor, opacity: 0.5 },
    // WiFi
    wifiFieldLabel: { fontSize: 7, color: fontColor, opacity: 0.5, letterSpacing: 1 },
    wifiFieldValue: {
      fontSize: 13,
      fontFamily: 'Courier',
      color: fontColor,
      marginBottom: 10,
    },
    wifiQrRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginTop: 16,
    },
    qrLarge: { width: 120, height: 120 },
    wifiQrLabel: { fontSize: 9, color: fontColor, opacity: 0.6, flex: 1, lineHeight: 1.5 },
    // Link type
    linkInstruction: {
      fontSize: 10,
      color: fontColor,
      opacity: 0.65,
      marginBottom: 24,
      lineHeight: 1.5,
    },
    linkQrContainer: { alignItems: 'center', gap: 8 },
    linkScanLabel: { fontSize: 9, color: fontColor, opacity: 0.55 },
    linkUrlBox: {
      marginTop: 14,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: fontColor,
      borderRadius: 4,
      opacity: 0.5,
    },
    linkUrlLabel: { fontSize: 7, color: fontColor, letterSpacing: 1, marginBottom: 2 },
    linkUrlValue: { fontSize: 8, color: accentColor },
    // Text type
    textContent: { fontSize: 9, color: fontColor, lineHeight: 1.6 },
    // Group — breadcrumb
    breadcrumb: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: accentColor,
      borderRadius: 3,
    },
    breadcrumbParent: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
    breadcrumbSep: { fontSize: 7, color: '#ffffff', opacity: 0.6 },
    breadcrumbChild: { fontSize: 7, color: '#ffffff', opacity: 0.85 },
    // Group — index page items
    groupItem: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 4,
      borderLeftWidth: 3,
      borderLeftColor: accentColor,
      borderLeftStyle: 'solid',
    },
    groupItemTitle: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: fontColor,
      marginBottom: 1,
    },
    groupItemType: { fontSize: 7, color: fontColor, opacity: 0.4, marginBottom: 2 },
    groupItemPreview: { fontSize: 8, color: fontColor, opacity: 0.6 },
  });
}

type Styles = ReturnType<typeof createStyles>;

// ── Pre-processor ─────────────────────────────────────────────────────────────
// Fetches all images and generates all QR codes before PDF render.
// After this step, no network calls happen during PDF generation.

async function preProcess(room: IRoom, links: ILink[]): Promise<PreProcessedData> {
  const activeLinks = reorderLinks(room, links).filter(
    (l) => l.isActive && !SKIPPED_TYPES.has(l.type)
  );

  const [coverAddressQr, hotelLogoDataUrl, infiOraLogoDataUrl] = await Promise.all([
    room.hotel.map?.centerAddress
      ? safeQr(
          `https://maps.google.com/?q=${encodeURIComponent(room.hotel.map.centerAddress)}`
        )
      : Promise.resolve(null),
    room.hotel.image ? fetchImageAsDataUrl(room.hotel.image) : Promise.resolve(null),
    fetchImageAsDataUrl(`${window.location.origin}/images/logo.png`),
  ]);

  const processedLinks: ProcessedLink[] = await Promise.all(
    activeLinks.map(async (link) => {
      let blogPages: ProcessedSection[][] = [];
      let linkQr: string | null = null;
      let wifiQr: string | null = null;
      let groupItems: ProcessedGroupItem[] = [];

      if (link.type === 'blog' && link.sections?.length) {
        let num = 1;
        const allSections: ProcessedSection[] = await Promise.all(
          link.sections.map(async (s) => {
            const [validImages, addressQr, phoneQr] = await Promise.all([
              getValidImages(s.images),
              s.address
                ? safeQr(
                    `https://maps.google.com/?q=${encodeURIComponent(s.address)}`
                  )
                : Promise.resolve(null),
              s.phone ? safeQr(`tel:${s.phone}`) : Promise.resolve(null),
            ]);
            return {
              ...s,
              sectionNumber: num++,
              validImages,
              addressQr,
              phoneQr,
            };
          })
        );
        blogPages = chunkArray(allSections, SECTIONS_PER_PAGE);
      }

      if (link.type === 'link' && link.value) {
        linkQr = await safeQr(link.value);
      }

      if (link.type === 'wifi' && link.data) {
        const { ssid, password, security = 'WPA' } = link.data as {
          ssid: string;
          password: string;
          security?: string;
        };
        wifiQr = await safeQr(`WIFI:T:${security};S:${ssid};P:${password};;`);
      }

      if (link.type === 'group' && link.items?.length) {
        groupItems = await Promise.all(
          link.items.map(async (item) => {
            let itemLinkQr: string | null = null;
            let itemWifiQr: string | null = null;
            if (item.type === 'link' && item.value) {
              itemLinkQr = await safeQr(item.value);
            }
            if (item.type === 'wifi' && item.data) {
              const { ssid, password, security = 'WPA' } = item.data as {
                ssid: string;
                password: string;
                security?: string;
              };
              itemWifiQr = await safeQr(`WIFI:T:${security};S:${ssid};P:${password};;`);
            }
            return { item, linkQr: itemLinkQr, wifiQr: itemWifiQr };
          })
        );
      }

      return { link, blogPages, linkQr, wifiQr, groupItems };
    })
  );

  return { coverAddressQr, hotelLogoDataUrl, infiOraLogoDataUrl, processedLinks };
}

// ── PDF sub-components ────────────────────────────────────────────────────────

const PdfFooter = ({
  hotelName,
  languageName,
  logoDataUrl,
  S,
}: {
  hotelName: string;
  languageName: string;
  logoDataUrl: string | null;
  S: Styles;
}) => (
  <View style={S.footer} fixed>
    <Text style={S.footerText}>
      {hotelName} · {languageName} · Powered by
    </Text>
    {logoDataUrl && <Image style={S.footerLogo} src={logoDataUrl} />}
  </View>
);

const PdfPageHeader = ({ title, S }: { title: string; S: Styles }) => (
  <>
    <Text style={S.pageTitle}>{title}</Text>
    <View style={S.divider} />
  </>
);

const PdfSectionImages = ({ images, S }: { images: string[]; S: Styles }) => {
  if (!images.length) return null;
  const w = imageWidthForCount(images.length);
  return (
    <View style={S.imagesRow}>
      {images.map((src, i) => (
        <Image key={i} style={{ width: w, height: 55, borderRadius: 3 }} src={src} />
      ))}
    </View>
  );
};

const PdfSectionQrs = ({
  section,
  S,
}: {
  section: ProcessedSection;
  S: Styles;
}) => {
  if (!section.addressQr && !section.phoneQr) return null;
  return (
    <View style={S.qrRow}>
      {section.addressQr && (
        <>
          <Image style={S.qrSmall} src={section.addressQr} />
          <Text style={S.qrLabel}>Directions</Text>
        </>
      )}
      {section.phoneQr && (
        <>
          <Image style={S.qrSmall} src={section.phoneQr} />
          <Text style={S.qrLabel}>Call</Text>
        </>
      )}
    </View>
  );
};

const PdfBreadcrumb = ({
  parent,
  child,
  S,
}: {
  parent: string;
  child: string;
  S: Styles;
}) => (
  <View style={S.breadcrumb}>
    <Text style={S.breadcrumbParent}>{parent}</Text>
    <Text style={S.breadcrumbSep}> › </Text>
    <Text style={S.breadcrumbChild}>{child}</Text>
  </View>
);

// ── PDF Document component ─────────────────────────────────────────────────────

const GuidePDF = ({
  room,
  language,
  coverAddressQr,
  hotelLogoDataUrl,
  infiOraLogoDataUrl,
  processedLinks,
}: {
  room: IRoom;
  language: ILanguage;
  coverAddressQr: string | null;
  hotelLogoDataUrl: string | null;
  infiOraLogoDataUrl: string | null;
  processedLinks: ProcessedLink[];
}) => {
  const bgColor = room.background?.color ?? '#ffffff';
  const fontColor = room.font?.color ?? '#000000';
  const accentColor = room.button?.backgroundColor ?? '#1976d2';
  const S = createStyles(bgColor, fontColor, accentColor);
  const hotelName = room.hotel.name ?? '';

  const F = () => (
    <PdfFooter
      hotelName={hotelName}
      languageName={language.name}
      logoDataUrl={infiOraLogoDataUrl}
      S={S}
    />
  );

  return (
    <Document>
      {/* ── Cover page ── */}
      <Page size="A4" style={S.page}>
        <View style={S.coverContainer}>
          {hotelLogoDataUrl && (
            <Image style={S.hotelLogo} src={hotelLogoDataUrl} />
          )}
          <Text style={S.hotelName}>{hotelName}</Text>
          {room.description && (
            <Text style={S.hotelDesc}>{room.description}</Text>
          )}
          {coverAddressQr && (
            <>
              <Image style={S.coverQr} src={coverAddressQr} />
              <Text style={S.coverQrLabel}>Scan to find us on Google Maps</Text>
            </>
          )}
        </View>
        <F />
      </Page>

      {/* ── One page (or more) per active link ── */}
      {processedLinks.flatMap(
        ({ link, blogPages, linkQr, wifiQr, groupItems }) => {
          // ── WiFi ──
          if (link.type === 'wifi') {
            const { ssid = '', password = '', security } = (link.data ?? {}) as {
              ssid?: string;
              password?: string;
              security?: string;
            };
            return [
              <Page key={link.id} size="A4" style={S.page}>
                <PdfPageHeader title={link.title ?? ''} S={S} />
                <Text style={S.wifiFieldLabel}>Network (SSID)</Text>
                <Text style={S.wifiFieldValue}>{ssid}</Text>
                <Text style={S.wifiFieldLabel}>Password</Text>
                <Text style={S.wifiFieldValue}>{password}</Text>
                {security && (
                  <>
                    <Text style={S.wifiFieldLabel}>Security</Text>
                    <Text style={S.wifiFieldValue}>{security}</Text>
                  </>
                )}
                {wifiQr && (
                  <View style={S.wifiQrRow}>
                    <Image style={S.qrLarge} src={wifiQr} />
                    <Text style={S.wifiQrLabel}>
                      Scan with your phone camera to connect automatically — no typing needed
                    </Text>
                  </View>
                )}
                <F />
              </Page>,
            ];
          }

          // ── External link ──
          if (link.type === 'link') {
            return [
              <Page key={link.id} size="A4" style={S.page}>
                <PdfPageHeader title={link.title ?? ''} S={S} />
                <Text style={S.linkInstruction}>
                  Scan the QR code below to open this link on your device when you have internet.
                </Text>
                {linkQr && (
                  <View style={S.linkQrContainer}>
                    <Image style={S.qrLarge} src={linkQr} />
                    <Text style={S.linkScanLabel}>Scan to open in browser</Text>
                    <View style={S.linkUrlBox}>
                      <Text style={S.linkUrlLabel}>Or type manually</Text>
                      <Text style={S.linkUrlValue}>{link.value}</Text>
                    </View>
                  </View>
                )}
                <F />
              </Page>,
            ];
          }

          // ── Text / Info ──
          if (link.type === 'text') {
            return [
              <Page key={link.id} size="A4" style={S.page}>
                <PdfPageHeader title={link.title ?? ''} S={S} />
                <Text style={S.textContent}>{stripHtml(link.value)}</Text>
                <F />
              </Page>,
            ];
          }

          // ── Blog (activities, restaurants, etc.) ──
          if (link.type === 'blog') {
            return blogPages.map((pageSections, pi) => (
              <Page key={`${link.id}-${pi}`} size="A4" style={S.page}>
                <PdfPageHeader title={link.title ?? ''} S={S} />
                {pageSections.map((section, si) => (
                  <View key={section.id}>
                    <Text style={S.sectionTitle}>
                      {section.sectionNumber}. {section.title}
                    </Text>
                    <PdfSectionImages images={section.validImages} S={S} />
                    {section.description && (
                      <Text style={S.sectionDesc}>
                        {stripHtml(section.description)}
                      </Text>
                    )}
                    <PdfSectionQrs section={section} S={S} />
                    {si < pageSections.length - 1 && (
                      <View style={S.sectionSep} />
                    )}
                  </View>
                ))}
                <F />
              </Page>
            ));
          }

          // ── Group ──
          if (link.type === 'group') {
            const pages: React.ReactElement[] = [];

            // Index page listing all sub-items
            pages.push(
              <Page key={`${link.id}-index`} size="A4" style={S.page}>
                <PdfPageHeader title={link.title ?? ''} S={S} />
                {link.items.map((item) => (
                  <View key={item.id} style={S.groupItem}>
                    <Text style={S.groupItemTitle}>{item.title}</Text>
                    <Text style={S.groupItemType}>{item.type}</Text>
                    <Text style={S.groupItemPreview}>
                      {typeof item.value === 'string'
                        ? stripHtml(item.value).slice(0, 120)
                        : ''}
                    </Text>
                  </View>
                ))}
                <F />
              </Page>
            );

            // One page per sub-item
            groupItems.forEach(({ item, linkQr: iLinkQr, wifiQr: iWifiQr }) => {
              const groupTitle = link.title ?? '';

              if (item.type === 'link') {
                pages.push(
                  <Page key={`${link.id}-${item.id}`} size="A4" style={S.page}>
                    <PdfPageHeader title={groupTitle} S={S} />
                    <PdfBreadcrumb parent={groupTitle} child={item.title} S={S} />
                    <View style={S.divider} />
                    <Text style={S.linkInstruction}>
                      Scan the QR code below to open this link on your device.
                    </Text>
                    {iLinkQr && (
                      <View style={S.linkQrContainer}>
                        <Image style={S.qrLarge} src={iLinkQr} />
                        <Text style={S.linkScanLabel}>Scan to open in browser</Text>
                        <View style={S.linkUrlBox}>
                          <Text style={S.linkUrlLabel}>Or type manually</Text>
                          <Text style={S.linkUrlValue}>{item.value}</Text>
                        </View>
                      </View>
                    )}
                    <F />
                  </Page>
                );
              } else if (item.type === 'text') {
                pages.push(
                  <Page key={`${link.id}-${item.id}`} size="A4" style={S.page}>
                    <PdfPageHeader title={groupTitle} S={S} />
                    <PdfBreadcrumb parent={groupTitle} child={item.title} S={S} />
                    <View style={S.divider} />
                    <Text style={S.textContent}>{stripHtml(item.value)}</Text>
                    <F />
                  </Page>
                );
              } else if (item.type === 'wifi') {
                const {
                  ssid = '',
                  password = '',
                  security,
                } = (item.data ?? {}) as {
                  ssid?: string;
                  password?: string;
                  security?: string;
                };
                pages.push(
                  <Page key={`${link.id}-${item.id}`} size="A4" style={S.page}>
                    <PdfPageHeader title={groupTitle} S={S} />
                    <PdfBreadcrumb parent={groupTitle} child={item.title} S={S} />
                    <View style={S.divider} />
                    <Text style={S.wifiFieldLabel}>Network (SSID)</Text>
                    <Text style={S.wifiFieldValue}>{ssid}</Text>
                    <Text style={S.wifiFieldLabel}>Password</Text>
                    <Text style={S.wifiFieldValue}>{password}</Text>
                    {security && (
                      <>
                        <Text style={S.wifiFieldLabel}>Security</Text>
                        <Text style={S.wifiFieldValue}>{security}</Text>
                      </>
                    )}
                    {iWifiQr && (
                      <View style={S.wifiQrRow}>
                        <Image style={S.qrLarge} src={iWifiQr} />
                        <Text style={S.wifiQrLabel}>
                          Scan with camera to connect automatically
                        </Text>
                      </View>
                    )}
                    <F />
                  </Page>
                );
              }
            });

            return pages;
          }

          return [];
        }
      )}
    </Document>
  );
};

// ── Public export ─────────────────────────────────────────────────────────────

export async function generateGuidePDF(
  room: IRoom,
  links: ILink[],
  language: ILanguage
): Promise<void> {
  const data = await preProcess(room, links);

  const doc = (
    <GuidePDF
      room={room}
      language={language}
      coverAddressQr={data.coverAddressQr}
      hotelLogoDataUrl={data.hotelLogoDataUrl}
      infiOraLogoDataUrl={data.infiOraLogoDataUrl}
      processedLinks={data.processedLinks}
    />
  );

  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(room.hotel.name ?? 'guide')
    .replace(/\s+/g, '-')
    .toLowerCase()}-guide.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd C:/Users/Tudor/infiora/infiora-app-main/infiora-app-main
npx tsc --noEmit 2>&1
```

Expected: no errors in `src/utils/pdfGenerator.tsx`. Fix any type errors before continuing.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/Tudor/infiora/infiora-app-main/infiora-app-main
git add src/utils/pdfGenerator.tsx
git commit -m "feat: add PDF guide generator with react-pdf"
```

---

### Task 3: Create `DownloadGuideButton.tsx`

**Files:**
- Create: `src/views/rooms/details/components/DownloadGuideButton.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/views/rooms/details/components/DownloadGuideButton.tsx
'use client';
import React, { useState } from 'react';
import { Button, CircularProgress, Stack } from '@mui/material';
import { DownloadForOffline } from '@mui/icons-material';
import type { ILink, IRoom, ILanguage } from '@/types';
import { getDownloadLabel } from '@/utils/pdfGenerator';

interface DownloadGuideButtonProps {
  room: IRoom;
  links: ILink[];
  language: ILanguage;
}

const DownloadGuideButton: React.FC<DownloadGuideButtonProps> = ({
  room,
  links,
  language,
}) => {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Dynamic import keeps @react-pdf/renderer out of the SSR bundle
      const { generateGuidePDF } = await import('@/utils/pdfGenerator');
      await generateGuidePDF(room, links, language);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack mx={5}>
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
          color: room.button?.backgroundColor ?? '#1976d2',
          borderColor: room.button?.backgroundColor ?? '#1976d2',
          fontFamily: room.font?.family,
          textTransform: 'none',
          '&:hover': {
            borderColor: room.button?.backgroundColor ?? '#1976d2',
            backgroundColor: 'transparent',
          },
          '&.Mui-disabled': {
            opacity: 0.6,
          },
        }}
      >
        {loading ? '...' : getDownloadLabel(language.code)}
      </Button>
    </Stack>
  );
};

export default DownloadGuideButton;
```

- [ ] **Step 2: TypeScript check**

```bash
cd C:/Users/Tudor/infiora/infiora-app-main/infiora-app-main
npx tsc --noEmit 2>&1
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/Tudor/infiora/infiora-app-main/infiora-app-main
git add src/views/rooms/details/components/DownloadGuideButton.tsx
git commit -m "feat: add DownloadGuideButton component"
```

---

### Task 4: Wire `DownloadGuideButton` into `RoomView.tsx`

**Files:**
- Modify: `src/views/rooms/details/components/RoomView.tsx`

The button goes directly after `<RoomMapSection ... />`, still inside the centered `<Stack>` that contains all the page content.

- [ ] **Step 1: Add the import**

In `RoomView.tsx`, add to the existing imports block:

```tsx
import DownloadGuideButton from "./DownloadGuideButton";
```

- [ ] **Step 2: Add the button after `<RoomMapSection>`**

Find this block in `RoomView.tsx` (around line 429–447):

```tsx
            <RoomMapSection
              room={room}
              links={activeLinks}
              focusMarkerId={focusedMapMarkerId}
              onReadMore={(linkedLinkId, linkedSectionId) => {
                const targetLink = activeLinks
                  .find((link) => link.id === linkedLinkId);

                if (!targetLink) return;

                blogDialog.open({
                  data: {
                    ...targetLink,
                    __targetSectionId: linkedSectionId,
                  } as any,
                });
              }}
            />
```

Add `<DownloadGuideButton>` immediately after the closing `/>` of `<RoomMapSection>`:

```tsx
            <RoomMapSection
              room={room}
              links={activeLinks}
              focusMarkerId={focusedMapMarkerId}
              onReadMore={(linkedLinkId, linkedSectionId) => {
                const targetLink = activeLinks
                  .find((link) => link.id === linkedLinkId);

                if (!targetLink) return;

                blogDialog.open({
                  data: {
                    ...targetLink,
                    __targetSectionId: linkedSectionId,
                  } as any,
                });
              }}
            />
            <DownloadGuideButton
              room={room}
              links={activeLinks}
              language={language}
            />
```

- [ ] **Step 3: TypeScript check**

```bash
cd C:/Users/Tudor/infiora/infiora-app-main/infiora-app-main
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/Tudor/infiora/infiora-app-main/infiora-app-main
git add src/views/rooms/details/components/RoomView.tsx
git commit -m "feat: add offline PDF download button below map in RoomView"
```

---

### Task 5: Manual testing

- [ ] **Step 1: Start dev server**

```bash
cd C:/Users/Tudor/infiora/infiora-app-main/infiora-app-main
npm run dev
```

Open a room page in the browser (e.g. `http://localhost:4002/<room-id>`).

- [ ] **Step 2: Verify button appears**

Scroll below the map. Confirm the "Download offline guide" button (or translated equivalent) appears — smaller than other buttons, outlined style, with download icon.

- [ ] **Step 3: Click and verify PDF downloads**

Click the button. Confirm:
- Button shows spinner and is disabled while generating
- A `.pdf` file downloads (filename: `<hotel-name>-guide.pdf`)
- PDF opens correctly in a PDF viewer

- [ ] **Step 4: Verify PDF content**

Open the downloaded PDF and check:
- **Cover page:** hotel logo (if set), hotel name, address QR if address configured
- **WiFi page:** SSID, password, auto-connect QR visible and scannable
- **Blog pages:** sections numbered correctly, images centered per count (4/3/2/1), address QR + phone QR side by side when both present, overflow continues on next page with same title
- **Link page:** large QR, URL text below
- **Text page:** text content readable
- **Group page:** index page lists sub-items, breadcrumb on sub-pages
- **Footer:** hotel name · language · Powered by Infiora logo on every page
- **Skipped:** order / housekeeping / maintenance buttons produce no pages

- [ ] **Step 5: Test with language switch**

Switch the language using the language button (top-right). Click download again. Confirm the PDF content is in the new language (translated content, matching what's shown on screen) and the button label updates to the new language.

- [ ] **Step 6: Test with minimal hotel data**

Test a room where some optional fields are missing (no hotel logo, no address, no sections with images). Confirm no crashes — blank slots render gracefully.

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Download button below map, smaller, outlined — Task 4
- ✅ `@react-pdf/renderer` client-side — Task 2
- ✅ Uses cached translated data from `RoomContext` — Task 3 (receives `room`, `links`, `language` as props; `room`/`links` from context are already translated)
- ✅ Cover page with logo, name, address QR — Task 2 `GuidePDF` cover section
- ✅ WiFi page: SSID + password + auto-connect QR — Task 2 wifi branch
- ✅ Blog: 4 sections/page, overflow continues numbered — Task 2 blog branch + `chunkArray`
- ✅ Blog images: max 4, centered by count, failed images skipped — Task 2 `getValidImages` + `imageWidthForCount`
- ✅ Blog QRs: both address and phone side by side when present — Task 2 `PdfSectionQrs`
- ✅ Link page: large QR + URL text — Task 2 link branch
- ✅ Text page — Task 2 text branch
- ✅ Group: index page + breadcrumbed sub-pages — Task 2 group branch
- ✅ Skip order / housekeeping / maintenance — Task 2 `SKIPPED_TYPES`
- ✅ Footer: hotel name · language · Infiora logo — Task 2 `PdfFooter` with `fixed`
- ✅ Background color from `room.background.color` with `#ffffff` fallback — Task 2 `createStyles`
- ✅ Font color / accent color with fallbacks — Task 2 `createStyles`
- ✅ Download label translated via static map, not AI dictionary — Task 2 `DOWNLOAD_LABELS` + Task 3
- ✅ Hotel address via `room.hotel.map?.centerAddress` — Task 2 `preProcess`
- ✅ Images pre-fetched as data URLs before render (CORS-safe) — Task 2 `fetchImageAsDataUrl`
- ✅ Infiora logo pre-fetched too — Task 2 `preProcess`
