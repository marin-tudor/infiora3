import Stripe from 'stripe';
import httpStatus from 'http-status';
import config from '../../config/config';
import ApiError from '../errors/ApiError';
import { Hotel } from '../hotel';

const getStripeClient = (): Stripe => {
  if (!config.stripe.secretKey) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Stripe is not configured');
  }

  return new Stripe(config.stripe.secretKey, { apiVersion: '2023-10-16' });
};

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripeClient() as any)[prop];
  },
});

export const initiateOnboarding = async (hotelId: string, returnUrl: string): Promise<string> => {
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');

  let accountId = hotel.stripeAccountId;

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
    stripeAccountId: hotel.stripeAccountId ?? null,
    stripeAccountStatus: hotel.stripeAccountStatus ?? 'not_connected',
    stripePlatformFeePercent: hotel.stripePlatformFeePercent ?? null,
  };
};

const resolveCurrencyCodeFromSymbol = (currencySymbol?: string | null): string => {
  const normalized = String(currencySymbol ?? '')
    .trim()
    .toLowerCase();

  if (!normalized || normalized === '€' || normalized === 'eur' || normalized === 'euro') {
    return 'eur';
  }

  if (normalized === '$' || normalized === 'usd' || normalized === 'us$' || normalized === 'dollar') {
    return 'usd';
  }

  return 'eur';
};

export const getHotelStripeCurrency = (hotel: { orders?: { currencySymbol?: string | null } | null }): string =>
  resolveCurrencyCodeFromSymbol(hotel.orders?.currencySymbol);

export const createPaymentIntent = async (params: {
  hotelId: string;
  amountCents: number;
  metadata?: Record<string, string>;
}): Promise<{ clientSecret: string; paymentIntentId: string }> => {
  const { hotelId, amountCents, metadata } = params;

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'amountCents must be a positive integer');
  }

  const hotel = await Hotel.findById(hotelId);
  if (!hotel) throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');

  if (!hotel.stripeAccountId || hotel.stripeAccountStatus !== 'active') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Hotel Stripe account is not active');
  }

  const currency = getHotelStripeCurrency(hotel);
  const feePercent = hotel.stripePlatformFeePercent ?? config.stripe.platformFeePercent;
  const applicationFeeAmount = Math.round(amountCents * (feePercent / 100));

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: currency.toLowerCase(),
    application_fee_amount: applicationFeeAmount,
    transfer_data: { destination: hotel.stripeAccountId },
    metadata: { hotelId, ...metadata },
    automatic_payment_methods: { enabled: true },
  });

  if (!paymentIntent.client_secret) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Stripe did not return a client secret');
  }

  return { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id };
};

export const retrievePaymentIntent = async (paymentIntentId: string): Promise<Stripe.PaymentIntent> => {
  if (!paymentIntentId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'paymentIntentId is required');
  }

  return stripe.paymentIntents.retrieve(paymentIntentId);
};
