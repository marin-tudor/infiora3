# Security, GDPR & Feature Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical security vulnerabilities and GDPR violations, then add the high-value features that make hotels unable to cancel their subscription.

**Architecture:** Three parallel workstreams — (1) security/GDPR hotfixes that touch existing files minimally, (2) guest app UX additions, (3) new modules (housekeeping, maintenance, notifications, QR, scheduled reports). All security tasks are Phase 1 and must ship before any feature work.

**Tech Stack:** Node.js/Express/TypeScript (backend), Next.js 14 App Router + MUI v5 (guest app + dashboard), MongoDB/Mongoose, NextAuth v4, RTK Query, Nodemailer, AWS S3

---

## Phase 1 — Security & GDPR (Ship First — No Exceptions)

---

### Task 1: Switch visitorId from localStorage to sessionStorage

**Why:** localStorage persists across visits — same device, same browser, tomorrow = same ID. That makes it a persistent pseudonymous identifier requiring GDPR consent. sessionStorage dies when the tab closes, making each visit anonymous. This also removes "Returning Views" as a valid metric (Tasks 2–3 handle the dashboard cleanup).

**Files:**
- Modify: `infiora-app-main/infiora-app-main/src/contexts/RoomContext.tsx:49-56`

- [ ] **Step 1: Replace the getOrSetVisitorID function**

Replace lines 49–56 in `RoomContext.tsx`:

```tsx
// OLD — persistent across visits:
const getOrSetVisitorID = () => {
  let visitorID = localStorage.getItem("visitorID");
  if (!visitorID) {
    visitorID = crypto.randomUUID();
    localStorage.setItem("visitorID", visitorID);
  }
  return visitorID;
};

// NEW — session-only, dies when tab closes:
const getOrSetVisitorID = () => {
  let visitorID = sessionStorage.getItem("visitorID");
  if (!visitorID) {
    visitorID = crypto.randomUUID();
    sessionStorage.setItem("visitorID", visitorID);
  }
  return visitorID;
};
```

- [ ] **Step 2: Verify the feedback-completed key still uses localStorage (intentional — this one IS a UX preference, not tracking)**

In `PageTracker.tsx` line 41–43 — the `feedback-completed-${roomId}` key stays in `localStorage`. That's correct: it prevents re-showing the feedback form and is a pure UX preference with no analytics purpose. Do NOT change this one.

- [ ] **Step 3: Commit**

```bash
git add infiora-app-main/infiora-app-main/src/contexts/RoomContext.tsx
git commit -m "fix(gdpr): switch visitorId tracking to sessionStorage for anonymous-per-session visits"
```

---

### Task 2: Remove returningViews from backend

**Why:** With sessionStorage, every visit generates a new ID. `returningViews = views - uniqueViews` will always be 0 or near-zero and is now meaningless. Keeping it in the API creates confusion.

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/insight/insight.service.ts`

- [ ] **Step 1: Remove returningViews from getKeyMetrics (line 163)**

In `getKeyMetrics`, remove the `returningViews` line:

```typescript
// DELETE this line (currently line 163):
const returningViews = views - uniqueViews;

// DELETE from the return object (currently around line 200):
returningViews,
```

- [ ] **Step 2: Remove returningViews from calculateStatsOverTime (lines 121–126)**

```typescript
// DELETE these lines from calculateStatsOverTime:
stats.returningViews = Object.fromEntries(
  Object.entries(stats.views).map(([date, totalViews]) => [
    date,
    Math.max(Number(totalViews) - (stats.uniqueViews[date] || 0), 0),
  ])
);
```

Also remove `returningViews: {}` from the initial `stats` object at the top of the function.

- [ ] **Step 3: Remove returningViews from calculateChange (line 249)**

```typescript
// DELETE this line from calculateChange return object:
returningViews: calculatePercentage(current.returningViews, previous.returningViews),
```

- [ ] **Step 4: Commit**

```bash
git add infiora-backend-main/infiora-backend-main/src/modules/insight/insight.service.ts
git commit -m "fix(analytics): remove returningViews metric — meaningless with session-only visitorId"
```

---

### Task 3: Remove returningViews from dashboard UI

**Files:**
- Modify: `infiora-dash-main/infiora-dash-main/src/views/insights/components/OverviewTab.tsx:170-174, 333, 357`
- Modify: `infiora-dash-main/infiora-dash-main/src/views/insights/components/RoomsTab.tsx` (search for `returningViews`)
- Modify: `infiora-dash-main/infiora-dash-main/src/types/index.ts` (remove from IInsights type)

- [ ] **Step 1: Remove the "Returning Views" KPI card from OverviewTab.tsx**

Delete lines 170–174 from `OverviewTab.tsx`:
```tsx
// DELETE:
<Grid item xs={6} sm={4} md={3}>
  <KpiCard label='Returning Views' value={km.returningViews ?? 0} change={ch?.returningViews} />
</Grid>
```

- [ ] **Step 2: Remove Returning column from the Room Performance table in OverviewTab.tsx**

Remove the `<TableCell sx={{ fontWeight: 600 }}>Returning</TableCell>` header cell (line 333) and the `<TableCell align='right'>{room.returningViews || 0}</TableCell>` data cell (line 357). Update `colSpan={9}` on the empty-state row to `colSpan={8}`.

- [ ] **Step 3: Search and remove all other returningViews references in dashboard**

```bash
grep -r "returningViews" infiora-dash-main/infiora-dash-main/src/
```

Remove every occurrence found (KPI cards, table columns, chart series, type definitions).

- [ ] **Step 4: Update IInsights type**

In `src/types/index.ts` (or wherever `IInsights` is defined), remove `returningViews` from `keyMetrics` and `change` shapes:
```typescript
// Remove from keyMetrics:
returningViews?: number

// Remove from change:
returningViews?: number
```

- [ ] **Step 5: Commit**

```bash
git add infiora-dash-main/
git commit -m "fix(dashboard): remove Returning Views metric from all dashboard UI and types"
```

---

### Task 4: Add consent checkbox + privacy notice to feedback form

**Why:** GDPR Art. 6(1)(a) — collecting email requires freely-given, specific, informed consent at the point of collection.

**Files:**
- Modify: `infiora-app-main/infiora-app-main/src/views/rooms/details/components/FeedbackDrawer.tsx` (or wherever the feedback form renders the email input)

- [ ] **Step 1: Find the email input in the feedback form**

```bash
grep -r "email" infiora-app-main/infiora-app-main/src/views/rooms/details/components/ --include="*.tsx" -l
```

- [ ] **Step 2: Add a consent checkbox ABOVE the submit button, conditionally rendered when email field is shown**

Add this block directly below the email input field (or after all form fields, before the submit button):

```tsx
{/* Only show consent if email field is shown */}
{(feedback?.emailRequirement === 'optional' || feedback?.emailRequirement === 'mandatory') && (
  <FormControlLabel
    control={
      <Checkbox
        size="small"
        checked={consentGiven}
        onChange={(e) => setConsentGiven(e.target.checked)}
        required={!!watchEmail}
      />
    }
    label={
      <Typography variant="caption" color="text.secondary">
        I agree that my email may be used to send a reply to my feedback.{' '}
        <Link href="/privacy" target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </Link>
      </Typography>
    }
  />
)}
```

- [ ] **Step 3: Add `consentGiven` state and block submission if email is entered without consent**

```tsx
const [consentGiven, setConsentGiven] = useState(false);

// In the submit handler, before calling the API:
const watchEmail = watch('email'); // react-hook-form
if (watchEmail && !consentGiven) {
  setError('email', { message: 'Please accept the privacy notice to include your email' });
  return;
}
```

- [ ] **Step 4: If email is cleared/empty, reset consentGiven**

```tsx
useEffect(() => {
  if (!watchEmail) setConsentGiven(false);
}, [watchEmail]);
```

- [ ] **Step 5: Commit**

```bash
git add infiora-app-main/
git commit -m "feat(gdpr): add consent checkbox before email submission in feedback form"
```

---

### Task 5: Add MongoDB TTL index on Activity collection

**Why:** GDPR Art. 5(1)(e) storage limitation — data must not be kept longer than necessary. Without a TTL, Activity docs accumulate forever and will eventually cause OOM crashes on large hotels.

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/activity/activity.model.ts`

- [ ] **Step 1: Read the current activity model**

Open `infiora-backend-main/infiora-backend-main/src/modules/activity/activity.model.ts` and find where the schema is defined.

- [ ] **Step 2: Add TTL index after the schema definition**

Add this line immediately before `export default Activity;`:

```typescript
// Auto-delete activity records after 2 years (GDPR storage limitation)
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });
```

Note: MongoDB TTL indexes work on Date fields. `createdAt` is added automatically by Mongoose `timestamps: true`. The TTL background job runs every 60 seconds, so deletion is near-real-time but not exact.

- [ ] **Step 3: Commit**

