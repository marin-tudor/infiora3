# Infiora — Website Strategy, Sitemap, Wireframes, Copy & SEO

**Prepared for:** Infiora d.o.o., Split, Croatia
**Scope:** High-converting, bilingual (HR/EN), SEO-first marketing site for Infiora — the guest experience platform for hotels and hospitality venues.
**Primary goal:** Drive qualified demo bookings from hotel owners and managers while allowing curious visitors to experience a live demo guide on their own.

> **Important:** This document was originally written based on the public landing page. After a full deep-scan of the source code (`infiora-app-main`, `infiora-dash-main`, `infiora-admin-main`, `infiora-backend-main`, `infiora-api-main`, `infiora-django-main`, `docs/superpowers/`), the picture is significantly larger. **Section 0 below is the corrected feature inventory and supersedes the older feature list further down.** All HTML and messaging in the prototype are aligned with this corrected reality.

---

## 0. CORRECTED FEATURE INVENTORY — what Infiora *actually* is, after deep code scan

Infiora is no longer accurately described as "a digital guest guide." It is a full **guest experience platform** for hotels and hospitality venues, with a guest-facing app (browser, no install), a property-owner dashboard, and an internal admin. The category is closer to *Mews / Duve / Operto* than to *Touch Stay / Hostfully Guidebooks*.

### 0.1 Real product surface (what the code actually does)

**Guest app — `infiora-app-main` (Next.js 14)**
- Multilingual room/venue page with auto language detection across **32+ languages**.
- Per-room visual customization: background color/gradient/image, custom font, custom button styling.
- Up to 8 link types per room: hyperlink, Wi-Fi credentials dialog, text/info dialog, blog/article (with galleries, videos, embedded maps), order page, feedback form, custom survey, group of links.
- **In-room ordering** (full F&B platform) — hierarchical menu, items with images/badges/discounts, cart, checkout (cash / card / online), customizable checkout fields (room number, table PIN, optional email), **real-time order tracking via SSE** (Pending → Processing → On the way → Completed), post-order rating, kiosk mode for tablets.
- **Smart feedback funnel** — 5-star rating; positive ratings trigger a Google review prompt; ≤3-star ratings open a detailed feedback form, optionally followed by a custom survey.
- **Custom survey builder** with 8 question types: rating, yes/no, single choice, multi choice, open text, NPS (0–10), matrix (rows × columns), contact (email/phone). Surveys can be standalone buttons or auto-triggered after feedback.
- **Housekeeping requests** — guests submit cleaning, towels, pillows, amenities, do-not-disturb, extra bed, custom — categories configurable per room.
- **Maintenance reporting** — guests report AC, plumbing, electrical, TV, Wi-Fi, furniture, custom issues, with **photo upload**.
- **Newsletter signup** — email + GDPR consent, scoped per room.
- **Interactive property map** with 15+ marker types (hotel, food, drink, beach, pool, spa, taxi, parking, activity, shopping, info, viewpoint, transport, coffee, custom), filtering, and one-tap directions.
- Popup dialogs (welcome / promo) with image, custom text, link, position (top / center / bottom), size (small / medium / fullscreen).
- Group links (collapsible multi-item containers).
- Page tracker — device, language, time spent, link clicks, social taps.

**Property-owner dashboard — `infiora-dash-main` (Next.js)**
- Multi-hotel, multi-room management; bulk room creation; group management.
- Drag-to-reorder links, per-link styling, icon picker.
- **Order management:** orders list with filters, **real-time notifications via Server-Sent Events**, status workflow, catalog editor (categories, items, images, badges, discounts), promotions, reservation codes (hotel mode), table PINs (restaurant mode), order analytics (revenue, popular items, conversion funnel).
- **Venue mode:** Hotel (reservation-code based) or Restaurant (table PIN based) — same engine, different checkout.
- Feedback list, survey builder, survey responses per room.
- Housekeeping queue with status workflow.
- Maintenance ticket queue with photo attachments.
- Newsletter subscriber list, export.
- Insights: per-hotel, per-room, per-link analytics; hotel comparison view; date range picker; visit-to-order conversion.
- Account & branding settings, theming per property.
- Multi-language UI.

**Internal admin — `infiora-admin-main`**
- All-hotels list, hotel detail with insights, multi-image upload, hotel-to-place mapping.
- All-rooms list, bulk room creation, room edit.
- Reports: links report, rooms report, general reports with filters.
- Users: list, add, edit (roles & permissions), assign to hotels.
- Support tickets list.

**Backend — `infiora-backend-main` (Node) + `infiora-api-main` (.NET)**
- REST API (`/v1/...`) for: auth, users, tickets, batches, tags, hotels, rooms, links, groups, subscribers, orders, housekeeping, maintenance.
- Real-time SSE for order updates.
- Multi-tenant isolation per hotel.
- Email notifications (orders, feedback alerts).
- Insights aggregation pipeline.
- Auto language detection from `Accept-Language`.
- Rate-limited PIN attempts.
- .NET API in parallel for newer services (auth, future migrations).

**Roadmap signals from `docs/superpowers/`**
- Custom Survey Feedback System (drafted 2026-04-13) — already partially shipped.
- Venue Mode + SSE + Order UX (2026-04-14) — replaces polling, removes guest code-gate, adds GDPR notice on checkout, adds restaurant-table-PIN mode.
- Blog Section Improvements (2026-04-14) — galleries + video + map-linked points.
- Security & GDPR features (2026-04-17) — retention, consent tracking, export/delete.

