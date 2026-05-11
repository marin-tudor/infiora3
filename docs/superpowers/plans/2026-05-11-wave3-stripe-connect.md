# Wave 3 — Stripe Connect

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable hotels to accept card payments online via Stripe Connect Express. Infiora collects an application fee on each transaction. Admin panel shows per-hotel GMV and fee revenue. Fee percentage is set per-hotel (or globally) by superadmin.

**Architecture:** Hotels onboard via Stripe Express hosted flow — Infiora calls `stripe.accountLinks.create()` and redirects the hotel to Stripe. On checkout the guest app creates a `PaymentIntent` via backend (with `application_fee_amount` + `transfer_data.destination`), then Stripe.js confirms the payment. Stripe webhooks drive order creation and status updates. Admin panel aggregates fee data from the `Order` collection.

**Tech Stack:** `stripe` Node SDK, `@stripe/stripe-js`, `@stripe/react-stripe-js`, Mongoose, Express, Next.js

**Required environment variables:**
- Backend: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PLATFORM_FEE_PERCENT` (global default)
- Guest app / Dashboard: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

---

## File Map

**Backend — create:**
- `src/modules/stripe/stripe.service.ts` — Stripe SDK operations (onboarding, PaymentIntent)
- `src/modules/stripe/stripe-webhook.handler.ts` — handle webhook events
- `src/routes/v1/stripe.route.ts` — webhook + hotel onboarding routes

**Backend — modify:**
- `src/modules/hotel/hotel.model.ts` — add stripeAccountId, stripeAccountStatus, stripePlatformFeePercent
- `src/modules/hotel/hotel.interfaces.ts` — update IHotel
- `src/modules/orders/guest-order.model.ts` — add Stripe payment fields
- `src/modules/orders/orders.interfaces.ts` — update IGuestOrder with Stripe fields
- `src/modules/orders/orders.service.ts` — update placeOrder to support Stripe payment intent
- `src/modules/orders/orders.controller.ts` — add createPaymentIntent controller
- `src/routes/v1/orders.route.ts` — add payment-intent route
- `src/app.ts` — register stripe routes + raw body parser for webhook
- `src/config/config.ts` — add Stripe env vars

**Dashboard — create:**
- `src/views/orders/components/StripeConnect.tsx` — Stripe onboarding UI for OrderSettings

**Dashboard — modify:**
- `src/types/index.ts` — add Stripe fields to IHotel, update IGuestOrder
- `src/redux/api/ordersApi.ts` — add Stripe onboarding endpoints
- `src/views/orders/components/OrderSettings.tsx` — add Stripe Connect section

**Admin — create:**
- `src/views/stripe/StripeRevenuePage.tsx` — revenue analytics per hotel

**Admin — modify:**
- Admin nav / routes — add Stripe Revenue page
- Admin Hotel detail — add per-hotel fee % field
- Admin settings — add global fee % setting

**Guest app — modify:**
- `src/views/orders/GuestOrderPage.tsx` — Stripe Payment Element for online payment

---

## Task 1: Install Stripe SDKs and add env vars

**Files:**
- `infiora-backend-main/infiora-backend-main/package.json`
- `infiora-dash-main/infiora-dash-main/package.json`
- `infiora-app-main/infiora-app-main/package.json`

- [ ] **Step 1: Install Stripe in backend**

```bash
cd infiora-backend-main/infiora-backend-main
yarn add stripe
yarn add -D @types/stripe
```

- [ ] **Step 2: Install Stripe.js in dashboard and guest app**

```bash
cd infiora-dash-main/infiora-dash-main
yarn add @stripe/stripe-js @stripe/react-stripe-js

cd ../../infiora-app-main/infiora-app-main
yarn add @stripe/stripe-js @stripe/react-stripe-js
```

- [ ] **Step 3: Add env vars to backend .env**

Add to `infiora-backend-main/infiora-backend-main/.env`:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PLATFORM_FEE_PERCENT=2.5
```

- [ ] **Step 4: Add env vars to dashboard and app .env.local**

In `infiora-dash-main/infiora-dash-main/.env.local` and `infiora-app-main/infiora-app-main/.env.local`:

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

- [ ] **Step 5: Add Stripe config to backend config.ts**

In `src/config/config.ts`, add under the existing config object:

```typescript
stripe: {
  secretKey: process.env.STRIPE_SECRET_KEY as string,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET as string,
  platformFeePercent: parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT || '2.5'),
},
```

- [ ] **Step 6: Commit**

```bash
git add package.json yarn.lock src/config/config.ts
git commit -m "feat(stripe): install Stripe SDKs, add env config"
```