```bash
git add infiora-backend-main/infiora-backend-main/src/modules/activity/activity.model.ts
git commit -m "feat(gdpr): add 2-year TTL index on Activity collection for storage limitation compliance"
```

---

### Task 6: Create Privacy Policy page in guest app

**Why:** GDPR Art. 13 requires a privacy notice accessible to data subjects. A footer link to `/privacy` satisfies this without a banner.

**Files:**
- Create: `infiora-app-main/infiora-app-main/src/app/privacy/page.tsx`
- Modify: Guest app footer/layout to add the link (wherever the room layout footer is)

- [ ] **Step 1: Create the privacy policy page**

Create `infiora-app-main/infiora-app-main/src/app/privacy/page.tsx`:

```tsx
import { Box, Container, Typography, Divider } from '@mui/material'

export const metadata = {
  title: 'Privacy Policy | Infiora',
  description: 'How Infiora and partner hotels handle your data.',
}

export default function PrivacyPage() {
  const lastUpdated = '17 April 2026'

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Privacy Policy
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Last updated: {lastUpdated}
      </Typography>
      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" fontWeight={600} gutterBottom>1. Who We Are</Typography>
      <Typography variant="body2" paragraph>
        This digital guest guide is powered by <strong>Infiora</strong> on behalf of the hotel you are currently visiting. Infiora acts as a data processor; the hotel acts as the data controller for your personal data.
      </Typography>

      <Typography variant="h6" fontWeight={600} gutterBottom>2. What We Collect and Why</Typography>
      <Typography variant="body2" paragraph>
        <strong>Browser language and device type</strong> — Collected automatically to display content in your preferred language and optimise the layout for your device. This processing is necessary to provide the service (legitimate interest, GDPR Art. 6(1)(f)). We do not store this data linked to your identity.
      </Typography>
      <Typography variant="body2" paragraph>
        <strong>Session identifier</strong> — A random ID is created for your current browser session to count unique visitors. It is stored in your browser's session storage and deleted automatically when you close the tab. It cannot identify you personally.
      </Typography>
      <Typography variant="body2" paragraph>
        <strong>Time spent on page</strong> — Approximate time spent on this guide is recorded as an anonymous number (e.g. "45 seconds") to help the hotel improve its content. Not linked to your identity.
      </Typography>
      <Typography variant="body2" paragraph>
        <strong>Feedback and email (optional)</strong> — If you choose to submit a rating or written feedback, that data is stored by the hotel. If you voluntarily provide your email address and give consent, it may be used by the hotel to respond to your feedback. You can request deletion of this data at any time (see Section 5).
      </Typography>
      <Typography variant="body2" paragraph>
        <strong>Orders</strong> — If you place an order through this guide, your room number, items ordered, and optional contact details are processed to fulfil your order. This is necessary for the performance of a service you requested (GDPR Art. 6(1)(b)).
      </Typography>

      <Typography variant="h6" fontWeight={600} gutterBottom>3. Third-Party Services</Typography>
      <Typography variant="body2" paragraph>
        We use the following sub-processors to provide this service:
      </Typography>
      <Typography variant="body2" component="ul" sx={{ pl: 3 }}>
        <li><strong>Google Cloud Translation API</strong> — Used to translate content into your language. No personal data is sent.</li>
        <li><strong>Amazon Web Services (AWS S3)</strong> — Used to store hotel images and uploaded files. Compliant with GDPR as a certified sub-processor.</li>
      </Typography>

      <Typography variant="h6" fontWeight={600} gutterBottom mt={2}>4. How Long We Keep Your Data</Typography>
      <Typography variant="body2" paragraph>
        Anonymous usage data (views, taps, time spent) is automatically deleted after 2 years. Feedback and order data is retained for the period necessary to manage your stay and any follow-up, after which it is deleted. You may request earlier deletion (see below).
      </Typography>

      <Typography variant="h6" fontWeight={600} gutterBottom>5. Your Rights</Typography>
      <Typography variant="body2" paragraph>
        Under the GDPR you have the right to access, correct, delete, or export personal data we hold about you. To exercise these rights, contact the hotel directly or email: <strong>privacy@infiora.hr</strong>. We will respond within 30 days.
      </Typography>

      <Typography variant="h6" fontWeight={600} gutterBottom>6. No Cookie Banner</Typography>
      <Typography variant="body2" paragraph>
        This guide does not use cookies or persistent tracking. The session identifier used for anonymous analytics is stored in session storage (not cookies) and is automatically deleted when you close the tab. No consent banner is required.
      </Typography>

      <Typography variant="h6" fontWeight={600} gutterBottom>7. Contact</Typography>
      <Typography variant="body2" paragraph>
        Data Controller: The hotel you are visiting.<br />
        Data Processor: Infiora d.o.o., Croatia.<br />
        Privacy enquiries: privacy@infiora.hr
      </Typography>
    </Container>
  )
}
```

- [ ] **Step 2: Add Privacy Policy link to the guest app footer**

Find the guest app layout (likely in `src/app/[id]/layout.tsx` or in `RoomView.tsx`). Add a footer if not present:

```tsx
<Box
  component="footer"
  sx={{ textAlign: 'center', py: 2, mt: 4 }}
>
  <Typography variant="caption" color="text.secondary">
    <Link href="/privacy" target="_blank" rel="noopener noreferrer">
      Privacy Policy
    </Link>
    {' · '}
    Powered by Infiora
  </Typography>
</Box>
```

- [ ] **Step 3: Commit**

```bash
git add infiora-app-main/
git commit -m "feat(gdpr): add privacy policy page and footer link to guest app"
```

---

### Task 7: Fix NextAuth auth bypass in dashboard

**Why:** `authorize(user: any) { return user }` accepts ANY payload as a valid session. Anyone who knows this exists can call the credentials endpoint with arbitrary user data and get a valid JWT session.

**Files:**
- Modify: `infiora-dash-main/infiora-dash-main/src/libs/auth.ts:19-21`
- Modify: `infiora-dash-main/infiora-dash-main/src/app/api/login/route.ts` (this is where the real backend call should happen)

- [ ] **Step 1: Update the login route to validate against real backend**

Replace `infiora-dash-main/infiora-dash-main/src/app/api/login/route.ts` with:

```typescript
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ message: ['Email and password are required'] }, { status: 400 })
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const response = await fetch(`${apiUrl}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  })

  if (!response.ok) {
    return NextResponse.json({ message: ['Email or Password is invalid'] }, { status: 401 })
  }

  const user = await response.json()
  return NextResponse.json(user)
}
```

- [ ] **Step 2: Update the NextAuth authorize function to call the real login route**

In `infiora-dash-main/infiora-dash-main/src/libs/auth.ts`, replace the `authorize` function:

```typescript
async authorize(credentials) {
  const { email, password } = credentials as { email: string; password: string }

  if (!email || !password) return null

  const res = await fetch(`${process.env.NEXTAUTH_URL?.replace('/api/auth', '')}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) return null

  const user = await res.json()
  return user ?? null
}
```

- [ ] **Step 3: Delete the fake users file**

```bash
rm "infiora-dash-main/infiora-dash-main/src/app/api/login/users.ts"
```

- [ ] **Step 4: Commit**

```bash
git add infiora-dash-main/
git commit -m "fix(auth): validate dashboard credentials against real backend, remove fake users file"
```

---

### Task 8: Fix Admin AuthGuard — actually enforce authentication

**Why:** Current guard always renders children after `getMe` finishes loading, regardless of whether `getMe` returned a user or an error. Protected pages are accessible without login.

**Files:**
- Modify: `infiora-admin-main/infiora-admin-main/src/components/AuthGuard.tsx`

- [ ] **Step 1: Check what getMe returns on failure**

```bash
grep -r "getMe" infiora-admin-main/infiora-admin-main/src/redux/ --include="*.ts" -n
```

Look for the RTK Query endpoint definition to understand the shape of a failed `getMe` response.

- [ ] **Step 2: Update AuthGuard to redirect on auth failure**

Replace the entire `AuthGuard.tsx` with:

```tsx
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { userApi } from '@/redux/api/userApi';
import Loader from './ui/Loader';

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { data: user, isLoading, isError } = userApi.endpoints.getMe.useQuery(null);

  useEffect(() => {
    if (!isLoading && (isError || !user)) {
      router.replace('/login');
    }
  }, [isLoading, isError, user, router]);

  if (isLoading) return <Loader center />;
  if (isError || !user) return null;

  return <>{children}</>;
}
```

- [ ] **Step 3: Commit**

```bash
git add infiora-admin-main/infiora-admin-main/src/components/AuthGuard.tsx
git commit -m "fix(auth): AuthGuard now redirects to login when getMe fails instead of always rendering children"
```

---

### Task 9: Add projection to feedback list — hide guest emails from API response

**Why:** The `GET /v1/rooms/feedback` endpoint returns raw feedback documents including guest `email` field. Staff dashboards don't need to display raw emails in list views; email should only appear when explicitly needed.

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/room/room.controller.ts:80-91`

- [ ] **Step 1: Check the feedbackService.queryFeedbacks signature**

```bash
grep -n "queryFeedbacks" infiora-backend-main/infiora-backend-main/src/modules/feedback/feedback.service.ts
```

- [ ] **Step 2: Add default projection to hide email from list endpoint**

In `room.controller.ts`, update the `getFeedbacks` handler to exclude `email` by default unless explicitly requested:

```typescript
export const getFeedbacks = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate } = pick(req.query, ['startDate', 'endDate']);
  const { start, end } = toDate({ startDate, endDate });
  const filter = {
    ...pick(req.query, ['room', 'hotel']),
    createdAt: { $gte: start, $lte: end },
  };

  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  // Default: hide guest email from list responses to protect PII
  if (!options.projectBy) {
    options.projectBy = '-email';
  }
  const result = await feedbackService.queryFeedbacks(filter, options);
  res.send(result);
});
```

- [ ] **Step 3: Commit**

```bash
git add infiora-backend-main/infiora-backend-main/src/modules/room/room.controller.ts
git commit -m "fix(privacy): exclude guest email from feedback list API response by default"
```

---

### Task 10: Fix PageTracker infinite retry loop

**Why:** `tryShowFeedback()` calls `setTimeout(tryShowFeedback, 1000)` without a max retry count. If the dialog is open for more than ~100 seconds due to user interaction, this recursion grows unboundedly.

**Files:**
- Modify: `infiora-app-main/infiora-app-main/src/views/rooms/details/components/PageTracker.tsx:46-55`

- [ ] **Step 1: Add max retry limit to tryShowFeedback**

Replace lines 46–54 in `PageTracker.tsx`:

```tsx
// OLD:
const tryShowFeedback = () => {
  if (!isDialogOpenRef.current) {
    openFeedbackDialog();
  } else {
    setTimeout(tryShowFeedback, 1000);
  }
};
setTimeout(tryShowFeedback, 3000);

