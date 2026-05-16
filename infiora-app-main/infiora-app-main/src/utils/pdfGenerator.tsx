import React from 'react';
import {
  Document,
  Font,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import QRCode from 'qrcode';
import type { ILink, IItem, IRoom, ILanguage, ISection } from '@/types';

Font.register({
  family: 'ArialCustom',
  fonts: [
    { src: '/fonts/arial.ttf', fontWeight: 'normal' },
    { src: '/fonts/arialbd.ttf', fontWeight: 'bold' },
  ],
});

// ── Constants ────────────────────────────────────────────────────────────────

const SKIPPED_TYPES = new Set(['order', 'housekeeping', 'maintenance']);
const MAX_IMAGES = 4;
const MAX_SECTIONS_PER_PAGE = 8;
const PAGE_USABLE_H = 680; // A4 842pt - 30 top - 50 bottom - 35 header ≈ 727, conservative 680
const CONTENT_WIDTH = 535;

// ── Download button label map ─────────────────────────────────────────────────

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
  validImages: string[];
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
  blogPages: ProcessedSection[][];
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
    return await QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 1, width: 200 });
  } catch {
    return null;
  }
}

// Server-side proxy avoids browser CORS entirely
function proxyUrl(url: string, origin: string): string {
  if (!url || !url.startsWith('http')) return url;
  return `${origin}/api/image-proxy?url=${encodeURIComponent(url)}`;
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
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

async function getValidImages(images: string[] | undefined, origin: string): Promise<string[]> {
  if (!images || images.length === 0) return [];
  const candidates = images.slice(0, MAX_IMAGES * 3).map((u) => proxyUrl(u, origin));
  const results = await Promise.allSettled(candidates.map(fetchAsDataUrl));
  return results
    .filter(
      (r): r is PromiseFulfilledResult<string> =>
        r.status === 'fulfilled' && typeof r.value === 'string'
    )
    .map((r) => r.value)
    .slice(0, MAX_IMAGES);
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function htmlToPdfText(str?: string): string {
  return decodeHtmlEntities(str ?? '')
    .replace(/\r/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|h1|h2|h3|h4|h5|h6)>/gi, '\n\n')
    .replace(/<(p|div|section|article|h1|h2|h3|h4|h5|h6)[^>]*>/gi, '')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/<\/(ul|ol)>/gi, '\n')
    .replace(/<(ul|ol)[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Dynamic pagination ────────────────────────────────────────────────────────

function imgHeight(count: number): number {
  if (count === 1) return 160;
  if (count === 2) return 110;
  if (count === 3) return 85;
  return 70;
}

function imgWidth(count: number): number {
  const gap = 4;
  if (count === 1) return CONTENT_WIDTH * 0.75;
  if (count === 2) return (CONTENT_WIDTH - gap) / 2;
  if (count === 3) return (CONTENT_WIDTH - gap * 2) / 3;
  return (CONTENT_WIDTH - gap * 3) / 4;
}

// Estimate how many pt a section will occupy on the PDF page
function sectionPtHeight(section: ProcessedSection): number {
  const titleH = 18;
  const sepH = 16;
  const imagesH =
    section.validImages.length > 0 ? imgHeight(section.validImages.length) + 10 : 0;
  const text = htmlToPdfText(section.description);
  const textLines = text.length > 0
    ? text.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 85)), 0)
    : 0;
  const textH = textLines * 12;
  const qrH = section.addressQr || section.phoneQr ? 40 : 0;
  return titleH + imagesH + textH + qrH + sepH;
}