---

## Task 2: Add Stripe fields to Hotel model

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/hotel/hotel.interfaces.ts`
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/hotel/hotel.model.ts`

- [ ] **Step 1: Update IHotel interface**

In `hotel.interfaces.ts`, find the `IHotel` interface and add:

```typescript
stripeAccountId?: string;
stripeAccountStatus?: 'not_connected' | 'pending' | 'active' | 'restricted';
stripePlatformFeePercent?: number;
```

- [ ] **Step 2: Update Hotel Mongoose schema**

In `hotel.model.ts`, add to the `hotelSchema` definition:

```typescript
stripeAccountId: { type: String, default: null },
stripeAccountStatus: {
  type: String,
  enum: ['not_connected', 'pending', 'active', 'restricted'],
  default: 'not_connected',
},
stripePlatformFeePercent: { type: Number, default: null },
```

- [ ] **Step 3: Compile**

```bash
cd infiora-backend-main/infiora-backend-main && yarn compile
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/hotel/hotel.interfaces.ts src/modules/hotel/hotel.model.ts
git commit -m "feat(stripe): add Stripe account fields to Hotel model"
```

---

## Task 3: Add Stripe fields to GuestOrder model

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.interfaces.ts`
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/orders/guest-order.model.ts`

- [ ] **Step 1: Update IGuestOrder interface**

In `orders.interfaces.ts`, add to `IGuestOrder`:

```typescript
stripePaymentIntentId?: string;
stripeStatus?: 'pending' | 'succeeded' | 'failed' | 'refunded';
platformFeeAmount?: number;    // Infiora fee in cents
stripeFeeAmount?: number;      // Stripe processing fee in cents (populated from webhook)
netAmountToHotel?: number;     // what hotel receives in cents
paidAt?: Date;
```

- [ ] **Step 2: Add fields to GuestOrder schema**

In `guest-order.model.ts`, add:

```typescript
stripePaymentIntentId: { type: String, default: null },
stripeStatus: { type: String, enum: ['pending', 'succeeded', 'failed', 'refunded'], default: null },
platformFeeAmount: { type: Number, default: null },
stripeFeeAmount: { type: Number, default: null },
netAmountToHotel: { type: Number, default: null },
paidAt: { type: Date, default: null },
```

- [ ] **Step 3: Compile**

```bash
yarn compile
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/orders/orders.interfaces.ts src/modules/orders/guest-order.model.ts
git commit -m "feat(stripe): add Stripe payment fields to GuestOrder model"
```

---

## Task 4: Create Stripe service

**Files:**
- Create: `infiora-backend-main/infiora-backend-main/src/modules/stripe/stripe.service.ts`

- [ ] **Step 1: Create the stripe module directory and service**

```typescript
// src/modules/stripe/stripe.service.ts
import Stripe from 'stripe';
import httpStatus from 'http-status';
import config from '../../config/config';
import ApiError from '../errors/ApiError';
import { Hotel } from '../hotel';

const stripe = new Stripe(config.stripe.secretKey, { apiVersion: '2024-04-10' });

export { stripe };

export const initiateOnboarding = async (hotelId: string, returnUrl: string): Promise<string> => {
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');

  let accountId = (hotel as any).stripeAccountId as string | null;

  if (!accountId) {
    const account = await stripe.accounts.create({ type: 'express' });
    accountId = account.id;
    await Hotel.findByIdAndUpdate(hotelId, {
      stripeAccountId: accountId,
      stripeAccountStatus: 'pending',
    });
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${returnUrl}?stripe=refresh`,
    return_url: `${returnUrl}?stripe=success`,
    type: 'account_onboarding',
  });

  return accountLink.url;
};

export const getStripeStatus = async (hotelId: string) => {
  const hotel = await Hotel.findById(hotelId).select('stripeAccountId stripeAccountStatus stripePlatformFeePercent');
  if (!hotel) throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');
  return {
    stripeAccountId: (hotel as any).stripeAccountId,
    stripeAccountStatus: (hotel as any).stripeAccountStatus || 'not_connected',
    stripePlatformFeePercent: (hotel as any).stripePlatformFeePercent,
  };
};