// NEW — max 30 retries (30 seconds):
const tryShowFeedback = (attemptsLeft = 30) => {
  if (!isDialogOpenRef.current) {
    openFeedbackDialog();
  } else if (attemptsLeft > 0) {
    setTimeout(() => tryShowFeedback(attemptsLeft - 1), 1000);
  }
};
setTimeout(() => tryShowFeedback(), 3000);
```

- [ ] **Step 2: Also remove the console.log statements from production code**

Remove `console.log("engaged")` (line 32) and `console.log("interval")` (line 86).

- [ ] **Step 3: Commit**

```bash
git add infiora-app-main/infiora-app-main/src/views/rooms/details/components/PageTracker.tsx
git commit -m "fix: cap PageTracker feedback retry at 30 attempts, remove console.logs"
```

---

### Task 11: Add limit cap to insight queries to prevent OOM

**Why:** `Activity.find(...)` with no limit fetches ALL activities for a period. A busy hotel could have 100k+ activities per month — this will crash the Node process with out-of-memory.

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/insight/insight.service.ts:289-294`

- [ ] **Step 1: Add a hard cap on activity queries in getHotelInsights**

In `getHotelInsights`, update both `Activity.find` calls to add a limit:

```typescript
const ACTIVITY_FETCH_LIMIT = 50_000;

const [links, activities] = await Promise.all([
  Link.find({ $or: [{ room: { $in: roomIds } }, { group: { $in: groupIds } }] })
    .populate('room')
    .populate('group'),
  Activity.find({
    user: hotel.user,
    hotel: hotel.id,
    createdAt: { $gte: start, $lte: end },
  })
    .sort({ createdAt: -1 })
    .limit(ACTIVITY_FETCH_LIMIT),
]);

const prevActivitiesRaw = await Activity.find({
  user: hotel.user,
  hotel: hotel.id,
  createdAt: { $gte: prevStart, $lte: prevEnd },
})
  .sort({ createdAt: -1 })
  .limit(ACTIVITY_FETCH_LIMIT);
```

Apply the same `.limit(ACTIVITY_FETCH_LIMIT)` to all `Activity.find` calls inside `getAdminInsights` as well.

- [ ] **Step 2: Add a MongoDB index to support these queries efficiently**

In `activity.model.ts`, add a compound index (this query runs on every dashboard load):

```typescript
activitySchema.index({ hotel: 1, createdAt: -1 });
activitySchema.index({ user: 1, hotel: 1, createdAt: -1 });
```

- [ ] **Step 3: Commit**

```bash
git add infiora-backend-main/infiora-backend-main/src/modules/insight/insight.service.ts
git add infiora-backend-main/infiora-backend-main/src/modules/activity/activity.model.ts
git commit -m "fix(performance): cap Activity queries at 50k records, add compound indexes for insight queries"
```

---

### Task 12: Add rate limiting to auth endpoints

**Why:** No brute-force protection on login/password-reset/refresh means an attacker can enumerate credentials or spam reset emails.

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/app.ts` (check existing rate limiter config)
- Modify: `infiora-backend-main/infiora-backend-main/src/routes/v1/auth.route.ts`

- [ ] **Step 1: Check existing rate limiter middleware**

```bash
grep -rn "rateLimit\|rate-limit\|rateLimiter" infiora-backend-main/infiora-backend-main/src/ --include="*.ts"
```

- [ ] **Step 2: Install express-rate-limit if not already installed**

```bash
cd infiora-backend-main/infiora-backend-main && npm list express-rate-limit
```

If not installed: `npm install express-rate-limit`

- [ ] **Step 3: Add a strict auth rate limiter to auth routes**

In `auth.route.ts`, add at the top:

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 min per IP
  message: { message: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
```

Apply to the sensitive endpoints:
```typescript
router.post('/login', authLimiter, authValidation.login, authController.login);
router.post('/forgot-password', authLimiter, authValidation.forgotPassword, authController.forgotPassword);
router.post('/refresh-tokens', authLimiter, authController.refreshTokens);
```

- [ ] **Step 4: Commit**

```bash
git add infiora-backend-main/
git commit -m "feat(security): add 10 req/15min rate limit on login, forgot-password, refresh-tokens endpoints"
```

---

## Phase 2 — Guest App Features

---

### Task 13: Background image support for rooms (Linktree-style)

**Why:** Hotels want brand-matching aesthetics. Currently only solid/gradient colors. Adding background image makes the guide feel premium and on-brand.

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/room/room.model.ts:34-38`
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/room/room.service.ts` (handle S3 upload for background image)
- Modify: `infiora-app-main/infiora-app-main/src/views/rooms/details/components/RoomView.tsx` (apply background image)
- Modify: Dashboard room edit form (add background image upload option)

- [ ] **Step 1: Add backgroundImage field to room schema**

In `room.model.ts`, extend the `background` sub-schema:

```typescript
background: {
  color: { type: String },
  direction: { type: String },
  type: { type: String }, // 'solid' | 'gradient' | 'image'
  image: { type: String }, // S3 URL when type === 'image'
  imageOpacity: { type: Number, default: 1 }, // 0–1, for overlay dimming
},
```

- [ ] **Step 2: Handle background image upload in room.service.ts**

Find the `updateRoomById` function. It already handles `req.files` for room images. Add handling for a `backgroundImage` file field:

```typescript
// In updateRoomById, alongside existing file handling:
if (files?.backgroundImage?.[0]) {
  const backgroundImageUrl = await uploadToS3(files.backgroundImage[0], 'backgrounds');
  updateData['background.image'] = backgroundImageUrl;
  updateData['background.type'] = 'image';
}
```

- [ ] **Step 3: Apply background image in guest app RoomView.tsx**

Find where background styles are applied in `RoomView.tsx`. Update to handle image type:

```tsx
const getBackgroundStyle = (background: IRoom['background']) => {
  if (background?.type === 'image' && background.image) {
    return {
      backgroundImage: `url(${background.image})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
    };
  }
  if (background?.type === 'gradient') {
    return {
      background: `linear-gradient(${background.direction || '135deg'}, ${background.color || '#667eea'}, ${background.color || '#764ba2'})`,
    };
  }
  return { backgroundColor: background?.color || '#f5f5f5' };
};