function calcBlogPages(sections: ProcessedSection[]): ProcessedSection[][] {
  const pages: ProcessedSection[][] = [];
  let current: ProcessedSection[] = [];
  let usedH = 0;

  for (const s of sections) {
    const h = sectionPtHeight(s);
    if ((usedH + h > PAGE_USABLE_H || current.length >= MAX_SECTIONS_PER_PAGE) && current.length > 0) {
      pages.push(current);
      current = [s];
      usedH = h;
    } else {
      current.push(s);
      usedH += h;
    }
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

// ── Styles ────────────────────────────────────────────────────────────────────

function createStyles(bgColor: string, fontColor: string, accentColor: string) {
  return StyleSheet.create({
    page: {
      backgroundColor: bgColor,
      paddingHorizontal: 30,
      paddingTop: 30,
      paddingBottom: 50,
    },
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
    coverContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
    hotelLogo: { width: 80, height: 80, borderRadius: 40 },
    hotelName: { fontSize: 22, fontFamily: 'ArialCustom', fontWeight: 'bold', color: fontColor, textAlign: 'center' },
    hotelDesc: { fontSize: 10, fontFamily: 'ArialCustom', color: fontColor, textAlign: 'center', opacity: 0.7 },
    coverQr: { width: 110, height: 110 },
    coverQrLabel: { fontSize: 8, color: fontColor, textAlign: 'center', opacity: 0.55 },
    // Page structure
    pageTitle: { fontSize: 16, fontFamily: 'ArialCustom', fontWeight: 'bold', color: fontColor, marginBottom: 8 },
    divider: { height: 1, backgroundColor: fontColor, opacity: 0.15, marginBottom: 10 },
    // Blog section
    sectionTitle: { fontSize: 10, fontFamily: 'ArialCustom', fontWeight: 'bold', color: fontColor, marginBottom: 4 },
    sectionDesc: { fontSize: 8, fontFamily: 'ArialCustom', color: fontColor, opacity: 0.75, lineHeight: 1.45, marginBottom: 3 },
    imagesRow: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginBottom: 6 },
    sectionSep: { height: 1, backgroundColor: fontColor, opacity: 0.1, marginVertical: 8 },
    qrRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 2, marginBottom: 6 },
    qrSmall: { width: 30, height: 30 },
    qrMedium: { width: 70, height: 70 },
    qrLarge: { width: 120, height: 120 },
    qrLabel: { fontSize: 7, fontFamily: 'ArialCustom', color: fontColor, opacity: 0.5 },
    // WiFi — fully centered
    wifiCenteredContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
    wifiFieldLabel: { fontSize: 8, fontFamily: 'ArialCustom', color: fontColor, opacity: 0.5, letterSpacing: 1, textAlign: 'center' },
    wifiFieldValue: { fontSize: 18, fontFamily: 'Courier', color: fontColor, marginBottom: 14, textAlign: 'center' },
    wifiQrColumn: { flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 20 },
    wifiQrLabel: { fontSize: 9, fontFamily: 'ArialCustom', color: fontColor, opacity: 0.6, textAlign: 'center', lineHeight: 1.5 },
    // Link page
    linkInstruction: { fontSize: 10, fontFamily: 'ArialCustom', color: fontColor, opacity: 0.65, marginBottom: 24, lineHeight: 1.5 },
    linkQrContainer: { alignItems: 'center', gap: 8 },
    linkScanLabel: { fontSize: 9, fontFamily: 'ArialCustom', color: fontColor, opacity: 0.55 },
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
    linkUrlLabel: { fontSize: 7, fontFamily: 'ArialCustom', color: fontColor, letterSpacing: 1, marginBottom: 2 },
    linkUrlValue: { fontSize: 8, fontFamily: 'ArialCustom', color: accentColor },
    // Text page
    textContent: { fontSize: 9, fontFamily: 'ArialCustom', color: fontColor, lineHeight: 1.6 },
    // Group
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
    breadcrumbParent: { fontSize: 7, fontFamily: 'ArialCustom', fontWeight: 'bold', color: '#ffffff' },
    breadcrumbSep: { fontSize: 7, fontFamily: 'ArialCustom', color: '#ffffff', opacity: 0.6 },
    breadcrumbChild: { fontSize: 7, fontFamily: 'ArialCustom', color: '#ffffff', opacity: 0.85 },
    groupItem: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 6,
      borderLeftWidth: 3,
      borderLeftColor: accentColor,
      borderLeftStyle: 'solid',
    },
    groupItemTitle: { fontSize: 11, fontFamily: 'ArialCustom', fontWeight: 'bold', color: fontColor, marginBottom: 4 },
    groupItemText: { fontSize: 8, fontFamily: 'ArialCustom', color: fontColor, opacity: 0.75, lineHeight: 1.5 },
    groupItemLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
    groupItemLinkUrl: { fontSize: 8, fontFamily: 'ArialCustom', color: accentColor, flex: 1, lineHeight: 1.4 },
    groupItemWifiField: { fontSize: 8, fontFamily: 'ArialCustom', color: fontColor, opacity: 0.5, letterSpacing: 0.5, marginTop: 2 },
    groupItemWifiValue: { fontSize: 11, fontFamily: 'Courier', color: fontColor, marginBottom: 4 },
    groupItemWifiQrRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
    groupItemWifiQrLabel: { fontSize: 7, fontFamily: 'ArialCustom', color: fontColor, opacity: 0.5, flex: 1 },
  });
}