export const createPaymentIntent = async (params: {
  hotelId: string;
  amountCents: number;  // total in cents (after any discount)
  currency: string;
  metadata?: Record<string, string>;
}): Promise<{ clientSecret: string; paymentIntentId: string }> => {
  const { hotelId, amountCents, currency, metadata } = params;

  const hotel = await Hotel.findById(hotelId);
  if (!hotel) throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');

  const stripeAccountId = (hotel as any).stripeAccountId as string | null;
  if (!stripeAccountId || (hotel as any).stripeAccountStatus !== 'active') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Hotel Stripe account is not active');
  }

  const feePercent = (hotel as any).stripePlatformFeePercent ?? config.stripe.platformFeePercent;
  const applicationFeeAmount = Math.round(amountCents * (feePercent / 100));

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: currency.toLowerCase(),
    application_fee_amount: applicationFeeAmount,
    transfer_data: { destination: stripeAccountId },
    metadata: { hotelId, ...metadata },
  });

  return { clientSecret: paymentIntent.client_secret!, paymentIntentId: paymentIntent.id };
};
```

- [ ] **Step 2: Compile**

```bash
yarn compile
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/stripe/stripe.service.ts
git commit -m "feat(stripe): add Stripe service (onboarding, PaymentIntent creation)"
```

---

## Task 5: Create webhook handler

**Files:**
- Create: `infiora-backend-main/infiora-backend-main/src/modules/stripe/stripe-webhook.handler.ts`

- [ ] **Step 1: Write unit tests for webhook handler**

Create `src/modules/stripe/__tests__/stripe-webhook.handler.test.ts`:

```typescript
import { extractWebhookFees } from '../stripe-webhook.handler';

describe('extractWebhookFees', () => {
  it('extracts application fee and Stripe fee from charge object', () => {
    const mockCharge = {
      amount: 10000,
      application_fee_amount: 250,
      balance_transaction: {
        fee: 165,
        net: 9585,
      },
    };
    const result = extractWebhookFees(mockCharge as any);
    expect(result.platformFeeAmount).toBe(250);
    expect(result.stripeFeeAmount).toBe(165);
    expect(result.netAmountToHotel).toBe(9585);
  });

  it('handles missing balance_transaction gracefully', () => {
    const mockCharge = { amount: 5000, application_fee_amount: 125 };
    const result = extractWebhookFees(mockCharge as any);
    expect(result.platformFeeAmount).toBe(125);
    expect(result.stripeFeeAmount).toBeNull();
    expect(result.netAmountToHotel).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
yarn test --testPathPattern=stripe-webhook
```

Expected: FAIL — `extractWebhookFees` not defined.

- [ ] **Step 3: Create the webhook handler**

```typescript
// src/modules/stripe/stripe-webhook.handler.ts
import Stripe from 'stripe';
import { stripe } from './stripe.service';
import GuestOrder from '../orders/guest-order.model';
import { Hotel } from '../hotel';
import logger from '../logger/logger';

export const extractWebhookFees = (charge: Partial<Stripe.Charge>): {
  platformFeeAmount: number | null;
  stripeFeeAmount: number | null;
  netAmountToHotel: number | null;
} => {
  const platformFeeAmount = charge.application_fee_amount ?? null;
  const bt = (charge as any).balance_transaction;
  const stripeFeeAmount = bt?.fee ?? null;
  const netAmountToHotel = bt?.net ?? null;
  return { platformFeeAmount, stripeFeeAmount, netAmountToHotel };
};

const handlePaymentIntentSucceeded = async (paymentIntent: Stripe.PaymentIntent): Promise<void> => {
  const { hotelId } = paymentIntent.metadata;
  if (!hotelId) return;

  // Retrieve the charge to get fee breakdown
  let platformFeeAmount: number | null = null;
  let stripeFeeAmount: number | null = null;
  let netAmountToHotel: number | null = null;

  if (paymentIntent.latest_charge) {
    try {
      const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string, {
        expand: ['balance_transaction'],
      });
      const fees = extractWebhookFees(charge);
      platformFeeAmount = fees.platformFeeAmount;
      stripeFeeAmount = fees.stripeFeeAmount;
      netAmountToHotel = fees.netAmountToHotel;
    } catch (err: any) {
      logger.warn(`Could not retrieve charge for PI ${paymentIntent.id}: ${err.message}`);
    }
  }

  await GuestOrder.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntent.id },
    {
      stripeStatus: 'succeeded',
      paidAt: new Date(),
      platformFeeAmount,
      stripeFeeAmount,
      netAmountToHotel,
    }
  );

  logger.info(`Payment succeeded: PI=${paymentIntent.id} hotel=${hotelId}`);
};

const handlePaymentIntentFailed = async (paymentIntent: Stripe.PaymentIntent): Promise<void> => {
  await GuestOrder.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntent.id },
    { stripeStatus: 'failed' }
  );
  logger.warn(`Payment failed: PI=${paymentIntent.id}`);
};