// If imageOpacity < 1, render a semi-transparent overlay:
{background?.type === 'image' && background.imageOpacity != null && background.imageOpacity < 1 && (
  <Box
    sx={{
      position: 'fixed',
      inset: 0,
      backgroundColor: `rgba(0,0,0,${1 - background.imageOpacity})`,
      zIndex: 0,
      pointerEvents: 'none',
    }}
  />
)}
```

- [ ] **Step 4: Add background image upload to dashboard room edit form**

In the dashboard room edit page, add an image upload section under the background color picker:

```tsx
<Box mt={2}>
  <Typography variant="caption" color="text.secondary">Background Image (overrides color)</Typography>
  <input
    type="file"
    accept="image/*"
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) setBackgroundImageFile(file);
    }}
  />
  {room.background?.image && (
    <Box mt={1}>
      <img src={room.background.image} alt="background preview" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 4 }} />
      <Button size="small" color="error" onClick={() => clearBackgroundImage()}>Remove</Button>
    </Box>
  )}
  {room.background?.type === 'image' && (
    <Box mt={1}>
      <Typography variant="caption">Overlay darkness</Typography>
      <Slider
        value={room.background.imageOpacity ?? 1}
        min={0.3}
        max={1}
        step={0.05}
        onChange={(_, val) => setField('background.imageOpacity', val)}
      />
    </Box>
  )}
</Box>
```

- [ ] **Step 5: Commit**

```bash
git add infiora-backend-main/ infiora-app-main/ infiora-dash-main/
git commit -m "feat: add background image support to rooms with S3 upload and overlay opacity control"
```

---

### Task 14: Language switcher UI with flags in guest app

**Why:** Auto-detection works but guests have no way to manually change language. International tourists (Croatia gets 20M+ tourists/year) frequently want to switch to their language. This makes the app feel polished and professional.

**Files:**
- Create: `infiora-app-main/infiora-app-main/src/components/LanguageSwitcher.tsx`
- Modify: Guest app room header/nav area to mount the switcher

- [ ] **Step 1: Create LanguageSwitcher component**

Create `src/components/LanguageSwitcher.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Box, IconButton, Menu, MenuItem, Typography } from '@mui/material'
import { useRoom } from '@/contexts/RoomContext'
import type { ILanguage } from '@/types'

