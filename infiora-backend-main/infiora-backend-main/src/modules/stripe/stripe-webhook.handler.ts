import Stripe from 'stripe';
import { stripe } from './stripe.service';
import GuestOrder from '../orders/guest-order.model';
import PendingGuestPayment from '../orders/pending-guest-payment.model';
import { Hotel } from '../hotel';
import { logger } from '../logger';

export const extractWebhookFees = (
  charge: Partial<Stripe.Charge>
): {
  platformFeeAmount: number | null;
  stripeFeeAmount: number | null;
  netAmountToHotel: number | null;
} => {
  const platformFeeAmount = charge.application_fee_amount ?? null;
  const balanceTransaction = (charge as any).balance_transaction;
  const stripeFeeAmount = balanceTransaction?.fee ?? null;
  const netAmountToHotel = balanceTransaction?.net ?? null;

  return { platformFeeAmount, stripeFeeAmount, netAmountToHotel };
};

const handlePaymentIntentSucceeded = async (paymentIntent: Stripe.PaymentIntent, eventId: string): Promise<void> => {
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
    } catch (error: any) {
      logger.warn(`Could not retrieve charge for PI ${paymentIntent.id}: ${error.message}`);
    }
  }

  const paidAt = new Date();
  await PendingGuestPayment.findOneAndUpdate(
    { paymentIntentId: paymentIntent.id },
    {
      $set: {
        stripeEventId: eventId,
        status: 'succeeded',
        paidAt,
        platformFeeAmount,
        stripeFeeAmount,
        netAmountToHotel,
      },
      $setOnInsert: {
        checkoutId: String(paymentIntent.metadata?.['checkoutId'] || paymentIntent.id),
        hotelId: paymentIntent.metadata?.['hotelId'],
        roomId: paymentIntent.metadata?.['roomId'],
        amountCents: paymentIntent.amount,
        currency: paymentIntent.currency,
        cartHash: String(paymentIntent.metadata?.['cartHash'] || ''),
      },
    },
    { upsert: true }
  );

  await GuestOrder.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntent.id },
    {
      stripeStatus: 'succeeded',
      paidAt,
      platformFeeAmount,
      stripeFeeAmount,
      netAmountToHotel,
    }
  );

  logger.info(`Payment succeeded: PI=${paymentIntent.id}`);
};

const handlePaymentIntentFailed = async (paymentIntent: Stripe.PaymentIntent, eventId: string): Promise<void> => {
  await PendingGuestPayment.findOneAndUpdate(
    { paymentIntentId: paymentIntent.id },
    {
      $set: {
        stripeEventId: eventId,
        status: 'failed',
      },
    }
  );
  await GuestOrder.findOneAndUpdate({ stripePaymentIntentId: paymentIntent.id }, { stripeStatus: 'failed' });
  logger.warn(`Payment failed: PI=${paymentIntent.id}`);
};

const handleChargeRefunded = async (charge: Stripe.Charge, eventId: string): Promise<void> => {
  if (!charge.payment_intent) return;
  await PendingGuestPayment.findOneAndUpdate(
    { paymentIntentId: charge.payment_intent as string },
    {
      $set: {
        stripeEventId: eventId,
        status: 'refunded',
      },
    }
  );
  await GuestOrder.findOneAndUpdate({ stripePaymentIntentId: charge.payment_intent as string }, { stripeStatus: 'refunded' });
  logger.info(`Charge refunded: PI=${charge.payment_intent}`);
};

const handleAccountUpdated = async (account: Stripe.Account): Promise<void> => {
  const status =
    account.charges_enabled && account.payouts_enabled
      ? 'active'
      : account.requirements?.disabled_reason
        ? 'restricted'
        : 'pending';

  await Hotel.findOneAndUpdate({ stripeAccountId: account.id }, { stripeAccountStatus: status });
  logger.info(`Stripe account updated: ${account.id} -> ${status}`);
};

export const handleStripeWebhook = async (rawBody: Buffer, signature: string, webhookSecret: string): Promise<void> => {
  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, event.id);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, event.id);
      break;
    case 'charge.refunded':
      await handleChargeRefunded(event.data.object as Stripe.Charge, event.id);
      break;
    case 'account.updated':
      await handleAccountUpdated(event.data.object as Stripe.Account);
      break;
    default:
      logger.info(`Unhandled Stripe event: ${event.type}`);
  }
};