type Styles = ReturnType<typeof createStyles>;

// ── Pre-processor ─────────────────────────────────────────────────────────────

async function preProcess(room: IRoom, links: ILink[], origin: string): Promise<PreProcessedData> {
  const activeLinks = links.filter((l) => !SKIPPED_TYPES.has(l.type));

  const [coverAddressQr, hotelLogoDataUrl, infiOraLogoDataUrl] = await Promise.all([
    room.hotel.map?.centerAddress
      ? safeQr(`https://maps.google.com/?q=${encodeURIComponent(room.hotel.map.centerAddress)}`)
      : Promise.resolve(null),
    room.hotel.image ? fetchAsDataUrl(proxyUrl(room.hotel.image, origin)) : Promise.resolve(null),
    fetchAsDataUrl(`${origin}/images/logo.png`),
  ]);

  const processedLinks: ProcessedLink[] = await Promise.all(
    activeLinks.map(async (link) => {
      let blogPages: ProcessedSection[][] = [];
      let linkQr: string | null = null;
      let wifiQr: string | null = null;
      let groupItems: ProcessedGroupItem[] = [];

      if (link.type === 'blog' && link.sections?.length) {
        const allSections: ProcessedSection[] = await Promise.all(
          link.sections.map(async (s, idx) => {
            const [validImages, addressQr, phoneQr] = await Promise.all([
              getValidImages(s.images, origin),
              s.address
                ? safeQr(`https://maps.google.com/?q=${encodeURIComponent(s.address)}`)
                : Promise.resolve(null),
              s.phone ? safeQr(`tel:${s.phone}`) : Promise.resolve(null),
            ]);
            return { ...s, sectionNumber: idx + 1, validImages, addressQr, phoneQr };
          })
        );
        blogPages = calcBlogPages(allSections);
      }

      if (link.type === 'link' && link.value) linkQr = await safeQr(link.value);

      if (link.type === 'wifi' && link.data) {
        const { ssid, password, security = 'WPA' } = link.data as {
          ssid?: string; password?: string; security?: string;
        };
        wifiQr = await safeQr(`WIFI:T:${security};S:${ssid ?? ''};P:${password ?? ''};;`);
      }

      if (link.type === 'group' && link.items?.length) {
        groupItems = await Promise.all(
          link.items.map(async (item) => {
            let itemLinkQr: string | null = null;
            let itemWifiQr: string | null = null;
            if (item.type === 'link' && item.value) itemLinkQr = await safeQr(item.value);
            if (item.type === 'wifi' && item.data) {
              const { ssid, password, security = 'WPA' } = item.data as {
                ssid?: string; password?: string; security?: string;
              };
              itemWifiQr = await safeQr(`WIFI:T:${security};S:${ssid ?? ''};P:${password ?? ''};;`);
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
  hotelName, languageName, logoDataUrl, S,
}: {
  hotelName: string; languageName: string; logoDataUrl: string | null; S: Styles;
}) => (
  <View style={S.footer} fixed>
    <Text style={S.footerText}>{hotelName} · {languageName} · Powered by</Text>
    {logoDataUrl
      ? <Image style={S.footerLogo} src={logoDataUrl} />
      : <Text style={S.footerText}>Infiora</Text>
    }
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
  const count = images.length;
  const w = imgWidth(count);
  const h = imgHeight(count);
  return (
    <View style={S.imagesRow}>
      {images.map((src, i) => (
        <Image key={i} style={{ width: w, height: h, borderRadius: 4 }} src={src} />
      ))}
    </View>
  );
};

const PdfSectionQrs = ({ section, S }: { section: ProcessedSection; S: Styles }) => {
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

const PdfWifiContent = ({
  ssid, password, security, wifiQr, S,
}: {
  ssid: string; password: string; security?: string; wifiQr: string | null; S: Styles;
}) => (
  <View style={S.wifiCenteredContainer}>
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
      <View style={S.wifiQrColumn}>
        <Image style={S.qrLarge} src={wifiQr} />
        <Text style={S.wifiQrLabel}>
          Scan with your phone camera to connect automatically — no typing needed
        </Text>
      </View>
    )}
  </View>
);

const PdfGroupItemInline = ({
  item, linkQr, wifiQr, S,
}: {
  item: IItem; linkQr: string | null; wifiQr: string | null; S: Styles;
}) => {
  const { ssid = '', password = '' } = (item.data ?? {}) as { ssid?: string; password?: string };
  return (
    <View style={S.groupItem}>
      <Text style={S.groupItemTitle}>{item.title}</Text>
      {item.type === 'text' && (
        <Text style={S.groupItemText}>{htmlToPdfText(item.value)}</Text>
      )}
      {item.type === 'link' && (
        <View style={S.groupItemLinkRow}>
          {linkQr && <Image style={S.qrMedium} src={linkQr} />}
          <Text style={S.groupItemLinkUrl}>{item.value}</Text>
        </View>
      )}
      {item.type === 'wifi' && (
        <>
          <Text style={S.groupItemWifiField}>Network (SSID)</Text>
          <Text style={S.groupItemWifiValue}>{ssid}</Text>
          <Text style={S.groupItemWifiField}>Password</Text>
          <Text style={S.groupItemWifiValue}>{password}</Text>
          {wifiQr && (
            <View style={S.groupItemWifiQrRow}>
              <Image style={S.qrMedium} src={wifiQr} />
              <Text style={S.groupItemWifiQrLabel}>Scan with camera to connect automatically</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
};

// ── PDF Document ──────────────────────────────────────────────────────────────

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
      {/* Cover */}
      <Page size="A4" style={S.page}>
        <View style={S.coverContainer}>
          {hotelLogoDataUrl && <Image style={S.hotelLogo} src={hotelLogoDataUrl} />}
          <Text style={S.hotelName}>{hotelName}</Text>
          {room.description && <Text style={S.hotelDesc}>{room.description}</Text>}
          {coverAddressQr && (
            <>
              <Image style={S.coverQr} src={coverAddressQr} />
              <Text style={S.coverQrLabel}>Scan to find us on Google Maps</Text>
            </>
          )}
        </View>
        <F />
      </Page>

      {processedLinks.flatMap(({ link, blogPages, linkQr, wifiQr, groupItems }) => {
        if (link.type === 'wifi') {
          const { ssid = '', password = '', security } = (link.data ?? {}) as {
            ssid?: string; password?: string; security?: string;
          };
          return [
            <Page key={link.id} size="A4" style={S.page}>
              <PdfPageHeader title={link.title ?? ''} S={S} />
              <PdfWifiContent ssid={ssid} password={password} security={security} wifiQr={wifiQr} S={S} />
              <F />
            </Page>,
          ];
        }

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

        if (link.type === 'text') {
          return [
            <Page key={link.id} size="A4" style={S.page}>
              <PdfPageHeader title={link.title ?? ''} S={S} />
              <Text style={S.textContent}>{htmlToPdfText(link.value)}</Text>
              <F />
            </Page>,
          ];
        }

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
                    <Text style={S.sectionDesc}>{htmlToPdfText(section.description)}</Text>
                  )}
                  <PdfSectionQrs section={section} S={S} />
                  {si < pageSections.length - 1 && <View style={S.sectionSep} />}
                </View>
              ))}
              <F />
            </Page>
          ));
        }

        if (link.type === 'group') {
          return [
            <Page key={`${link.id}-group`} size="A4" style={S.page}>
              <PdfPageHeader title={link.title ?? ''} S={S} />
              {groupItems.map(({ item, linkQr: iLinkQr, wifiQr: iWifiQr }) => (
                <PdfGroupItemInline
                  key={item.id}
                  item={item}
                  linkQr={iLinkQr}
                  wifiQr={iWifiQr}
                  S={S}
                />
              ))}
              <F />
            </Page>,
          ];
        }

        return [];
      })}
    </Document>
  );
};

// ── Public export ─────────────────────────────────────────────────────────────

export async function generateGuidePDF(
  room: IRoom,
  links: ILink[],
  language: ILanguage
): Promise<void> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const data = await preProcess(room, links, origin);
  const S = createStyles(
    room.background?.color ?? '#ffffff',
    room.font?.color ?? '#000000',
    room.button?.backgroundColor ?? '#1976d2'
  );

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

  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(room.hotel.name ?? 'guide').replace(/\s+/g, '-').toLowerCase()}-guide.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