export default function LanguageSwitcher() {
  const { languages, language, setLanguage } = useRoom()
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  if (!languages || languages.length <= 1) return null

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ gap: 0.5, px: 1, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
        aria-label="Switch language"
      >
        <Typography sx={{ fontSize: 18, lineHeight: 1 }}>{language?.flag || '🌐'}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
          {language?.name}
        </Typography>
      </IconButton>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { maxHeight: 320, minWidth: 160 } } }}
      >
        {languages.map((lang: ILanguage) => (
          <MenuItem
            key={lang.code}
            selected={lang.code === language?.code}
            onClick={() => { setLanguage(lang); setAnchor(null); }}
            sx={{ gap: 1.5 }}
          >
            <Typography sx={{ fontSize: 18 }}>{lang.flag}</Typography>
            <Typography variant="body2">{lang.name}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
```

- [ ] **Step 2: Mount LanguageSwitcher in the room header**

Find the room header/navbar in `RoomView.tsx` or the room layout. Add `<LanguageSwitcher />` to the top-right area:

```tsx
import LanguageSwitcher from '@/components/LanguageSwitcher'

// In the header/top bar:
<Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
  <LanguageSwitcher />
</Box>
```

- [ ] **Step 3: Verify languages.json has flag emoji for each language**

```bash
grep -c "flag" infiora-app-main/infiora-app-main/src/data/languages.json
```

If `flag` field is missing from language objects, add emoji flags. Example format: `{ "code": "hr", "name": "Croatian", "flag": "🇭🇷" }`.

- [ ] **Step 4: Commit**

```bash
git add infiora-app-main/
git commit -m "feat: add language switcher with flag emojis to guest app header"
```

---

### Task 15: Guest satisfaction urgent alert for 1–2 star ratings

**Why:** Hotels call this "service recovery." Catching a bad experience before the guest checks out (and posts on TripAdvisor) is worth more than any other analytics feature. Current system sends emails for ALL feedback with no differentiation.

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/room/room.controller.ts:93-131`
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/email/email.service.ts` (add urgent alert template)

- [ ] **Step 1: Add a sendUrgentFeedbackAlert email template**

In `email.service.ts`, add a new method:

```typescript
async sendUrgentFeedbackAlert(
  to: string,
  data: { hotelName: string; roomNumber: string; rating: number; message?: string; roomId: string }
): Promise<void> {
  const stars = '★'.repeat(data.rating) + '☆'.repeat(5 - data.rating);
  await this.transporter.sendMail({
    from: config.email.from,
    to,
    subject: `🚨 URGENT: ${data.rating}-star review — Room ${data.roomNumber} — ${data.hotelName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 2px solid #ef4444; border-radius: 8px;">
        <h2 style="color: #ef4444; margin-top: 0;">⚠️ Low Rating Alert</h2>
        <p><strong>Hotel:</strong> ${data.hotelName}</p>
        <p><strong>Room:</strong> ${data.roomNumber}</p>
        <p><strong>Rating:</strong> <span style="font-size: 20px;">${stars}</span> (${data.rating}/5)</p>
        ${data.message ? `<p><strong>Guest message:</strong></p><blockquote style="border-left: 3px solid #ef4444; padding-left: 12px; color: #555;">${data.message}</blockquote>` : '<p><em>No written feedback provided.</em></p>'}
        <p style="color: #888; font-size: 12px;">Act quickly — service recovery before checkout prevents negative reviews.</p>
      </div>
    `,
  });
}
```

- [ ] **Step 2: Trigger urgent alert in createFeedback when rating ≤ 2**

In `room.controller.ts`, after the existing `notificationPromises` block, add:

```typescript
// Urgent alert for low ratings (1–2 stars)
if (feedback.rating != null && feedback.rating <= 2 && room.feedback?.emails?.length > 0) {
  const urgentAlertPromises = room.feedback.emails.map((email: string) =>
    emailService.sendUrgentFeedbackAlert(email, {
      hotelName: room.hotel.name,
      roomNumber: room.number || 'N/A',
      rating: feedback.rating!,
      message: feedback.message,
      roomId: room.id,
    })
  );
  emailPromises.push(...urgentAlertPromises);
}
```

Note: This runs IN ADDITION to the normal feedback notification, not instead of it. Staff get two emails for bad ratings — the normal one and the urgent one. If that's too noisy, remove the normal one for ratings ≤ 2.

- [ ] **Step 3: Commit**

```bash
git add infiora-backend-main/
git commit -m "feat: send urgent alert email to hotel staff when guest rates 1–2 stars"
```

---

## Phase 3 — New Modules

---

### Task 16: Housekeeping Request Flow

**Why:** Replaces the phone-to-front-desk-to-housekeeping chain. Guests self-serve common requests; staff see them in a queue. Measurably reduces front desk interruptions.

**Architecture:** New `housekeeping` module in backend with `HousekeepingRequest` model. Guest app gets a new "Room Service" card with preset options. Dashboard gets a new Housekeeping tab with request queue.

**Files:**
- Create: `infiora-backend-main/.../modules/housekeeping/housekeeping.model.ts`
- Create: `infiora-backend-main/.../modules/housekeeping/housekeeping.service.ts`
- Create: `infiora-backend-main/.../modules/housekeeping/housekeeping.controller.ts`
- Create: `infiora-backend-main/.../modules/housekeeping/housekeeping.route.ts`
- Modify: `infiora-backend-main/.../routes/v1/index.ts` (add housekeeping routes)
- Create: `infiora-app-main/.../components/HousekeepingDrawer.tsx`
- Modify: `infiora-app-main/.../views/rooms/details/components/RoomView.tsx` (add housekeeping button)
- Create: `infiora-dash-main/.../views/housekeeping/HousekeepingPage.tsx`
- Modify: `infiora-dash-main/.../app/[lang]/(private)/layout.tsx` (add nav link)

- [ ] **Step 1: Create HousekeepingRequest model**

Create `src/modules/housekeeping/housekeeping.model.ts`:

```typescript
import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';

const PRESET_REQUESTS = [
  'Do Not Disturb',
  'Please Clean Room',
  'Extra Towels',
  'Extra Pillows',
  'Extra Blanket',
  'Toiletries',
  'Iron & Ironing Board',
  'Baby Cot',
  'Other',
] as const;

const housekeepingRequestSchema = new mongoose.Schema(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    roomNumber: { type: String },
    type: { type: String, enum: PRESET_REQUESTS, required: true },
    note: { type: String, maxlength: 300 },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

housekeepingRequestSchema.plugin(toJSON);
housekeepingRequestSchema.plugin(paginate);

// Auto-delete completed requests after 30 days
housekeepingRequestSchema.index({ completedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { status: 'completed' } });
housekeepingRequestSchema.index({ hotel: 1, status: 1, createdAt: -1 });

export const HousekeepingRequest = mongoose.model('HousekeepingRequest', housekeepingRequestSchema);
export { PRESET_REQUESTS };
```

- [ ] **Step 2: Create housekeeping controller**

Create `src/modules/housekeeping/housekeeping.controller.ts`:

```typescript
import httpStatus from 'http-status';
import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import { HousekeepingRequest } from './housekeeping.model';
import { pick } from '../utils';
import { IOptions } from '../paginate/paginate';
import { toObjectId } from '../utils/mongoUtils';
import Room from '../room/room.model';

export const createRequest = catchAsync(async (req: Request, res: Response) => {
  const room = await Room.findById(toObjectId(req.body.room)).populate('hotel');
  if (!room) throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');

  const request = await HousekeepingRequest.create({
    hotel: room.hotel.id,
    room: room.id,
    roomNumber: room.number,
    type: req.body.type,
    note: req.body.note,
  });

  res.status(httpStatus.CREATED).send(request);
});

export const getRequests = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['hotel', 'room', 'status']);
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page']);
  if (!options.sortBy) options.sortBy = 'createdAt:desc';

  const result = await (HousekeepingRequest as any).paginate(filter, options);
  res.send(result);
});

export const updateRequest = catchAsync(async (req: Request, res: Response) => {
  const requestId = toObjectId(req.params['requestId']);
  const updates: Record<string, any> = pick(req.body, ['status', 'note']);

  if (updates.status === 'completed') {
    updates.completedAt = new Date();
  }

  const updated = await HousekeepingRequest.findByIdAndUpdate(requestId, updates, { new: true });
  if (!updated) throw new ApiError(httpStatus.NOT_FOUND, 'Request not found');
  res.send(updated);
});
```

- [ ] **Step 3: Create housekeeping route**

Create `src/modules/housekeeping/housekeeping.route.ts`:

```typescript
import express from 'express';
import * as housekeepingController from './housekeeping.controller';
import auth from '../auth/auth.middleware';

const router = express.Router();

// Public — guests submit requests (no auth)
router.post('/', housekeepingController.createRequest);

// Protected — staff manage requests
router.get('/', auth('getHousekeepingRequests'), housekeepingController.getRequests);
router.patch('/:requestId', auth('manageHousekeepingRequests'), housekeepingController.updateRequest);

export default router;
```

- [ ] **Step 4: Register route in v1 index**

In `src/routes/v1/index.ts`:
```typescript
import housekeepingRoute from '../../modules/housekeeping/housekeeping.route';
router.use('/housekeeping', housekeepingRoute);
```

- [ ] **Step 5: Create HousekeepingDrawer in guest app**

Create `infiora-app-main/src/components/HousekeepingDrawer.tsx`:

```tsx
'use client'
import { useState } from 'react'
import {
  Drawer, Box, Typography, Button, Chip, TextField,
  Stack, CircularProgress, Alert
} from '@mui/material'
import { PRESET_REQUESTS } from '@/types'

const PRESET_ICONS: Record<string, string> = {
  'Do Not Disturb': '🚫',
  'Please Clean Room': '🧹',
  'Extra Towels': '🛁',
  'Extra Pillows': '🛏️',
  'Extra Blanket': '🛌',
  'Toiletries': '🪥',
  'Iron & Ironing Board': '👔',
  'Baby Cot': '🍼',
  'Other': '📝',
}

interface Props {
  open: boolean
  onClose: () => void
  roomId: string
}

export default function HousekeepingDrawer({ open, onClose, roomId }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!selected) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/housekeeping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: roomId, type: selected, note }),
      })
      if (!res.ok) throw new Error('Request failed')
      setSuccess(true)
    } catch {
      setError('Could not send request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelected(null); setNote(''); setSuccess(false); setError(''); onClose()
  }

  return (
    <Drawer anchor="bottom" open={open} onClose={handleClose}
      PaperProps={{ sx: { borderRadius: '16px 16px 0 0', maxHeight: '80vh' } }}
    >
      <Box p={3}>
        {success ? (
          <Stack spacing={2} alignItems="center" py={3}>
            <Typography fontSize={48}>✅</Typography>
            <Typography variant="h6" fontWeight={600}>Request Sent!</Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Our team has been notified and will assist you shortly.
            </Typography>
            <Button variant="contained" onClick={handleClose} fullWidth>Done</Button>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Typography variant="h6" fontWeight={600}>Housekeeping Request</Typography>
            <Typography variant="body2" color="text.secondary">Select what you need:</Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {Object.keys(PRESET_ICONS).map(type => (
                <Chip
                  key={type}
                  label={`${PRESET_ICONS[type]} ${type}`}
                  onClick={() => setSelected(type)}
                  color={selected === type ? 'primary' : 'default'}
                  variant={selected === type ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
            <TextField
              label="Additional notes (optional)"
              multiline
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              inputProps={{ maxLength: 300 }}
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button
              variant="contained"
              disabled={!selected || loading}
              onClick={handleSubmit}
              startIcon={loading ? <CircularProgress size={16} /> : null}
            >
              Send Request
            </Button>
          </Stack>
        )}
      </Box>
    </Drawer>
  )
}
```

- [ ] **Step 6: Add Housekeeping button to room view**

In `RoomView.tsx` or wherever room action buttons are rendered, add a housekeeping button:

```tsx
import HousekeepingDrawer from '@/components/HousekeepingDrawer'

const [housekeepingOpen, setHousekeepingOpen] = useState(false)

// In the button list:
<Button
  variant="outlined"
  startIcon={<span>🧹</span>}
  onClick={() => setHousekeepingOpen(true)}
  fullWidth
>
  Housekeeping Request
</Button>

<HousekeepingDrawer
  open={housekeepingOpen}
  onClose={() => setHousekeepingOpen(false)}
  roomId={room.id}
/>
```

- [ ] **Step 7: Create Housekeeping management page in dashboard**

Create `infiora-dash-main/src/app/[lang]/(private)/housekeeping/page.tsx`:

```tsx
'use client'
import { useState } from 'react'
import {
  Box, Typography, Card, Chip, IconButton,
  Table, TableBody, TableCell, TableHead, TableRow, Stack
} from '@mui/material'
import { useGetHousekeepingRequestsQuery, useUpdateHousekeepingRequestMutation } from '@/redux/api/housekeepingApi'
import { useAuthUser } from '@/hooks/useAuthUser'

const STATUS_COLORS = {
  pending: 'warning',
  in_progress: 'info',
  completed: 'success',
} as const

export default function HousekeepingPage() {
  const { authUser } = useAuthUser()
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const { data, refetch } = useGetHousekeepingRequestsQuery({
    hotel: authUser?.hotel?.id,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    limit: 100,
  })
  const [updateRequest] = useUpdateHousekeepingRequestMutation()

  const advance = async (id: string, current: string) => {
    const next = current === 'pending' ? 'in_progress' : 'completed'
    await updateRequest({ id, status: next })
    refetch()
  }

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={700} mb={2}>Housekeeping Requests</Typography>
      <Stack direction="row" gap={1} mb={2}>
        {['pending', 'in_progress', 'completed', 'all'].map(s => (
          <Chip
            key={s}
            label={s.replace('_', ' ')}
            onClick={() => setStatusFilter(s)}
            color={statusFilter === s ? 'primary' : 'default'}
            variant={statusFilter === s ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>
      <Card variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Room</TableCell>
              <TableCell>Request</TableCell>
              <TableCell>Note</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data?.results || []).map((req: any) => (
              <TableRow key={req.id}>
                <TableCell fontWeight={600}>{req.roomNumber || '—'}</TableCell>
                <TableCell>{req.type}</TableCell>
                <TableCell>{req.note || '—'}</TableCell>
                <TableCell>{new Date(req.createdAt).toLocaleTimeString()}</TableCell>
                <TableCell>
                  <Chip size="small" label={req.status} color={STATUS_COLORS[req.status as keyof typeof STATUS_COLORS]} />
                </TableCell>
                <TableCell>
                  {req.status !== 'completed' && (
                    <Chip
                      size="small"
                      label={req.status === 'pending' ? 'Start' : 'Complete'}
                      onClick={() => advance(req.id, req.status)}
                      variant="outlined"
                      clickable
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Box>
  )
}
```

- [ ] **Step 8: Create RTK Query housekeeping API hook**

Create `infiora-dash-main/src/redux/api/housekeepingApi.ts`:

```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const housekeepingApi = createApi({
  reducerPath: 'housekeepingApi',
  baseQuery: fetchBaseQuery({ baseUrl: process.env.NEXT_PUBLIC_API_URL, credentials: 'include' }),
  endpoints: (builder) => ({
    getHousekeepingRequests: builder.query<any, { hotel?: string; status?: string; limit?: number }>({
      query: (params) => ({ url: '/v1/housekeeping', params }),
    }),
    updateHousekeepingRequest: builder.mutation<any, { id: string; status: string }>({
      query: ({ id, ...body }) => ({ url: `/v1/housekeeping/${id}`, method: 'PATCH', body }),
    }),
  }),
})

export const { useGetHousekeepingRequestsQuery, useUpdateHousekeepingRequestMutation } = housekeepingApi
```

- [ ] **Step 9: Commit**

```bash
git add infiora-backend-main/ infiora-app-main/ infiora-dash-main/
git commit -m "feat: add housekeeping request module — guest drawer, backend API, staff management page"
```

---

### Task 17: Maintenance Issue Reporting

**Why:** Unaddressed maintenance = bad reviews + financial loss. This gives guests a way to report issues and gives hotels a trackable ticket system.

**Files:**
- Create: `infiora-backend-main/.../modules/maintenance/` (model, controller, route — similar pattern to housekeeping)
- Create: `infiora-app-main/.../components/MaintenanceDrawer.tsx`
- Create: `infiora-dash-main/.../views/maintenance/MaintenancePage.tsx`

- [ ] **Step 1: Create MaintenanceIssue model**

Create `src/modules/maintenance/maintenance.model.ts`:

```typescript
import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';

const ISSUE_CATEGORIES = ['Plumbing', 'Electrical', 'Air Conditioning / Heating', 'Furniture', 'Cleaning', 'Internet / TV', 'Door / Lock', 'Other'] as const;

const maintenanceIssueSchema = new mongoose.Schema(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    roomNumber: { type: String },
    category: { type: String, enum: ISSUE_CATEGORIES, required: true },
    description: { type: String, maxlength: 500 },
    photo: { type: String }, // S3 URL
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

maintenanceIssueSchema.plugin(toJSON);
maintenanceIssueSchema.plugin(paginate);
maintenanceIssueSchema.index({ hotel: 1, status: 1, createdAt: -1 });
maintenanceIssueSchema.index({ resolvedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60, partialFilterExpression: { status: 'resolved' } });

export const MaintenanceIssue = mongoose.model('MaintenanceIssue', maintenanceIssueSchema);
export { ISSUE_CATEGORIES };
```

- [ ] **Step 2: Create maintenance controller**

Create `src/modules/maintenance/maintenance.controller.ts`:

```typescript
import httpStatus from 'http-status';
import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import { MaintenanceIssue } from './maintenance.model';
import { pick } from '../utils';
import { IOptions } from '../paginate/paginate';
import { toObjectId } from '../utils/mongoUtils';
import Room from '../room/room.model';
import { uploadToS3 } from '../utils/s3Utils'; // use the existing S3 upload utility

export const createIssue = catchAsync(async (req: Request, res: Response) => {
  const room = await Room.findById(toObjectId(req.body.room)).populate('hotel');
  if (!room) throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');

  let photoUrl: string | undefined;
  if (req.file) {
    photoUrl = await uploadToS3(req.file, 'maintenance');
  }

  const issue = await MaintenanceIssue.create({
    hotel: room.hotel.id,
    room: room.id,
    roomNumber: room.number,
    category: req.body.category,
    description: req.body.description,
    photo: photoUrl,
    priority: req.body.priority || 'medium',
  });

  res.status(httpStatus.CREATED).send(issue);
});

export const getIssues = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['hotel', 'room', 'status', 'priority', 'category']);
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page']);
  if (!options.sortBy) options.sortBy = 'createdAt:desc';
  const result = await (MaintenanceIssue as any).paginate(filter, options);
  res.send(result);
});

export const updateIssue = catchAsync(async (req: Request, res: Response) => {
  const issueId = toObjectId(req.params['issueId']);
  const updates = pick(req.body, ['status', 'priority', 'description']);
  if (updates.status === 'resolved') updates.resolvedAt = new Date();
  const updated = await MaintenanceIssue.findByIdAndUpdate(issueId, updates, { new: true });
  if (!updated) throw new ApiError(httpStatus.NOT_FOUND, 'Issue not found');
  res.send(updated);
});
```

- [ ] **Step 3: Create maintenance route and register it**

Create `src/modules/maintenance/maintenance.route.ts` (same pattern as housekeeping route, with `multipart/form-data` support for photo upload using existing multer middleware).

In `src/routes/v1/index.ts`:
```typescript
import maintenanceRoute from '../../modules/maintenance/maintenance.route';
router.use('/maintenance', maintenanceRoute);
```

- [ ] **Step 4: Create MaintenanceDrawer in guest app**

Create `infiora-app-main/src/components/MaintenanceDrawer.tsx` — similar to HousekeepingDrawer but with:
- Category chip selector (Plumbing, Electrical, etc.)
- Text description field (required)
- Optional photo upload (`<input type="file" accept="image/*" capture="environment">`)
- Same success/error state pattern

```tsx
'use client'
import { useState, useRef } from 'react'
import {
  Drawer, Box, Typography, Button, Chip, TextField,
  Stack, CircularProgress, Alert
} from '@mui/material'

const CATEGORIES = ['Plumbing', 'Electrical', 'Air Conditioning / Heating', 'Furniture', 'Cleaning', 'Internet / TV', 'Door / Lock', 'Other']

interface Props { open: boolean; onClose: () => void; roomId: string }

export default function MaintenanceDrawer({ open, onClose, roomId }: Props) {
  const [category, setCategory] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async () => {
    if (!category || !description.trim()) return
    setLoading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('room', roomId)
      form.append('category', category)
      form.append('description', description)
      if (photo) form.append('photo', photo)

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/maintenance`, {
        method: 'POST',
        body: form,
      })
      if (!res.ok) throw new Error()
      setSuccess(true)
    } catch {
      setError('Could not submit report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setCategory(null); setDescription(''); setPhoto(null); setSuccess(false); setError(''); onClose()
  }

  return (
    <Drawer anchor="bottom" open={open} onClose={handleClose}
      PaperProps={{ sx: { borderRadius: '16px 16px 0 0', maxHeight: '85vh' } }}
    >
      <Box p={3}>
        {success ? (
          <Stack spacing={2} alignItems="center" py={3}>
            <Typography fontSize={48}>✅</Typography>
            <Typography variant="h6" fontWeight={600}>Report Submitted</Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Our maintenance team has been notified. Thank you for letting us know.
            </Typography>
            <Button variant="contained" onClick={handleClose} fullWidth>Done</Button>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Typography variant="h6" fontWeight={600}>Report an Issue</Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {CATEGORIES.map(c => (
                <Chip
                  key={c} label={c}
                  onClick={() => setCategory(c)}
                  color={category === c ? 'error' : 'default'}
                  variant={category === c ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
            <TextField
              label="Describe the issue"
              multiline rows={3}
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              inputProps={{ maxLength: 500 }}
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={e => setPhoto(e.target.files?.[0] || null)}
            />
            <Button variant="outlined" onClick={() => fileRef.current?.click()}>
              {photo ? `📷 ${photo.name}` : '📷 Add Photo (optional)'}
            </Button>
            {error && <Alert severity="error">{error}</Alert>}
            <Button
              variant="contained"
              color="error"
              disabled={!category || !description.trim() || loading}
              onClick={handleSubmit}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            >
              Submit Report
            </Button>
          </Stack>
        )}
      </Box>
    </Drawer>
  )
}
```

- [ ] **Step 5: Add "Report an Issue" button to room view and create maintenance dashboard page**

Same pattern as housekeeping — add button to `RoomView.tsx`, create `MaintenancePage.tsx` in dashboard with open/in_progress/resolved filter tabs.

- [ ] **Step 6: Commit**

```bash
git add infiora-backend-main/ infiora-app-main/ infiora-dash-main/
git commit -m "feat: add maintenance issue reporting module with photo upload, backend API, staff dashboard"
```

---

### Task 18: Staff Dashboard Notification Bell

**Why:** Staff currently only know about new orders/feedback/maintenance if they keep the dashboard open. A notification system (badge + dropdown) replaces constant manual refreshing.

**Files:**
- Create: `infiora-dash-main/.../components/NotificationBell.tsx`
- Modify: `infiora-dash-main/.../components/layout/navbar` (add bell to top bar)
- Modify: Backend to add a `GET /v1/notifications/summary` endpoint

- [ ] **Step 1: Create backend notifications summary endpoint**

Create `src/modules/notifications/notifications.controller.ts`:

```typescript
import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { HousekeepingRequest } from '../housekeeping/housekeeping.model';
import { MaintenanceIssue } from '../maintenance/maintenance.model';
import { Order } from '../orders/orders.model'; // adjust import path
import { Feedback } from '../feedback/feedback.model'; // adjust import path

export const getSummary = catchAsync(async (req: Request, res: Response) => {
  const hotelId = req.user?.hotel;
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

  const [pendingOrders, openMaintenance, pendingHousekeeping, recentBadFeedback] = await Promise.all([
    Order.countDocuments({ hotel: hotelId, status: 'pending' }),
    MaintenanceIssue.countDocuments({ hotel: hotelId, status: 'open' }),
    HousekeepingRequest.countDocuments({ hotel: hotelId, status: 'pending' }),
    Feedback.countDocuments({ hotel: hotelId, rating: { $lte: 2 }, createdAt: { $gte: fifteenMinAgo } }),
  ]);

  res.send({
    pendingOrders,
    openMaintenance,
    pendingHousekeeping,
    recentBadFeedback,
    total: pendingOrders + openMaintenance + pendingHousekeeping + recentBadFeedback,
  });
});
```

- [ ] **Step 2: Register at GET /v1/notifications/summary**

Create route and add to `src/routes/v1/index.ts`.

- [ ] **Step 3: Create NotificationBell component**

Create `infiora-dash-main/src/components/NotificationBell.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Badge, IconButton, Menu, MenuItem, Typography, Divider, Box, Chip } from '@mui/material'
import { useGetNotificationSummaryQuery } from '@/redux/api/notificationsApi'

export default function NotificationBell() {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const { data, refetch } = useGetNotificationSummaryQuery(undefined, {
    pollingInterval: 30_000, // refresh every 30 seconds
  })

  const total = data?.total || 0

  return (
    <>
      <IconButton onClick={(e) => { setAnchor(e.currentTarget); refetch(); }}>
        <Badge badgeContent={total || null} color="error">
          <i className="ri-notification-3-line" style={{ fontSize: 20 }} />
        </Badge>
      </IconButton>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 260 } } }}
      >
        <Box px={2} py={1}>
          <Typography variant="subtitle2" fontWeight={600}>Notifications</Typography>
        </Box>
        <Divider />
        {[
          { label: 'Pending Orders', value: data?.pendingOrders, href: '/orders', color: 'primary' },
          { label: 'Open Maintenance', value: data?.openMaintenance, href: '/maintenance', color: 'error' },
          { label: 'Housekeeping Pending', value: data?.pendingHousekeeping, href: '/housekeeping', color: 'warning' },
          { label: 'Bad Reviews (15m)', value: data?.recentBadFeedback, href: '/insights?tab=3', color: 'error' },
        ].map(({ label, value, href, color }) => (
          value > 0 && (
            <MenuItem key={label} component="a" href={href} onClick={() => setAnchor(null)}>
              <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
                <Typography variant="body2">{label}</Typography>
                <Chip label={value} size="small" color={color as any} />
              </Box>
            </MenuItem>
          )
        ))}
        {total === 0 && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">All clear ✓</Typography>
          </MenuItem>
        )}
      </Menu>
    </>
  )
}
```

- [ ] **Step 4: Add NotificationBell to dashboard navbar**

Find the top navigation bar component and add `<NotificationBell />` next to the user avatar.

- [ ] **Step 5: Commit**

```bash
git add infiora-backend-main/ infiora-dash-main/
git commit -m "feat: add notification bell to dashboard with live counts for orders, maintenance, housekeeping, bad reviews"
```

---

## Phase 4 — Dashboard Power Features

---

### Task 19: QR Code Generator in Dashboard

**Why:** Every new hotel needs QR codes printed and placed in room frames. Currently done manually. Auto-generating them from the dashboard removes the main onboarding friction.

**Files:**
- Create: `infiora-dash-main/.../components/QRCodeGenerator.tsx`
- Modify: Dashboard room management page (add QR button to each room row)

- [ ] **Step 1: Install qrcode library**

```bash
cd infiora-dash-main/infiora-dash-main && npm install qrcode @types/qrcode
```

- [ ] **Step 2: Create QRCodeGenerator component**

Create `src/components/QRCodeGenerator.tsx`:

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogTitle, DialogContent, Box, Button, Stack, Typography, Slider } from '@mui/material'
import QRCode from 'qrcode'

interface Props {
  url: string
  roomNumber: string
  hotelName: string
  hotelLogo?: string
  open: boolean
  onClose: () => void
}

export default function QRCodeGenerator({ url, roomNumber, hotelName, hotelLogo, open, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState(256)

  useEffect(() => {
    if (!open || !canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, url, {
      width: size,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    })
  }, [url, open, size])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `QR-Room-${roomNumber}-${hotelName}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handlePrint = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>QR Code - Room ${roomNumber}</title>
      <style>
        body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; }
        img { width: ${size}px; height: ${size}px; }
        h2 { margin: 16px 0 4px; font-size: 20px; }
        p { margin: 0; color: #666; font-size: 14px; }
        @media print { button { display: none; } }
      </style>
      </head>
      <body>
        ${hotelLogo ? `<img src="${hotelLogo}" style="width:80px;height:80px;object-fit:contain;margin-bottom:8px;" />` : ''}
        <img src="${dataUrl}" />
        <h2>Room ${roomNumber}</h2>
        <p>${hotelName}</p>
        <p style="margin-top:8px;font-size:12px;color:#aaa;">Scan for digital guide</p>
        <button onclick="window.print()" style="margin-top:16px;padding:8px 24px;cursor:pointer;">Print</button>
      </body></html>
    `)
    win.document.close()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>QR Code — Room {roomNumber}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} alignItems="center">
          <canvas ref={canvasRef} style={{ borderRadius: 8, border: '1px solid #eee' }} />
          <Box width="100%">
            <Typography variant="caption" color="text.secondary">Size: {size}px</Typography>
            <Slider value={size} min={128} max={512} step={32} onChange={(_, v) => setSize(v as number)} />
          </Box>
          <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ wordBreak: 'break-all' }}>
            {url}
          </Typography>
          <Stack direction="row" gap={1} width="100%">
            <Button variant="outlined" fullWidth onClick={handleDownload}>Download PNG</Button>
            <Button variant="contained" fullWidth onClick={handlePrint}>Print</Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Add QR button to room list in dashboard**

In the rooms management page, add a QR icon button to each room row:

```tsx
import QRCodeGenerator from '@/components/QRCodeGenerator'

const [qrRoom, setQrRoom] = useState<{ url: string; number: string } | null>(null)

// In the table row actions:
<IconButton size="small" title="Generate QR Code" onClick={() => setQrRoom({ url: room.url, number: room.number })}>
  <i className="ri-qr-code-line" />
</IconButton>

{qrRoom && (
  <QRCodeGenerator
    open
    url={qrRoom.url}
    roomNumber={qrRoom.number}
    hotelName={authUser?.hotel?.name || ''}
    hotelLogo={authUser?.hotel?.image}
    onClose={() => setQrRoom(null)}
  />
)}
```

- [ ] **Step 4: Commit**

```bash
git add infiora-dash-main/
git commit -m "feat: add QR code generator with download and print to room management dashboard"
```

---

### Task 20: Weekly Analytics Scheduled Report Email

**Why:** Hotel managers don't log into dashboards every day. A weekly email showing views, rating, orders, and top issues keeps Infiora visible and valuable without requiring any effort from the hotel.

**Files:**
- Create: `infiora-backend-main/.../modules/email/weeklyReport.ts`
- Create: `infiora-backend-main/.../modules/scheduler/weeklyReport.job.ts`
- Modify: `infiora-backend-main/.../app.ts` (or server entry point) to register the cron job

- [ ] **Step 1: Install node-cron**

```bash
cd infiora-backend-main/infiora-backend-main && npm install node-cron @types/node-cron
```

- [ ] **Step 2: Create weekly report email template**

Create `src/modules/email/weeklyReport.ts`:

```typescript
import { emailService } from './index';
import { getHotelInsights } from '../insight/insight.service';
import Hotel from '../hotel/hotel.model';
import { Feedback } from '../feedback/feedback.model';
import config from '../../config/config';

const formatChange = (n: number) => (n > 0 ? `▲ ${n.toFixed(1)}%` : n < 0 ? `▼ ${Math.abs(n).toFixed(1)}%` : '—');

export async function sendWeeklyReports() {
  const hotels = await Hotel.find({ isActive: true }).populate('user');
  const now = new Date();
  const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = now.toISOString();

  for (const hotel of hotels) {
    try {
      const reportEmails: string[] = hotel.reportEmails || (hotel.email ? [hotel.email] : []);
      if (reportEmails.length === 0) continue;

      const insights = await getHotelInsights({ hotel, startDate, endDate, language: '', device: '' });
      const { keyMetrics: km, change: ch } = insights;

      const feedbacks = await Feedback.find({
        hotel: hotel.id,
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });
      const avgRating = feedbacks.length > 0
        ? (feedbacks.reduce((s, f) => s + (f.rating || 0), 0) / feedbacks.length).toFixed(1)
        : 'N/A';
      const badFeedbackCount = feedbacks.filter(f => f.rating != null && f.rating <= 2).length;

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            ${hotel.image ? `<img src="${hotel.image}" style="height:48px;object-fit:contain;" />` : ''}
            <h2 style="margin: 8px 0 4px;">${hotel.name}</h2>
            <p style="color:#888;margin:0;">Weekly Report · ${new Date(startDate).toLocaleDateString('en-GB')} – ${new Date(endDate).toLocaleDateString('en-GB')}</p>
          </div>

          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:12px;background:#f9f9f9;border-radius:8px;text-align:center;width:25%;">
                <div style="font-size:24px;font-weight:700;">${km.views}</div>
                <div style="font-size:12px;color:#888;">Total Views</div>
                <div style="font-size:11px;color:${(ch?.views||0)>=0?'#16a34a':'#dc2626'}">${formatChange(ch?.views||0)}</div>
              </td>
              <td style="padding:12px;background:#f9f9f9;border-radius:8px;text-align:center;width:25%;">
                <div style="font-size:24px;font-weight:700;">${km.taps}</div>
                <div style="font-size:12px;color:#888;">Button Taps</div>
                <div style="font-size:11px;color:${(ch?.taps||0)>=0?'#16a34a':'#dc2626'}">${formatChange(ch?.taps||0)}</div>
              </td>
              <td style="padding:12px;background:#f9f9f9;border-radius:8px;text-align:center;width:25%;">
                <div style="font-size:24px;font-weight:700;">${avgRating} ★</div>
                <div style="font-size:12px;color:#888;">Avg Rating</div>
                <div style="font-size:11px;color:#888;">${feedbacks.length} reviews</div>
              </td>
              <td style="padding:12px;background:${badFeedbackCount>0?'#fef2f2':'#f9f9f9'};border-radius:8px;text-align:center;width:25%;">
                <div style="font-size:24px;font-weight:700;color:${badFeedbackCount>0?'#dc2626':'inherit'}">${badFeedbackCount}</div>
                <div style="font-size:12px;color:#888;">Low Ratings (1–2★)</div>
              </td>
            </tr>
          </table>

          <div style="margin-top:24px;text-align:center;">
            <a href="${config.urls.dash}/insights" style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              View Full Dashboard →
            </a>
          </div>

          <p style="color:#ccc;font-size:11px;text-align:center;margin-top:24px;">
            Powered by Infiora · <a href="mailto:support@infiora.hr" style="color:#ccc;">Unsubscribe</a>
          </p>
        </div>
      `;

      await emailService.sendEmail({
        to: reportEmails.join(','),
        subject: `📊 Weekly Report: ${hotel.name} — ${km.views} views this week`,
        html,
      });
    } catch (err) {
      console.error(`Weekly report failed for hotel ${hotel.name}:`, err);
    }
  }
}
```

- [ ] **Step 3: Schedule the job — every Monday at 9am**

Create `src/modules/scheduler/weeklyReport.job.ts`:

```typescript
import cron from 'node-cron';
import { sendWeeklyReports } from '../email/weeklyReport';

export function registerWeeklyReportJob() {
  // Every Monday at 09:00
  cron.schedule('0 9 * * 1', async () => {
    console.log('[cron] Sending weekly reports...');
    await sendWeeklyReports();
    console.log('[cron] Weekly reports done.');
  });
}
```

- [ ] **Step 4: Register the cron job at app startup**

In `src/app.ts` or `src/index.ts` (after DB connection):

```typescript
import { registerWeeklyReportJob } from './modules/scheduler/weeklyReport.job';

// After DB connects:
registerWeeklyReportJob();
```

- [ ] **Step 5: Add `reportEmails` field to Hotel model**

In `hotel.model.ts`, add:
```typescript
reportEmails: [{ type: String }],
```

And expose it in the dashboard hotel settings so hotels can configure who receives the weekly report.

- [ ] **Step 6: Commit**

```bash
git add infiora-backend-main/
git commit -m "feat: weekly analytics report email sent every Monday at 9am with views, taps, rating, and bad review count"
```

---

## Privacy Policy & Terms of Use (Final Document)

> These are the final texts to publish at `/privacy` and `/terms` in the guest app and on the marketing site.

### Privacy Policy

See Task 6 — the full Privacy Policy text is in the React component created there. Publish it at `infiora.hr/privacy` and link from every guest app footer.

### Terms of Use

Create `infiora-app-main/src/app/terms/page.tsx`:

```tsx
export const metadata = { title: 'Terms of Use | Infiora' }

export default function TermsPage() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>Terms of Use</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Last updated: 17 April 2026
      </Typography>
      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" fontWeight={600} gutterBottom>1. Acceptance</Typography>
      <Typography variant="body2" paragraph>
        By accessing this digital guest guide ("the Guide"), you agree to these Terms of Use. The Guide is provided by Infiora d.o.o. ("Infiora") on behalf of the hotel you are visiting ("Hotel").
      </Typography>

      <Typography variant="h6" fontWeight={600} gutterBottom>2. Purpose</Typography>
      <Typography variant="body2" paragraph>
        The Guide provides information about the Hotel and its services. It allows you to browse hotel amenities, submit feedback, and place service requests. It is intended for use by hotel guests only.
      </Typography>

      <Typography variant="h6" fontWeight={600} gutterBottom>3. Acceptable Use</Typography>
      <Typography variant="body2" paragraph>
        You may not: (a) attempt to access systems or data beyond what is provided to you; (b) submit false, misleading, or harmful content; (c) use the Guide for any unlawful purpose; (d) attempt to reverse-engineer or scrape content from the Guide.
      </Typography>

      <Typography variant="h6" fontWeight={600} gutterBottom>4. Orders and Service Requests</Typography>
      <Typography variant="body2" paragraph>
        Orders and service requests placed through the Guide are fulfilled by the Hotel, not by Infiora. Infiora is not responsible for the delivery, quality, or outcome of any hotel services. All billing and fulfilment is the Hotel's responsibility.
      </Typography>

      <Typography variant="h6" fontWeight={600} gutterBottom>5. Intellectual Property</Typography>
      <Typography variant="body2" paragraph>
        The Guide's software, design, and platform are owned by Infiora. Hotel content (photos, descriptions, menus) is owned by the Hotel. You may not copy, reproduce, or redistribute any content without written permission.
      </Typography>

      <Typography variant="h6" fontWeight={600} gutterBottom>6. Disclaimer of Warranties</Typography>
      <Typography variant="body2" paragraph>
        The Guide is provided "as is." Infiora and the Hotel do not warrant that the Guide will be uninterrupted, error-free, or that any information displayed is accurate at all times. Hotel information (prices, availability, hours) may change without notice.
      </Typography>

      <Typography variant="h6" fontWeight={600} gutterBottom>7. Limitation of Liability</Typography>
      <Typography variant="body2" paragraph>
        To the maximum extent permitted by law, neither Infiora nor the Hotel shall be liable for indirect, incidental, or consequential damages arising from your use of the Guide.
      </Typography>

      <Typography variant="h6" fontWeight={600} gutterBottom>8. Governing Law</Typography>
      <Typography variant="body2" paragraph>
        These Terms are governed by the laws of the Republic of Croatia. Any disputes shall be subject to the exclusive jurisdiction of Croatian courts.
      </Typography>

      <Typography variant="h6" fontWeight={600} gutterBottom>9. Contact</Typography>
      <Typography variant="body2" paragraph>
        Infiora d.o.o., Croatia · legal@infiora.hr
      </Typography>
    </Container>
  )
}
```

Also add `/terms` link to the guest app footer alongside `/privacy`.

---

## Summary of All Changes

| Phase | Task | Files Touched | Effort |
|-------|------|--------------|--------|
| 1 | localStorage → sessionStorage | RoomContext.tsx | 15 min |
| 1 | Remove returningViews backend | insight.service.ts | 20 min |
| 1 | Remove returningViews dashboard | OverviewTab, RoomsTab, types | 30 min |
| 1 | Consent checkbox on feedback | FeedbackDrawer.tsx | 45 min |
| 1 | MongoDB TTL index | activity.model.ts | 10 min |
| 1 | Privacy Policy page | new page.tsx + footer | 30 min |
| 1 | Fix NextAuth auth bypass | auth.ts, login/route.ts | 45 min |
| 1 | Fix Admin AuthGuard | AuthGuard.tsx | 20 min |
| 1 | Remove demo login route | delete users.ts | 10 min |
| 1 | Feedback email projection | room.controller.ts | 15 min |
| 1 | Fix PageTracker loop | PageTracker.tsx | 15 min |
| 1 | Insight query limits + indexes | insight.service.ts, activity.model.ts | 20 min |
| 1 | Rate limiting on auth endpoints | auth.route.ts | 30 min |
| 2 | Background image support | room.model.ts, RoomView.tsx, dashboard | 3 hrs |
| 2 | Language switcher with flags | new LanguageSwitcher.tsx | 1 hr |
| 2 | Guest satisfaction urgent alert | room.controller.ts, email.service.ts | 45 min |
| 3 | Housekeeping request module | 8 new files across 3 repos | 4 hrs |
| 3 | Maintenance issue module | 8 new files across 3 repos | 3 hrs |
| 3 | Dashboard notification bell | 3 new files | 2 hrs |
| 4 | QR code generator | QRCodeGenerator.tsx + rooms page | 2 hrs |
| 4 | Weekly report email | weeklyReport.ts + cron job | 2 hrs |

**Phase 1 total: ~5 hours — ship before going to production with real hotel data.**
**Phases 2–4 total: ~17 hours — ship in order of priority.**