const handleChargeRefunded = async (charge: Stripe.Charge): Promise<void> => {
  if (!charge.payment_intent) return;
  await GuestOrder.findOneAndUpdate(
    { stripePaymentIntentId: charge.payment_intent as string },
    { stripeStatus: 'refunded' }
  );
  logger.info(`Charge refunded: PI=${charge.payment_intent}`);
};

const handleAccountUpdated = async (account: Stripe.Account): Promise<void> => {
  const status = account.charges_enabled && account.payouts_enabled ? 'active'
    : account.requirements?.disabled_reason ? 'restricted'
    : 'pending';

  await Hotel.findOneAndUpdate(
    { stripeAccountId: account.id },
    { stripeAccountStatus: status }
  );
  logger.info(`Stripe account updated: ${account.id} → ${status}`);
};

export const handleStripeWebhook = async (rawBody: Buffer, signature: string, webhookSecret: string): Promise<void> => {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    case 'charge.refunded':
      await handleChargeRefunded(event.data.object as Stripe.Charge);
      break;
    case 'account.updated':
      await handleAccountUpdated(event.data.object as Stripe.Account);
      break;
    default:
      logger.info(`Unhandled Stripe event: ${event.type}`);
  }
};
```

- [ ] **Step 4: Run tests**

```bash
yarn test --testPathPattern=stripe-webhook
```

Expected: PASS (2 tests).

- [ ] **Step 5: Compile**

```bash
yarn compile
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/stripe/ src/modules/stripe/__tests__/
git commit -m "feat(stripe): add webhook handler with unit tests"
```

---

## Task 6: Create Stripe routes and register in app

**Files:**
- Create: `infiora-backend-main/infiora-backend-main/src/routes/v1/stripe.route.ts`
- Modify: `infiora-backend-main/infiora-backend-main/src/app.ts`
- Modify: `infiora-backend-main/infiora-backend-main/src/routes/v1/index.ts`

- [ ] **Step 1: Create stripe.route.ts**

```typescript
// src/routes/v1/stripe.route.ts
import express, { Router, Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../modules/utils/catchAsync';
import { auth } from '../../modules/auth';
import { isHotelOwner } from '../../modules/middleware';
import ApiError from '../../modules/errors/ApiError';
import config from '../../config/config';
import { initiateOnboarding, getStripeStatus } from '../../modules/stripe/stripe.service';
import { handleStripeWebhook } from '../../modules/stripe/stripe-webhook.handler';

const router: Router = express.Router();

// ─── Webhook (public — Stripe calls this) ────────────────────────────────────
// IMPORTANT: must use raw body — registered in app.ts before json middleware
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  catchAsync(async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    if (!sig) throw new ApiError(httpStatus.BAD_REQUEST, 'Missing Stripe signature');
    await handleStripeWebhook(req.body as Buffer, sig, config.stripe.webhookSecret);
    res.json({ received: true });
  })
);

// ─── Hotel onboarding ─────────────────────────────────────────────────────────

router.post(
  '/hotels/:hotelId/onboard',
  auth(),
  isHotelOwner,
  catchAsync(async (req: Request, res: Response) => {
    const returnUrl = req.body.returnUrl || `${req.headers.origin}/orders?tab=setup`;
    const url = await initiateOnboarding(req.params['hotelId'] as string, returnUrl);
    res.json({ url });
  })
);

router.get(
  '/hotels/:hotelId/status',
  auth(),
  isHotelOwner,
  catchAsync(async (req: Request, res: Response) => {
    const status = await getStripeStatus(req.params['hotelId'] as string);
    res.json(status);
  })
);

export default router;
```

- [ ] **Step 2: Register Stripe routes in routes/v1/index.ts**

In `src/routes/v1/index.ts`, add:

```typescript
import stripeRoute from './stripe.route';
// ...
router.use('/stripe', stripeRoute);
```

- [ ] **Step 3: Compile**

```bash
yarn compile
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/v1/stripe.route.ts src/routes/v1/index.ts
git commit -m "feat(stripe): add Stripe onboarding and webhook routes"
```

---

## Task 7: Add payment-intent endpoint for guest app

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.controller.ts`
- Modify: `infiora-backend-main/infiora-backend-main/src/routes/v1/orders.route.ts`

- [ ] **Step 1: Add createPaymentIntent controller**

In `orders.controller.ts`, add:

```typescript
import { createPaymentIntent } from '../stripe/stripe.service';

// ─── Guest: Create Payment Intent ─────────────────────────────────────────────

export const createGuestPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const { hotelId, amountCents, currency, metadata } = req.body;
  if (!hotelId || !amountCents || !currency) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'hotelId, amountCents, currency are required');
  }
  const result = await createPaymentIntent({ hotelId, amountCents, currency, metadata });
  res.json(result);
});
```