### 0.2 What this changes in the marketing strategy

The previous draft positioned Infiora as a **multilingual digital guide.** That is still true and remains the single most differentiating hero hook (per your decision). But the body of the site needs to communicate four parallel value pillars, not one:

1. **The Guide** — multilingual room/venue content (Wi-Fi, menus, device manuals, facilities, local map).
2. **The Order Engine** — in-room dining and restaurant ordering with real-time tracking and analytics.
3. **The Service Loop** — housekeeping requests, maintenance tickets, smart feedback funnel, custom surveys.
4. **The Operating System** — multi-property dashboard, real-time SSE notifications, insights & comparison, kiosk mode, venue switching, multi-tenant admin.

The hero stays focused on the language promise (it's the cleanest 2-second hook). But the **Features**, **How it works**, and **Who it's for** sections must now reflect a much wider product. Pricing strategy (hidden, demo-only) is *more* defensible now because the product is genuinely complex enough to warrant a conversation.

### 0.3 Revised feature catalog for the website (replaces §6.4 below)

| # | Marketing card | Backed by code |
|---|---|---|
| 1 | **30+ languages, automatic** | Auto-detect via browser Accept-Language; manual override; works on every link, dialog, popup |
| 2 | **Instant Wi-Fi access** | `WifiDialog.tsx` — one-tap reveal of SSID/password |
| 3 | **In-room ordering with live tracking** | Full F&B engine: catalog, cart, checkout, SSE status (`/v1/orders` + GuestOrderPage) |
| 4 | **Restaurant venue mode** | Table-PIN flow vs hotel reservation code; same engine (`OrderSettings.venueType`) |
| 5 | **Smart feedback funnel** | 5★ rating → Google review (good) or detailed feedback form (bad) → optional survey (`FeedbackDrawer`) |
| 6 | **Custom surveys (8 question types)** | rating, yes/no, single-choice, multi-choice, open text, NPS, matrix, contact (`SurveyDrawer`) |
| 7 | **Housekeeping requests** | 7 preset categories + custom; per-room config; status workflow (`HousekeepingDrawer`) |
| 8 | **Maintenance reports with photos** | 7 preset issue types + custom + photo upload (`MaintenanceDrawer`) |
| 9 | **Interactive property map** | 15+ marker types, filtering, directions (`RoomMapSection`, `RoomMapCanvas`) |
| 10 | **Blog / article sections** | Galleries, video embeds, embedded maps (`BlogDrawer`) |
| 11 | **Newsletter signup** | Email + GDPR consent per room (`NewsletterDialog` + `/v1/subscribers`) |
| 12 | **Kiosk mode** | Locked-down fullscreen mode for in-room tablets (`room.kioskMode`) |
| 13 | **Multi-hotel admin & comparison** | Compare properties side-by-side by metrics (`HotelComparePage`) |
| 14 | **Real-time order SSE for staff** | Push notifications without refresh (`/hotels/:id/events`) |
| 15 | **Per-link & per-room analytics** | Click-through, time spent, language, device (`PageTracker`, insights APIs) |
| 16 | **Per-room theming** | Background, font, button style configurable per room |

### 0.4 New website narrative (one paragraph)

> Infiora is the guest experience platform for modern hospitality. A single scan opens a multilingual property guide that auto-translates into the language of the guest's phone — and behind that simple front door sits a full operating system: in-room and restaurant ordering with live status tracking, smart feedback that routes happy guests to Google reviews and unhappy ones to a private form, custom surveys, housekeeping and maintenance requests with photos, an interactive local map, a real-time multi-property dashboard for staff, and a hospitality-native analytics layer. Built in Split, Croatia, deployed in days, no app required, designed like the properties it serves.

---

## 1. Product Analysis — Source of Truth

### 1.1 What Infiora actually is
Infiora is a bilingual-by-design, 30+-language digital guest guide platform. A single scan of a QR code, tap of an NFC card, or click of a direct link opens a property-specific guest guide in the visitor's browser — no app install, no account, no password.

### 1.2 How it works
1. **Setup (3–5 business days):** The Infiora team co-builds the property's digital guide (rooms, Wi-Fi, menus, facility hours, device manuals, local tours).
2. **Distribution:** QR stickers (included), NFC cards (€5 each), NFC/QR stands (€12 each), or shareable direct links via Airbnb / Booking.com / WhatsApp.
3. **Guest experience:** Browser auto-detects the language; the guest sees Wi-Fi credentials, menus, device guides, facility info, and local experiences instantly in their own language.
4. **Owner experience:** A live dashboard allows instant updates (Wi-Fi password, menu items, operating hours) and shows analytics — which guests clicked what, in which language, from which device, when.

### 1.3 Most valuable features (ranked by conversion power)
1. **Auto language detection across 30+ languages** — the category-defining differentiator.
2. **Done-for-you onboarding in 3–5 business days** — removes "I don't have time" objection.
3. **Instant updates from dashboard, no reprinting** — operational savings.
4. **Guest engagement analytics** — turns a concierge tool into a decision tool.
5. **Multiple physical access methods (QR / NFC card / stand / direct link)** — signals premium and flexibility.
6. **Upsell surface for tours, spa, transfers** — makes the guide a revenue stream, not a cost center.

### 1.4 Immediate guest-visible benefits
- Wi-Fi in one tap, in my language.
- I can read the menu without calling reception.
- I know how to work the AC / Jacuzzi / TV.
- I can book a tour without leaving my room.
- I don't need to download another app.

### 1.5 Owner-visible benefits (the ones that sell)
- 50–80% fewer "how does this work?" front-desk calls.
- Guests who find information they need are guests who leave 5-star reviews.
- Menu change at 11 pm? Live at 11:01.
- Upsell revenue from tours, spa, late checkouts — measured in the dashboard.
- A brand-consistent digital experience, not a printed A4 in a plastic sleeve.

### 1.6 The winning narrative
**"Every guest. Every language. One scan."**
Positioning: Infiora is the guest guide designed like your property — premium, multilingual, measurable.

---

## 2. Strategic Framework

| Dimension | Decision |
|---|---|
| Primary audience | Hotels (all sizes) |
| Secondary audiences | Apartments & villas, hostels, cruise ships |
| Geographic priority | Croatia first, globally ready |
| Primary CTA | **Book a free demo call** |
| Secondary CTA | **See a live demo guide** (opens an example Infiora guide in a new tab) |
| Pricing display | Hidden on site — revealed in demo call |
| Tone | Premium, editorial, warm — confident without shouting |
| Trust signals on site | Real client hotel logos, real testimonials, usage metrics |
| Language UX | Auto-detect browser language + manual HR/EN toggle in the header |
| Visual direction | Full refresh — "Calm Modern Hospitality" |

---

## 3. Visual & Brand Direction — "Calm Modern Hospitality"

The current site uses a forest/cream/gold palette. For the refresh, we evolve toward a lighter, more contemporary expression that still feels hospitable — but now reads as unmistakably 2026, not 2019.

### 3.1 Palette
| Token | Hex | Use |
|---|---|---|
| `--ivory` | `#FAF8F3` | Primary background |
| `--bone` | `#F2EEE5` | Section dividers, cards |
| `--ink` | `#111713` | Primary text, buttons, logo |
| `--graphite` | `#3D463F` | Secondary text |
| `--mist` | `#7C877F` | Tertiary text, captions |
| `--terra` | `#C97F5A` | Highlights, italics, accent shapes |
| `--jade` | `#2F5D50` | Signature brand color — CTAs, links, iconography |
| `--brass` | `#B8863A` | Rare premium accent (badges, seals) |
| `--line` | `rgba(17,23,19,0.08)` | Hairline dividers |

### 3.2 Typography
- **Display:** *Fraunces* (variable serif) — used for H1/H2 and italic accents. Warm, editorial, modern-classic. Replaces Playfair.
- **Body:** *Inter* (variable sans) — used everywhere else. Clean, neutral, high-legibility. Replaces DM Sans.
- **Scale:** 14 / 16 / 18 / 20 / 24 / 32 / 44 / 60 / 80 — generous, confident, left-aligned by default.

### 3.3 Layout principles
- **Editorial, not SaaS.** Long vertical rhythm. Full-bleed sections alternate with inset container content.
- **One idea per screen.** Each section communicates a single message.
- **Asymmetric grids** for features to break the "cards in rows" feel.
- **Whitespace is the hero.** Never more than 3 focal elements visible at once.

### 3.4 Motion & interaction
- Soft fade-up on scroll (reveal distance ≤ 24 px, duration 500–700 ms, ease-out-quart).
- Hover micro-lifts (2 px translate, subtle shadow shift).
- Sticky header with background blur after first scroll.
- Sticky footer "Book a demo" bar on mobile, after 60 % scroll.
- Interactive language-preview demo widget (guest sees content translate in real time).
- Step-by-step animated "How it works" with progressive reveal.
- Interactive access-method switcher (QR / NFC / Stand / Link) with phone mockup state changes.
- Cursor-reactive subtle parallax on hero (max 6 px). No scroll-hijacking.

---

## 4. Sitemap

```
infiora.hr/
├── /                        (Home — hotels-first)
├── /how-it-works            (Process & guest journey)
├── /features                (Full feature catalog)
├── /for                     (Audience hub)
│   ├── /for/hotels
│   ├── /for/apartments
│   ├── /for/hostels
│   └── /for/cruise
├── /access-methods          (QR / NFC cards / stands / direct links)
├── /analytics               (Dashboard showcase)
├── /pricing                 (Gated — "Get a personalized quote")
├── /faq
├── /about                   (Company & team in Split)
├── /contact
├── /book-a-demo             (Calendar + lead form)
├── /demo                    → redirects to app.infiora.hr/demo (live demo guide)
├── /blog                    (SEO engine — later phase)
└── /legal/{privacy,terms,imprint}
```

Croatian mirror lives at equivalent paths with `lang=hr` cookie or under `/hr/` depending on final CMS implementation. See §8 for hreflang details.

---

## 5. Wireframe Logic — Home Page (section by section)

Each section below specifies: **purpose · message · layout · interactive elements · CTA**.

### Section 1 — Sticky Navigation
- **Purpose:** Persistent wayfinding + conversion shortcut.
- **Message:** "We are a serious brand, and your next step is here."
- **Layout:** Transparent over hero, blurred ivory after scroll. Left: Infiora wordmark + gem icon. Center: How it works · Features · For hotels · FAQ. Right: HR/EN toggle · "Book a demo" button (jade).
- **Interactive:** Blur fade-in on scroll (60 px threshold). HR/EN toggle swaps content without page reload. Hamburger on mobile with slide-over drawer.
- **CTA:** *Book a demo* (primary).

### Section 2 — Hero
- **Purpose:** Deliver the core promise in under 2 seconds.
- **Message:** *Every guest. Every language. One scan.*
- **Layout:** Two-column on desktop. Left (7/12): eyebrow label "DIGITAL GUEST GUIDE · MADE IN SPLIT" · H1 · subtitle · two CTAs (primary: Book a demo · ghost: See a live guide →). Right (5/12): A looping, silent micro-demo — a smartphone mockup shows the same Infiora guide switching between 5 languages every 3 seconds, each with the matching flag.
- **Interactive:** The language-rotation is pause-on-hover; a small chip lets visitors click any of the flags to freeze on that language.
- **CTA:** *Book a demo* (jade, solid) + *See a live guide* (ghost with arrow).

### Section 3 — Social Proof Strip (immediately below hero)
- **Purpose:** Earn permission to keep reading.
- **Message:** "Real properties already trust Infiora."
- **Layout:** Horizontal row of 6–8 client hotel logos in mid-tone graphite (desaturated), plus a single stat badge: "Serving guests in 30+ languages across the Adriatic."
- **Interactive:** Subtle infinite marquee on mobile.
- **CTA:** None — this section is service, not sell.

### Section 4 — The Language Promise (the differentiator, front and center)
- **Purpose:** Own the category before scrolling further.
- **Message:** "Your guest's phone already speaks their language. So should your hotel."
- **Layout:** Large editorial block. Left (6/12): H2 + 2-sentence paragraph + supporting list of 6 example languages. Right (6/12): a real interactive widget — 12 flag chips; clicking one instantly re-renders a sample Infiora card (Wi-Fi, menu, welcome text) in that language.
- **Interactive:** The widget. Fully functional in-page; uses pre-written strings in HR, EN, DE, IT, FR, ES, NL, CS, HU, JA, ZH, AR.
- **CTA:** *See the full list of 30+ languages →* (text link to /features#languages).

### Section 5 — How It Works (3 steps)
- **Purpose:** Kill the "this is complicated" fear.
- **Message:** *Live in your property within days.*
- **Layout:** A vertical number-driven timeline. Three blocks, each with a large step number (01 / 02 / 03) in Fraunces italic terra, a headline, a 2-sentence explanation, and a small visual (icon-driven, not illustrative-heavy).
- **Interactive:** As visitor scrolls, the current step's number lifts and fills with jade; previous steps dim. A sticky progress rail on the left marks position.
- **CTA:** *Start with a 30-min demo →* at the bottom.

**Step copy (EN):**
- **01 — We build your guide together.** Share your Wi-Fi, menus, services, and house rules. Our team crafts the full guide to match your brand. Most properties go live in 3–5 business days.
- **02 — Place QR codes where guests need them.** Print-ready stickers for every room, NFC cards for premium touchpoints, stands for reception and dining.
- **03 — Update, measure, grow.** Change anything, anytime, from the dashboard. Watch how guests engage, in which language, on which device.

### Section 6 — Feature Showcase (asymmetric grid)
- **Purpose:** Explain *what it actually does* without walls of bullet points.
- **Message:** *Everything your guests need — right when they need it.*
- **Layout:** A 12-column asymmetric grid. One large hero feature card (Instant Wi-Fi) spans 7 columns. Smaller cards tile alongside. 6 features total: Instant Wi-Fi · Digital Menus · Device Guides · Auto Language · Local Experiences · Facility Info.
- **Interactive:** Each card has a subtle hover lift and a 3-dot "expand" icon that opens an inline mini-demo (e.g., a mock smart-TV instruction flow). Cards flip/reveal on tap for mobile.
- **CTA:** *Explore every feature →* (links to /features).

### Section 7 — Access Methods (interactive switcher)
- **Purpose:** Show the tangible deliverables; reduce abstraction.
- **Message:** *Four ways to put Infiora in your guest's hand.*
- **Layout:** Left (5/12): Tabbed list — QR Sticker · NFC Card · NFC/QR Stand · Direct Link. Right (7/12): Phone-in-hand mockup that changes photo and state as the visitor clicks each tab, with a short benefit sentence.
- **Interactive:** Tab state drives the visual. Subtle cross-fade between photos. Tap-to-learn on mobile.
- **CTA:** *Which is right for my property? Ask on the demo call →*

### Section 8 — Analytics Dashboard
- **Purpose:** Signal "this is not a toy; it's a business tool."
- **Message:** *Know exactly how your guests experience your property.*
- **Layout:** Full-bleed dark-ink section. Big product shot of the dashboard (chart + heat-map + language breakdown). Three key-metric tiles floating alongside: "Average 4.2 min time on guide" · "23 languages served last month" · "37% of guests click local tours."
- **Interactive:** Tiles animate from zero to final value when they enter viewport.
- **CTA:** *See the dashboard live on your demo call →*

### Section 9 — Who It's For (hotels first)
- **Purpose:** Reassure non-hotel accommodations while keeping hotels as lead.
- **Message:** *Built for every property — perfected for hotels.*
- **Layout:** A hero card for **Hotels** (3x wider) with a single photograph, headline, 3 bullet benefits, and a "Read the hotel playbook" link to `/for/hotels`. Below, a 3-column row for Apartments & Villas · Hostels · Cruise Ships, each smaller, each with its own link.
- **Interactive:** Cursor-reactive tilt (max 4°) on cards. Subtle color shift per audience.
- **CTA:** *See how it works for hotels →*

### Section 10 — Testimonials
- **Purpose:** Credibility from the mouths of actual customers.
- **Message:** *What property owners say about Infiora.*
- **Layout:** Slow-auto-advancing horizontal slider of 3–5 quotes. Each card has a real photo (exterior of the property is fine if portrait isn't available), the quote, the name, the role, the property name and location.
- **Interactive:** Pause on hover. Keyboard-arrow navigable.
- **CTA:** None in-section.

### Section 11 — Stats Strip
- **Purpose:** Quantify adoption.
- **Message:** Scale and reach.
- **Layout:** Full-bleed ivory. 4 stats in one row: "X+ properties live" · "Y languages served" · "Z guest sessions / month" · "3–5 day avg setup."
- **Interactive:** Count-up animation when visible.
- **CTA:** None.

### Section 12 — FAQ (SEO-critical)
- **Purpose:** Answer every conversion-blocking objection and rank on Google for long-tail searches.
- **Message:** *Questions from property owners like you.*
- **Layout:** Two-column on desktop: left is a sticky H2 + intro paragraph; right is an accordion of 10–12 questions. Each answer is 2–4 sentences, keyword-rich but natural. FAQPage JSON-LD on the page.
- **Interactive:** Click to expand, smooth height transition. Only one answer open at a time (configurable).
- **CTA:** *Still have questions? Book a call →*

### Section 13 — Final CTA Block
- **Purpose:** Convert at the highest point of intent, after all proof and explanation.
- **Message:** *Ready to give your guests the guide they deserve?*
- **Layout:** Centered, editorial. H2 in Fraunces italic with the question, subcopy below, two CTAs stacked (primary jade + ghost).
- **Interactive:** Soft cursor-reactive background shimmer.
- **CTA:** *Book a free 30-minute demo* · *See a live guide first*.

### Section 14 — Footer
- **Purpose:** Sitemap, trust, legal.
- **Layout:** 4-column: (1) Infiora wordmark + 1-sentence tagline + Split address; (2) Product links; (3) Company; (4) Legal + HR/EN toggle + email/phone.
- **CTA:** Small inline "Book a demo" secondary button.

### Sticky mobile footer
- **Purpose:** Always-available primary conversion on mobile.
- **Layout:** Appears after first 60% of scroll. 2 buttons side-by-side: *Book a demo* (jade) · *Live demo* (ghost).

---

## 6. Messaging & Copy Direction — Bilingual (EN / HR)

All copy is written natively for each language — not translated. Croatian is warmer and more personal; English is slightly more composed.

### 6.1 Hero

**EN**
> Eyebrow: DIGITAL GUEST GUIDE · MADE IN SPLIT
> H1: Every guest. *Every language.* One scan.
> Subcopy: Infiora is the digital guest guide that greets your visitors in the language of their phone — from Wi-Fi to room service to the best sunset bar — with no app to download and no staff to ask.
> CTA 1: Book a demo
> CTA 2: See a live guide →

**HR**
> Eyebrow: DIGITALNI VODIČ ZA GOSTE · IZ SPLITA
> H1: Svaki gost. *Na svom jeziku.* Jedno skeniranje.
> Subcopy: Infiora je digitalni vodič koji vaše goste dočekuje na jeziku njihovog telefona — od Wi-Fi pristupa do room servicea i preporuka za najbolji zalazak sunca. Bez aplikacije. Bez čekanja na recepciji.
> CTA 1: Rezervirajte demo
> CTA 2: Pogledajte vodič uživo →

### 6.2 Language Promise

**EN**
> H2: Your guest's phone already speaks their language. *So should your hotel.*
> Body: Infiora reads the language setting of every device and instantly serves your entire guide in that language. No menus to translate, no signs to reprint, no guest left guessing. Over thirty languages, all automatic, from the very first scan.

**HR**
> H2: Telefon vašeg gosta već govori njegov jezik. *Trebao bi i vaš hotel.*
> Body: Infiora prepoznaje jezik svakog uređaja i odmah prikazuje cijeli vodič upravo na tom jeziku. Bez prevođenja menija, bez novih tiskanja, bez gostiju koji pogađaju. Više od trideset jezika, automatski, od prvog skeniranja.

### 6.3 How it works

**EN**
> H2: Live in your property *within days.*
> 01 — We build your guide together. Share your Wi-Fi, menus, services, and house rules. Our team in Split crafts the full guide and adapts it to your brand. Most properties go live in 3–5 business days.
> 02 — Place QR codes where guests need them. Print-ready stickers for every room. Premium NFC cards for welcome amenities. Stands for reception and dining.
> 03 — Update, measure, grow. Change anything, anytime, from the dashboard. See which languages your guests use, what they click, which tours they book.

**HR**
> H2: Spremno u vašem objektu *u nekoliko dana.*
> 01 — Zajedno slažemo vaš vodič. Pošaljete nam Wi-Fi, menije, usluge i kućni red. Naš tim u Splitu slaže kompletan vodič prilagođen vašem brendu. Većina objekata je online za 3–5 radnih dana.
> 02 — QR kodove postavite tamo gdje gosti trebaju odgovore. Naljepnice za svaku sobu. Premium NFC kartice za dobrodošlicu. Stalci za recepciju i restoran.
> 03 — Ažurirajte, mjerite, rastite. Sve mijenjate kad god želite, iz kontrolne ploče. Pratite koje jezike vaši gosti koriste, što klikaju, koje izlete rezerviraju.

### 6.4 Features — 6 cards (EN / HR headlines)

| Card | EN headline + one-liner | HR headline + one-liner |
|---|---|---|
| Wi-Fi | **Instant Wi-Fi** — One tap to connect, no handwritten cards. | **Wi-Fi na dodir** — Spajanje jednim klikom, bez papirića. |
| Menus | **Digital menus & room service** — Update dishes at any hour, in every language. | **Digitalni meni i room service** — Ažurirajte jela u bilo kojem trenutku, na svim jezicima. |
| Device Guides | **Device & equipment guides** — TV, AC, Jacuzzi — explained once, used by thousands. | **Upute za uređaje** — TV, klima, jacuzzi — objašnjeno jednom, korisno tisućama. |
| Auto Language | **30+ languages, auto** — The guide appears in the guest's language before they ask. | **30+ jezika, automatski** — Vodič se prikaže na jeziku gosta, bez pitanja. |
| Local Tours | **Local experiences** — Turn tours, transfers, and tastings into a measurable revenue stream. | **Lokalni doživljaji** — Izleti, transferi i kušaonice kao mjerljiv izvor prihoda. |
| Facility Info | **Facility info** — Pool hours, spa, parking, checkout — without reprinting a single page. | **Info o objektu** — Bazen, spa, parking, check-out — bez ijednog novog ispisa. |

### 6.5 Final CTA

**EN**
> H2: Ready to give your guests *the guide they deserve?*
> Body: Book a free 30-minute demo. We'll show you Infiora live, answer every question, and mock up your property's guide on the call.
> CTA 1: Book a free demo · CTA 2: See a live guide first

**HR**
> H2: Spremni dati gostima *vodič kakav zaslužuju?*
> Body: Rezervirajte besplatni 30-minutni demo. Pokazujemo Infioru uživo, odgovaramo na sva pitanja i tijekom poziva radimo skicu vodiča za vaš objekt.
> CTA 1: Rezervirajte demo · CTA 2: Prvo pogledajte vodič uživo

---

## 7. FAQ — SEO-ready (EN + HR)

These questions are drawn from real customer objections documented in the existing site. Each is written to target a Google "People also ask" snippet. Mark up with `FAQPage` JSON-LD.

### EN

1. **Do my guests need to download an app?**
No. Infiora opens directly in the browser when guests scan a QR code, tap an NFC card, or click a link. No app, no account, no password. Works on every modern smartphone.

2. **Which languages does Infiora support?**
Over 30, including Croatian, English, German, Italian, French, Spanish, Dutch, Czech, Hungarian, Polish, Slovenian, Japanese, Mandarin, Korean, and Arabic. The guide displays in the guest's phone language automatically; guests can also switch manually.

3. **How long does setup take?**
Most properties are live within 3–5 business days. Our Split team builds the initial guide using the content you provide; you get QR codes and access to the dashboard on launch.

4. **Can I change my menu or Wi-Fi password without calling anyone?**
Yes. Everything is editable from the dashboard, and changes appear instantly for all guests.

5. **Do I have to print anything?**
No. QR stickers ship ready to place. If you want premium accessories, NFC cards (€5) and NFC/QR stands (€12) are optional.

6. **Does Infiora work for apartments and Airbnbs, or only hotels?**
It works for any accommodation type. For remote-managed apartments, the direct-link method is particularly valuable — add it to your Booking.com or Airbnb pre-arrival message and guests are informed before they arrive.

7. **What analytics can I actually see?**
Which guides guests open, which sections they spend time on, which language they use, which tours and menus they click, and which devices they're on. It's the kind of data that used to require an on-site concierge to guess at.

8. **What about guest privacy?**
Infiora is GDPR-compliant. No guest accounts are required, no personal data is collected without consent, and analytics are aggregated at the property level.

9. **Can I see Infiora before I buy?**
Yes — a live demo guide is linked at the top of this page, and we'll build a custom mock-up for your property during the demo call.

10. **How do I get pricing?**
Book a demo and we'll send you a proposal tailored to your property size and needs.

### HR

1. **Moraju li gosti preuzeti aplikaciju?**
Ne. Infiora se otvara izravno u pregledniku nakon skeniranja QR koda, dodira NFC kartice ili klika na link. Bez aplikacije, bez računa, bez lozinke. Radi na svakom modernom pametnom telefonu.

2. **Koje jezike Infiora podržava?**
Više od 30, uključujući hrvatski, engleski, njemački, talijanski, francuski, španjolski, nizozemski, češki, mađarski, poljski, slovenski, japanski, mandarinski, korejski i arapski. Vodič se automatski prikazuje na jeziku telefona gosta; gosti također mogu ručno promijeniti jezik.

3. **Koliko traje postavljanje?**
Većina objekata je online u roku od 3–5 radnih dana. Naš tim u Splitu izrađuje vodič koristeći sadržaj koji vi pošaljete; na dan lansiranja dobivate QR kodove i pristup kontrolnoj ploči.

4. **Mogu li sam promijeniti meni ili Wi-Fi lozinku?**
Da. Sve se uređuje iz kontrolne ploče, a promjene se gostima prikazuju trenutno.

5. **Moram li išta tiskati?**
Ne. QR naljepnice dolaze spremne za postavljanje. Za premium prezentaciju nude se NFC kartice (€5) i NFC/QR stalci (€12).

6. **Radi li Infiora za apartmane i Airbnb ili samo hotele?**
Radi za sve vrste smještaja. Za apartmane kojima se upravlja na daljinu posebno je vrijedna metoda izravnog linka — dodate je u Booking.com ili Airbnb poruku pred dolazak i gosti su informirani prije nego što stignu.

7. **Što točno vidim u analitici?**
Koje vodiče gosti otvaraju, na kojim dijelovima se zadržavaju, koji jezik koriste, koje izlete i menije klikaju, s kojih uređaja dolaze. To je tip podataka koji se ranije mogao samo pretpostaviti.

8. **Što s privatnošću gostiju?**
Infiora je usklađena s GDPR-om. Ne traži korisničke račune, ne prikuplja osobne podatke bez pristanka i agregira analitiku na razini objekta.

9. **Mogu li vidjeti Infioru prije kupnje?**
Naravno — demo vodič se otvara linkom na vrhu stranice, a tijekom demo poziva radimo skicu za vaš konkretan objekt.

10. **Kako saznati cijenu?**
Rezervirajte demo i šaljemo vam ponudu prilagođenu veličini i potrebama vašeg objekta.

---

## 8. SEO Strategy

### 8.1 URL structure
- Clean, lowercase, hyphenated slugs.
- Croatian mirror via `?lang=hr` for prototype; production should use `/hr/` subfolder plus `hreflang` tags.
- Examples:
  - `infiora.hr/` (EN default) / `infiora.hr/hr/` (HR)
  - `infiora.hr/for/hotels` / `infiora.hr/hr/za/hotele`
  - `infiora.hr/how-it-works` / `infiora.hr/hr/kako-funkcionira`
  - `infiora.hr/faq` / `infiora.hr/hr/cesta-pitanja`
  - `infiora.hr/book-a-demo` / `infiora.hr/hr/rezervirajte-demo`

### 8.2 Meta titles & descriptions (EN)

| Page | Meta title | Meta description |
|---|---|---|
| Home | Infiora — Digital Guest Guide for Hotels in 30+ Languages | One QR code. Your entire hotel guide. Wi-Fi, menus, spa, tours — in every guest's language. No app required. Made in Split. |
| How it works | How Infiora Works — Your Digital Guest Guide, Live in Days | See how Infiora sets up your bilingual digital guest guide in 3–5 business days, from QR codes to dashboard analytics. |
| Features | All Infiora Features — The Complete Digital Guest Guide | Auto language detection, digital menus, device guides, analytics, local tours, and more. Every Infiora feature in one place. |
| For hotels | Infiora for Hotels — Digital Guest Guides That Elevate Service | Reduce front-desk calls and lift guest satisfaction. Discover why boutique and city hotels across Croatia choose Infiora. |
| For apartments | Infiora for Apartments & Villas — Remote Hosting, Perfected | Share your guide through Airbnb and Booking messages. Guests arrive informed — in their language, on any phone. |
| Access methods | QR Codes, NFC Cards & Stands — Infiora Delivery Options | Choose how your guests access the guide: QR stickers, premium NFC cards, elegant reception stands, or direct links. |
| Analytics | Infiora Dashboard — Guest Engagement Analytics for Hotels | See which guests engage, in which language, on which device. Turn your guest guide into a decision-making tool. |
| FAQ | Infiora FAQ — Answers for Property Owners | Everything property owners ask about Infiora, from setup time and languages to pricing and privacy. |
| About | About Infiora — Digital Guest Experience from Split, Croatia | Meet the team behind Infiora, the digital guest guide designed for modern hospitality. Based in Split, serving the world. |
| Book a demo | Book a Free Infiora Demo — Live in 30 Minutes | Book a free 30-minute demo. We'll show Infiora live, answer every question, and mock up a guide for your property. |

### 8.3 Meta (HR — natural, not translated)

| Stranica | Meta naslov | Meta opis |
|---|---|---|
| Početna | Infiora — Digitalni vodič za goste hotela na 30+ jezika | Jedan QR kod. Cijeli vodič vašeg hotela. Wi-Fi, meni, spa, izleti — na jeziku svakog gosta. Bez aplikacije. Iz Splita. |
| Kako funkcionira | Kako Infiora funkcionira — Digitalni vodič spreman za dane | Pogledajte kako Infiora pokreće dvojezični vodič u 3–5 radnih dana — od QR koda do kontrolne ploče s analitikom. |
| Mogućnosti | Sve mogućnosti Infiore — Kompletan digitalni vodič za goste | Automatsko prepoznavanje jezika, digitalni meni, upute za uređaje, analitika, lokalni izleti. Sve mogućnosti Infiore. |
| Za hotele | Infiora za hotele — Digitalni vodič koji uzdiže uslugu | Manje poziva na recepciji i viša zadovoljstvo gostiju. Saznajte zašto hoteli diljem Hrvatske biraju Infioru. |
| Za apartmane | Infiora za apartmane i vile — Savršen daljinski smještaj | Link pošaljite kroz Airbnb ili Booking poruku — gosti stižu informirani, na svom jeziku, s bilo kojeg telefona. |
| Pristup | QR kodovi, NFC kartice i stalci — Infiora pristup | Odaberite kako gosti otvaraju vodič: QR naljepnice, premium NFC kartice, elegantni stalci ili izravni link. |
| Analitika | Infiora kontrolna ploča — Analitika ponašanja gostiju | Pratite koji gosti koriste vodič, na kojem jeziku, s kojeg uređaja. Vodič kao alat za odluke. |
| Česta pitanja | Česta pitanja — Odgovori za vlasnike objekata | Sva pitanja koja vlasnici postavljaju — od postavljanja i jezika do cijene i privatnosti. |
| O nama | O Infiori — Digitalni doživljaj gosta iz Splita | Upoznajte tim iza Infiore, digitalnog vodiča stvorenog za modernu ugostiteljsku industriju. |
| Demo | Rezervirajte besplatni Infiora demo — 30 minuta uživo | Pokazujemo Infioru uživo, odgovaramo na sva pitanja i na pozivu radimo skicu vodiča za vaš objekt. |

### 8.4 Heading taxonomy (home page)

- **H1:** Every guest. Every language. One scan.
- **H2:** Your guest's phone already speaks their language. So should your hotel. · Live in your property within days. · Everything your guests need — right when they need it. · Four ways to put Infiora in your guest's hand. · Know exactly how your guests experience your property. · Built for every property — perfected for hotels. · What property owners say about Infiora. · Questions from property owners like you. · Ready to give your guests the guide they deserve?
- **H3:** (used inside features, access methods, use cases, FAQ accordions). Each H3 should carry one keyword + one benefit noun, e.g. "Auto language detection, out of the box."

### 8.5 Structured data
- `Organization` on every page (name, logo, address, contact).
- `Website` with `SearchAction`.
- `FAQPage` on the home FAQ section and dedicated `/faq`.
- `BreadcrumbList` on sub-pages.
- `Product` / `SoftwareApplication` optional on features page.
- `LocalBusiness` on Contact + Footer (Split address, geo).
- `hreflang` links between EN and HR mirrors.

### 8.6 Target keyword clusters

**Core (EN):** digital guest guide, QR code guest guide, hotel guest app alternative, multilingual hotel guide, NFC hotel card, digital concierge platform.
**Core (HR):** digitalni vodič za goste, digitalni hotelski vodič, QR kod za hotele, digitalna recepcija, višejezični vodič hotel.
**Long-tail:** "how to reduce hotel front desk calls", "hotel wifi QR code", "Booking.com check-in instructions app", "digitalni vodič za apartmane Airbnb", "Infiora Split cijena".

### 8.7 Technical SEO
- Core Web Vitals budget: LCP < 2.0 s, CLS < 0.03, INP < 200 ms.
- All fonts preloaded with `font-display: swap`.
- Every image `<img loading="lazy">` except hero.
- Single H1 per page; semantic HTML5 (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`, `<article>`).
- Canonical URL on every page.
- Sitemap.xml + robots.txt.
- OG + Twitter card metadata on every page.

---

## 9. Interactive Feature Catalog

1. **Hero language-rotation demo** — phone mockup cycles through 5 languages every 3 s, click-to-freeze.
2. **Live language-preview widget** (section 4) — 12 flag chips, real-time content translation.
3. **Scroll-driven "How it works" timeline** — active step lifts and fills; previous steps dim.
4. **Asymmetric feature grid** with hover micro-lift and inline "expand" mini-demos.
5. **Access-method interactive switcher** — tabs change phone mockup photo with cross-fade.
6. **Count-up stats** — triggered on viewport entry with reduced-motion fallback.
7. **Sticky HR/EN toggle** — swaps content in place, updates `<html lang>` and `hreflang`.
8. **Sticky mobile CTA bar** — appears after 60% scroll.
9. **Cursor-reactive subtle parallax** on hero (max 6 px movement).
10. **Accordion FAQ** — one-at-a-time mode with animated height, keyboard navigable.
11. **Testimonial auto-slider** — 6 s interval, pause on hover, arrow-key navigable, dot indicators.
12. **Background blur on scroll** for the nav — threshold 60 px.
13. **Reduced-motion support** — all animations gated behind `prefers-reduced-motion`.

---

## 10. Final Website Concept — One-paragraph summary

Infiora's next website is an editorial, bilingual, hotel-first marketing experience that opens with the category-owning promise — "Every guest. Every language. One scan." — and immediately proves it with a real, clickable in-page language demo. The visual refresh moves Infiora out of the forest-and-gold past into a calmer, more contemporary 2026 palette of ivory, ink, terracotta, and jade, paired with Fraunces (editorial serif) and Inter (modern sans). The homepage walks the visitor through the differentiator first, then the three-step onboarding, then a tactile tour of features, access methods, and analytics — all expressed through subtle interactions rather than noise. Pricing is intentionally absent; the entire site funnels toward a single premium action — *Book a demo* — with a permanent secondary escape hatch into a live sample guide. Built bilingually from the first line of code with auto-detection and a visible HR/EN toggle, it's SEO-ready across both markets, privacy-friendly, Core-Web-Vitals-fast, and designed to feel — from the first scroll — like the kind of brand that belongs inside the hotels it serves.

---

## Appendix A — Open Items To Confirm

- Exact live demo URL (placeholder assumed: `https://app.infiora.hr/demo`).
- Calendly / Cal.com / booking link for the demo CTA (placeholder: `#book`).
- Final client hotel names/logos to ship on the social-proof strip.
- Exact stats numbers (properties live, languages served, sessions/month).
- Founder/team photo — optional but recommended for `/about`.
- Whether to ship `/hr/` subfolder (recommended) or `?lang=hr` query string (faster to prototype).