- [ ] **Step 2: Add route for payment intent in orders.route.ts**

In the PUBLIC ROUTES section:

```typescript
// POST /v1/orders/guest/payment-intent — create Stripe PaymentIntent (called before order placement)
router.route('/guest/payment-intent').post(guestOrderLimiter, ordersController.createGuestPaymentIntent);
```

- [ ] **Step 3: Update placeOrder to accept stripePaymentIntentId**

In `IPlaceOrderBody` (orders.interfaces.ts), add:

```typescript
stripePaymentIntentId?: string;
```

In `orders.service.ts` `placeOrder` function, when the payment method is `'online'`, store the `stripePaymentIntentId` on the order:

```typescript
// After determining payment method, before GuestOrder.create:
const stripePaymentIntentId = body.stripePaymentIntentId || null;
```

Then in `GuestOrder.create({ ... })` add:

```typescript
...(stripePaymentIntentId ? { stripePaymentIntentId, stripeStatus: 'pending' } : {}),
```

- [ ] **Step 4: Compile**

```bash
yarn compile
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/orders/orders.controller.ts src/routes/v1/orders.route.ts src/modules/orders/orders.interfaces.ts src/modules/orders/orders.service.ts
git commit -m "feat(stripe): add guest payment-intent endpoint and link PI to order"
```

---

## Task 8: Dashboard — Stripe Connect section in OrderSettings

**Files:**
- Create: `infiora-dash-main/infiora-dash-main/src/views/orders/components/StripeConnect.tsx`
- Modify: `infiora-dash-main/infiora-dash-main/src/views/orders/components/OrderSettings.tsx`
- Modify: `infiora-dash-main/infiora-dash-main/src/redux/api/ordersApi.ts`
- Modify: `infiora-dash-main/infiora-dash-main/src/types/index.ts`

- [ ] **Step 1: Add Stripe RTK Query endpoints to ordersApi.ts**

In `src/redux/api/ordersApi.ts`, create a small `stripeApi` or add to existing api. Simplest: add to `ordersApi`:

```typescript
initiateStripeOnboarding: builder.mutation<{ url: string }, { hotelId: string; returnUrl: string }>({
  query: ({ hotelId, returnUrl }) => ({ url: `/v1/stripe/hotels/${hotelId}/onboard`, method: 'POST', body: { returnUrl } }),
}),
getStripeStatus: builder.query<{ stripeAccountId: string | null; stripeAccountStatus: string; stripePlatformFeePercent: number | null }, string>({
  query: hotelId => ({ url: `/v1/stripe/hotels/${hotelId}/status` }),
}),
```

- [ ] **Step 2: Create StripeConnect component**

```tsx
'use client'
import { useEffect } from 'react'
import { Box, Stack, Typography, Button, Chip, Alert } from '@mui/material'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { useGetStripeStatusQuery, useInitiateStripeOnboardingMutation } from '@/redux/api/ordersApi'

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  pending: 'warning',
  restricted: 'error',
  not_connected: 'default',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Connected & Active',
  pending: 'Onboarding in progress',
  restricted: 'Restricted — action required',
  not_connected: 'Not connected',
}

interface Props { hotelId: string }

export default function StripeConnect({ hotelId }: Props) {
  const searchParams = useSearchParams()
  const { data: stripeData, refetch } = useGetStripeStatusQuery(hotelId)
  const [initiateOnboarding, { isLoading }] = useInitiateStripeOnboardingMutation()

  // Handle return from Stripe onboarding
  useEffect(() => {
    const stripeParam = searchParams.get('stripe')
    if (stripeParam === 'success') {
      refetch()
      toast.success('Stripe account connected! It may take a few minutes to activate.')
    } else if (stripeParam === 'refresh') {
      toast.info('Onboarding was not completed. You can try again.')
    }
  }, [searchParams, refetch])

  const handleConnect = async () => {
    try {
      const returnUrl = window.location.href.split('?')[0]
      const { url } = await initiateOnboarding({ hotelId, returnUrl }).unwrap()
      window.location.href = url
    } catch { toast.error('Failed to initiate Stripe onboarding') }
  }

  const status = stripeData?.stripeAccountStatus || 'not_connected'

  return (
    <Box>
      <Stack direction='row' alignItems='center' spacing={2} mb={2}>
        <Typography variant='subtitle2'>Stripe Connect</Typography>
        <Chip
          size='small'
          label={STATUS_LABELS[status] || status}
          color={STATUS_COLORS[status] || 'default'}
        />
      </Stack>

      {status === 'not_connected' && (
        <Alert severity='info' sx={{ mb: 2 }}>
          Connect a Stripe account to accept online card payments. Guests will be charged at the time of ordering.
          Stripe and Infiora platform fees are automatically deducted before payout.
        </Alert>
      )}

      {status === 'restricted' && (
        <Alert severity='warning' sx={{ mb: 2 }}>
          Your Stripe account has restrictions. Complete the required steps in Stripe to restore full functionality.
        </Alert>
      )}

      {(status === 'not_connected' || status === 'pending' || status === 'restricted') && (
        <Button variant='contained' onClick={handleConnect} disabled={isLoading}>
          {status === 'not_connected' ? 'Connect Stripe account' : 'Continue Stripe onboarding'}
        </Button>
      )}

      {status === 'active' && (
        <Typography variant='body2' color='text.secondary'>
          Your Stripe account is active. Online payments are available to guests.
        </Typography>
      )}
    </Box>
  )
}
```

- [ ] **Step 3: Add StripeConnect to OrderSettings**

In `OrderSettings.tsx`, import and add:

```tsx
import StripeConnect from './StripeConnect'
// ...
{/* In the Payment Methods section, add after the existing toggles: */}
<Box mt={2}>
  <StripeConnect hotelId={hotelId} />
</Box>
```

- [ ] **Step 4: Start dev server and test onboarding**

```bash
cd infiora-dash-main/infiora-dash-main && yarn dev
```

Navigate to Orders → Setup → Payment Methods. Verify "Connect Stripe account" button appears. Click it — you should be redirected to Stripe's onboarding (use Stripe test mode).

- [ ] **Step 5: Commit**

```bash
git add src/views/orders/components/StripeConnect.tsx src/views/orders/components/OrderSettings.tsx src/redux/api/ordersApi.ts
git commit -m "feat(stripe): add Stripe Connect section to OrderSettings"
```

---

## Task 9: Guest app — Stripe Payment Element

**Files:**
- Modify: `infiora-app-main/infiora-app-main/src/views/orders/GuestOrderPage.tsx`

- [ ] **Step 1: Add Stripe state and PaymentElement to GuestOrderPage**

At the top of `GuestOrderPage.tsx`, add imports:

```typescript
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
```

- [ ] **Step 2: Add state for Stripe flow**

Inside `GuestOrderPage`, add:

```typescript
const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null)
const [stripePaymentIntentId, setStripePaymentIntentId] = useState<string | null>(null)
const [stripeLoading, setStripeLoading] = useState(false)
```

- [ ] **Step 3: Add function to create PaymentIntent when "Online" is selected**

```typescript
const initStripePayment = async (amountCents: number) => {
  setStripeLoading(true)
  try {
    const res = await fetch(`${API}/v1/orders/guest/payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hotelId: roomData?.hotelId,
        amountCents,
        currency: settings?.currencySymbol === '€' ? 'eur' : 'usd',
      }),
    })
    const data = await res.json()
    setStripeClientSecret(data.clientSecret)
    setStripePaymentIntentId(data.paymentIntentId)
  } catch { toast('Failed to initialize payment') }
  finally { setStripeLoading(false) }
}
```

Call `initStripePayment` when the user selects "Online" payment and the cart is non-empty:

```typescript
// When payment method changes to 'online':
useEffect(() => {
  if (selectedPayment === 'online' && cartItems.length > 0) {
    const amountCents = Math.round(finalTotal * 100) // finalTotal = total after discount
    initStripePayment(amountCents)
  } else {
    setStripeClientSecret(null)
    setStripePaymentIntentId(null)
  }
}, [selectedPayment, cartItems.length])
```

- [ ] **Step 4: Render PaymentElement when clientSecret is available**

In the order summary JSX, where the payment section is, add:

```tsx
{selectedPayment === 'online' && stripeClientSecret && (
  <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
    <StripePaymentForm
      onSuccess={(paymentIntentId) => {
        setStripePaymentIntentId(paymentIntentId)
        // proceed to place order
        handlePlaceOrder(paymentIntentId)
      }}
    />
  </Elements>
)}
```

Create a small `StripePaymentForm` component inside the same file (above `GuestOrderPage`):

```typescript
function StripePaymentForm({ onSuccess }: { onSuccess: (piId: string) => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePay = async () => {
    if (!stripe || !elements) return
    setLoading(true)
    setError('')
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })
    if (stripeError) {
      setError(stripeError.message || 'Payment failed')
      setLoading(false)
      return
    }
    if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id)
    }
    setLoading(false)
  }

  return (
    <div>
      <PaymentElement />
      {error && <p style={{ color: '#d32f2f', fontSize: 12 }}>{error}</p>}
      <button
        onClick={handlePay}
        disabled={loading || !stripe}
        style={{
          marginTop: 12, width: '100%', padding: '12px', background: '#1976d2',
          color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer'
        }}
      >
        {loading ? 'Processing...' : 'Pay now'}
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Update handlePlaceOrder to include stripePaymentIntentId**

In the order placement fetch body, add:

```typescript
...(stripePaymentIntentId ? { stripePaymentIntentId, payment: 'online' } : {}),
```

- [ ] **Step 6: Test golden path with Stripe test card**

```bash
cd infiora-app-main/infiora-app-main && yarn dev
```

1. Add items to cart
2. Select "Online" payment → Stripe PaymentElement appears
3. Enter test card `4242 4242 4242 4242`, any future date, any CVC
4. Click "Pay now" → order placed
5. In dashboard, order shows `payment: online`
6. Check Stripe test dashboard — PaymentIntent shows succeeded

- [ ] **Step 7: Commit**

```bash
git add src/views/orders/GuestOrderPage.tsx
git commit -m "feat(stripe): add Stripe Payment Element to guest checkout"
```

---

## Task 10: Admin — Stripe Revenue analytics

**Files:**
- Create: `infiora-admin-main/infiora-admin-main/src/views/stripe/StripeRevenuePage.tsx` (adjust path to match admin app structure)
- Modify: admin navigation and routes

- [ ] **Step 1: Add revenue aggregation endpoint to backend**

In `src/routes/v1/index.ts` or a new admin route file, add:

```typescript
router.get('/admin/stripe-revenue', auth(), adminOnly, catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

  const match: any = { stripeStatus: 'succeeded' };
  if (startDate || endDate) {
    match.paidAt = {};
    if (startDate) match.paidAt.$gte = new Date(startDate as string);
    if (endDate) match.paidAt.$lte = new Date(endDate as string);
  }

  const agg = await GuestOrder.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$hotelId',
        gmv: { $sum: '$total' },
        platformFees: { $sum: '$platformFeeAmount' },
        stripeFees: { $sum: '$stripeFeeAmount' },
        transactions: { $sum: 1 },
        lastActivity: { $max: '$paidAt' },
      },
    },
    { $sort: { gmv: -1 } },
  ]);

  // Populate hotel names
  const hotelIds = agg.map(r => r._id);
  const hotels = await Hotel.find({ _id: { $in: hotelIds } }).select('name');
  const hotelMap = new Map(hotels.map(h => [String(h._id), h.name]));

  const rows = agg.map(r => ({
    hotelId: r._id,
    hotelName: hotelMap.get(String(r._id)) || 'Unknown',
    gmv: r.gmv,
    platformFees: r.platformFees ? r.platformFees / 100 : 0,   // cents → currency
    stripeFees: r.stripeFees ? r.stripeFees / 100 : 0,
    transactions: r.transactions,
    lastActivity: r.lastActivity,
  }));

  const totals = rows.reduce((acc, r) => ({
    gmv: acc.gmv + r.gmv,
    platformFees: acc.platformFees + r.platformFees,
    stripeFees: acc.stripeFees + r.stripeFees,
    transactions: acc.transactions + r.transactions,
  }), { gmv: 0, platformFees: 0, stripeFees: 0, transactions: 0 });

  res.json({ rows, totals });
}));
```

- [ ] **Step 2: Create StripeRevenuePage in admin app**

Explore the admin app structure (`infiora-admin-main`) first:

```bash
ls infiora-admin-main/infiora-admin-main/src/views/
```

Follow the same tab/page pattern as other admin views. Create `src/views/stripe/StripeRevenuePage.tsx`:

```tsx
'use client'
import { useState } from 'react'
import {
  Box, Stack, Typography, Card, Table, TableHead,
  TableRow, TableCell, TableBody, TextField, Button
} from '@mui/material'
import { format } from 'date-fns'

const API = process.env.NEXT_PUBLIC_API_URL

interface RevenueRow {
  hotelId: string; hotelName: string; gmv: number
  platformFees: number; stripeFees: number; transactions: number; lastActivity: string
}
interface RevenueTotals { gmv: number; platformFees: number; stripeFees: number; transactions: number }

export default function StripeRevenuePage() {
  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(today)
  const [rows, setRows] = useState<RevenueRow[]>([])
  const [totals, setTotals] = useState<RevenueTotals | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/v1/admin/stripe-revenue?startDate=${startDate}&endDate=${endDate}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      const data = await res.json()
      setRows(data.rows)
      setTotals(data.totals)
    } finally { setLoading(false) }
  }

  return (
    <Box p={3}>
      <Typography variant='h5' mb={3}>Stripe Revenue</Typography>

      {/* Date filter */}
      <Stack direction='row' spacing={2} mb={3} alignItems='center'>
        <TextField type='date' label='From' value={startDate} onChange={e => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} size='small' />
        <TextField type='date' label='To' value={endDate} onChange={e => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} size='small' />
        <Button variant='contained' onClick={load} disabled={loading}>Load</Button>
      </Stack>

      {/* KPI cards */}
      {totals && (
        <Stack direction='row' spacing={2} mb={3}>
          {[
            { label: 'Total GMV', value: `€${totals.gmv.toFixed(2)}` },
            { label: 'Infiora Fees', value: `€${totals.platformFees.toFixed(2)}` },
            { label: 'Stripe Fees', value: `€${totals.stripeFees.toFixed(2)}` },
            { label: 'Transactions', value: String(totals.transactions) },
          ].map(kpi => (
            <Card key={kpi.label} variant='outlined' sx={{ p: 2, flex: 1 }}>
              <Typography variant='caption' color='text.secondary'>{kpi.label}</Typography>
              <Typography variant='h6' fontWeight={700}>{kpi.value}</Typography>
            </Card>
          ))}
        </Stack>
      )}

      {/* Per-hotel table */}
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell>Hotel</TableCell>
            <TableCell align='right'>GMV</TableCell>
            <TableCell align='right'>Infiora fees</TableCell>
            <TableCell align='right'>Stripe fees</TableCell>
            <TableCell align='right'>Transactions</TableCell>
            <TableCell>Last activity</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.hotelId} hover>
              <TableCell>{row.hotelName}</TableCell>
              <TableCell align='right'>€{row.gmv.toFixed(2)}</TableCell>
              <TableCell align='right'>€{row.platformFees.toFixed(2)}</TableCell>
              <TableCell align='right'>€{row.stripeFees.toFixed(2)}</TableCell>
              <TableCell align='right'>{row.transactions}</TableCell>
              <TableCell>{row.lastActivity ? format(new Date(row.lastActivity), 'dd.MM.yyyy') : '—'}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && !loading && (
            <TableRow><TableCell colSpan={6} align='center'>No data for selected period</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  )
}
```

- [ ] **Step 3: Add Stripe Revenue to admin navigation**

Find the admin nav component (sidebar) and add a "Stripe Revenue" link pointing to the new page. Follow the same pattern as other admin nav items.

- [ ] **Step 4: Add per-hotel fee % field in Hotel detail page**

In the admin Hotel detail form, find where hotel fields are edited. Add a field:

```tsx
<TextField
  label='Platform fee % (blank = global default)'
  type='number'
  value={stripePlatformFeePercent ?? ''}
  onChange={e => setStripePlatformFeePercent(e.target.value ? Number(e.target.value) : null)}
  inputProps={{ min: 0, max: 100, step: 0.1 }}
  size='small'
  helperText='Overrides global Stripe fee percentage for this hotel'
/>
```

Persist this via a PATCH to the hotel update endpoint (already exists).

- [ ] **Step 5: Add global fee % to admin settings**

Find the admin settings page and add a "Global Stripe platform fee %" input that PATCHes a new endpoint:

Backend: `PATCH /v1/admin/settings` with `{ stripePlatformFeePercent: number }` — stores in a singleton `AdminSettings` document or updates `config`.

The simplest approach: store in the Hotel model with `hotelId: null` is not clean. Instead, add `STRIPE_PLATFORM_FEE_PERCENT` to `.env` and expose a `GET /v1/admin/settings` endpoint that returns the current value. Superadmin can change it via environment config for now (no DB storage needed for MVP).

- [ ] **Step 6: Commit**

```bash
git add src/views/stripe/ src/routes/v1/
git commit -m "feat(stripe): add admin Stripe Revenue analytics page and per-hotel fee config"
```

---

## Wave 3 Complete

- ✅ Hotel Stripe Express onboarding (backend + dashboard)
- ✅ Guest checkout with Stripe PaymentElement
- ✅ Capture immediately on order placement
- ✅ Webhooks: payment_intent.succeeded / failed, charge.refunded, account.updated
- ✅ Fee visible to hotel in Stripe dashboard (transparent Model A)
- ✅ Admin revenue page with GMV, Infiora fees, Stripe fees per hotel
- ✅ Per-hotel fee % override in admin
