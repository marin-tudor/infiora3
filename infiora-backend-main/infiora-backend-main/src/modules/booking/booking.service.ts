import crypto, { createHash, randomBytes } from 'crypto';
import cron from 'node-cron';
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Booking from './booking.model';
import BookingCounter from './booking-counter.model';
import TimeSlot from './time-slot.model';
import BookingWaitlist from './booking-waitlist.model';
import { IBookingDoc } from './booking.interfaces';
import BlackoutDate from './blackout-date.model';
import CatalogItem from '../orders/catalog-item.model';
import DiscountCode from '../orders/discount-code.model';
import PendingGuestPayment from '../orders/pending-guest-payment.model';
import Room from '../room/room.model';
import { sendEmail } from '../email/email.service';
import { sendSSEEventToAll } from '../orders/sse.service';
import {
  generateGuestStatusToken,
  getGuestStatusUrl,
  getOrdersSettings,
  validateDiscount,
  validateReservationCode,
} from '../orders/orders.service';
import { createPaymentIntent, getHotelStripeCurrency, retrievePaymentIntent } from '../stripe/stripe.service';
import * as dispatchService from '../dispatch/dispatch.service';
import logger from '../logger/logger';
import Hotel from '../hotel/hotel.model';
import ApiError from '../errors/ApiError';
import { withOptionalTransaction } from '../utils';

const generateBookingCheckoutId = (): string => randomBytes(18).toString('hex');
const normalizeCurrency = (currency: string): string => currency.trim().toLowerCase();

const buildBookingCartHash = ({
  hotelId,
  itemId,
  partySize,
  discountCode,
  selectedAddons,
}: {
  hotelId: string;
  itemId: string;
  partySize: number;
  discountCode?: string | null | undefined;
  selectedAddons?: { addonId: string; price: number; name?: string }[] | undefined;
}): string => {
  return createHash('sha256')
    .update(
      JSON.stringify({
        hotelId: String(hotelId),
        itemId: String(itemId),
        partySize: Number(partySize),
        discountCode: discountCode?.trim().toUpperCase() || null,
        selectedAddons: (selectedAddons ?? [])
          .map((a) => ({ addonId: String(a.addonId), price: Number(a.price) }))
          .sort((a, b) => a.addonId.localeCompare(b.addonId)),
      })
    )
    .digest('hex');
};

const assertItemBelongsToHotel = (item: any, hotelId: string): void => {
  if (String(item.hotelId) !== String(hotelId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Item does not belong to this hotel');
  }
};

const assertRoomBelongsToHotel = (room: any, hotelId: string): void => {
  if (String(room.hotel) !== String(hotelId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Room does not belong to this hotel');
  }
};

// Map to track booking escalation timers
const escalationTimers = new Map<string, NodeJS.Timeout>();

const buildBookingRefKey = (date: Date): string => `booking-ref:${date.toISOString().slice(0, 10)}`;

const generateBookingRef = async (date: Date, session: any = null): Promise<string> => {
  const dayKey = date.toISOString().slice(0, 10);
  const counter = await BookingCounter.findOneAndUpdate(
    { key: buildBookingRefKey(date) },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true, ...(session ? { session } : {}) }
  );

  return `BK-${dayKey.replace(/-/g, '')}-${String(counter.seq).padStart(4, '0')}`;
};

export async function createBookingPaymentIntent(data: {
  hotelId: string;
  itemId: string;
  partySize: number;
  discountCode?: string | null;
  selectedAddons?: { addonId: string; name: string; price: number }[];
}): Promise<{ clientSecret: string; paymentIntentId: string; checkoutId: string }> {
  const hotel = await Hotel.findById(data.hotelId);
  if (!hotel) throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');

  const bookingSettings = (hotel as any).bookings ?? {};
  if (!bookingSettings.onlinePaymentEnabled) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Online booking payment is not enabled for this hotel');
  }

  const item = await CatalogItem.findById(data.itemId);
  if (!item || item.type !== 'bookable' || !item.available) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Item is not available for booking');
  }
  if (String(item.hotelId) !== String(data.hotelId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Item does not belong to this hotel');
  }

  const config = item.bookingConfig!;
  const basePrice = (config as any).pricePerPerson
    ? ((item as any).price ?? 0) * data.partySize
    : (item as any).price ?? 0;
  const addonTotal = (data.selectedAddons ?? []).reduce((sum, a) => sum + (a.price ?? 0), 0);
  let total = parseFloat((basePrice + addonTotal).toFixed(2));

  if (data.discountCode?.trim()) {
    const validation = await validateDiscount({
      hotelId: data.hotelId,
      code: data.discountCode,
      items: [{ itemId: data.itemId, qty: 1, categoryId: String((item as any).categoryId ?? ''), price: total }],
      totalAmount: total,
    });
    if (validation.valid && validation.newTotal != null) {
      total = validation.newTotal;
    }
  }

  const amountCents = Math.round(total * 100);
  if (amountCents < 50) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Booking total is below the minimum chargeable amount');
  }

  const currency = getHotelStripeCurrency(hotel);
  const checkoutId = generateBookingCheckoutId();
  const cartHash = buildBookingCartHash({
    hotelId: data.hotelId,
    itemId: data.itemId,
    partySize: data.partySize,
    discountCode: data.discountCode,
    selectedAddons: data.selectedAddons,
  });

  const paymentIntent = await createPaymentIntent({
    hotelId: data.hotelId,
    amountCents,
    metadata: { hotelId: data.hotelId, itemId: data.itemId, checkoutId, cartHash, type: 'booking' },
  });

  await PendingGuestPayment.findOneAndUpdate(
    { paymentIntentId: paymentIntent.paymentIntentId },
    {
      $set: {
        checkoutId,
        paymentIntentId: paymentIntent.paymentIntentId,
        hotelId: new mongoose.Types.ObjectId(data.hotelId),
        roomId: new mongoose.Types.ObjectId(data.hotelId), // placeholder — no room at intent creation
        amountCents,
        currency,
        cartHash,
        discountCode: data.discountCode?.trim().toUpperCase() || null,
        status: 'pending',
      },
    },
    { upsert: true }
  );

  return { ...paymentIntent, checkoutId };
}

export async function createBooking(data: {
  itemId: string;
  startTime: Date;
  partySize: number;
  guestEmail: string;
  guestRoomNumber: string;
  roomId: string;
  hotelId: string;
  code?: string;
  note?: string;
  payment: 'room' | 'cash' | 'card' | 'online';
  language?: string;
  selectedAddons?: { addonId: string; name: string; price: number }[];
  discountCode?: string;
  idempotencyKey?: string | null;
  stripePaymentIntentId?: string | null;
  guestCheckoutId?: string | null;
}) {
  const normalizedIdempotencyKey = data.idempotencyKey?.trim() || null;
  if (normalizedIdempotencyKey) {
    const existingBooking = await Booking.findOne({ hotelId: data.hotelId, idempotencyKey: normalizedIdempotencyKey });
    if (existingBooking) {
      return {
        booking: existingBooking,
        guestCancelToken: null,
        guestStatusToken: generateGuestStatusToken(data.hotelId, existingBooking.guestEmail),
      };
    }
  }

  const item = await CatalogItem.findById(data.itemId);
  if (!item || item.type !== 'bookable' || !item.available) {
    throw Object.assign(new Error('Item not available for booking'), { statusCode: 400 });
  }
  assertItemBelongsToHotel(item, data.hotelId);

  const room = await Room.findById(data.roomId);
  if (!room) {
    throw Object.assign(new Error('Room not found'), { statusCode: 404 });
  }
  assertRoomBelongsToHotel(room, data.hotelId);

  const orderSettings = await getOrdersSettings(data.hotelId as any);
  if (orderSettings.requireCode && orderSettings.venueType !== 'restaurant') {
    await validateReservationCode(data.roomId, room.hotel as any, data.code);
  }

  const config = item.bookingConfig!;
  const now = new Date();
  const hoursUntilSlot = (data.startTime.getTime() - now.getTime()) / 3_600_000;

  if (hoursUntilSlot < (config.advanceMinHours ?? 0)) {
    throw Object.assign(new Error('Booking window not yet open'), { statusCode: 400 });
  }
  if (hoursUntilSlot / 24 > config.advanceMaxDays) {
    throw Object.assign(new Error('Slot too far in the future'), { statusCode: 400 });
  }

  const slotDateStr = data.startTime.toISOString().slice(0, 10);
  const blackout = await BlackoutDate.findOne({
    hotelId: data.hotelId,
    date: slotDateStr,
    $or: [{ itemId: null }, { itemId: data.itemId }],
  });
  if (blackout) {
    throw Object.assign(new Error('Service not available on this date'), { statusCode: 400, code: 'BLACKOUT_DATE' });
  }

  const endTime = new Date(data.startTime.getTime() + config.duration * 60_000);
  const approvalRequired =
    (config as any).confirmationType === 'request' ||
    (!(config as any).confirmationType && config.requiresApproval === true);
  const status = approvalRequired ? 'pending' : 'confirmed';

  const addonTotal = (data.selectedAddons ?? []).reduce((sum, a) => sum + (a.price ?? 0), 0);
  const basePrice = (config as any).pricePerPerson ? ((item as any).price ?? 0) * data.partySize : (item as any).price ?? 0;
  const totalBeforeDiscount = parseFloat((basePrice + addonTotal).toFixed(2));

  // ── Online payment verification (server-authoritative) ─────────────────────
  if (data.payment === 'online') {
    if (!data.stripePaymentIntentId || !data.guestCheckoutId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'stripePaymentIntentId and guestCheckoutId are required for online payment');
    }

    const existingBooking = await Booking.findOne({
      $or: [{ stripePaymentIntentId: data.stripePaymentIntentId }, { guestCheckoutId: data.guestCheckoutId }],
    });
    if (existingBooking) {
      return {
        booking: existingBooking,
        guestCancelToken: null,
        guestStatusToken: generateGuestStatusToken(data.hotelId, existingBooking.guestEmail),
      };
    }

    const paymentIntent = await retrievePaymentIntent(data.stripePaymentIntentId);
    const pendingPayment = await PendingGuestPayment.findOne({
      paymentIntentId: data.stripePaymentIntentId,
      checkoutId: data.guestCheckoutId,
      hotelId: new mongoose.Types.ObjectId(data.hotelId),
    });

    if (!pendingPayment) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Checkout session not found or has expired');
    }

    if (pendingPayment.usedAt || pendingPayment.orderId) {
      throw new ApiError(httpStatus.CONFLICT, 'Checkout session has already been used');
    }

    const expectedCartHash = buildBookingCartHash({
      hotelId: data.hotelId,
      itemId: data.itemId,
      partySize: data.partySize,
      discountCode: data.discountCode,
      selectedAddons: data.selectedAddons,
    });

    if (pendingPayment.cartHash !== expectedCartHash) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Payment no longer matches the current booking contents');
    }

    if (paymentIntent.status !== 'succeeded') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Payment has not been completed');
    }

    const expectedAmountCents = Math.round(totalBeforeDiscount * 100);
    if (paymentIntent.amount !== expectedAmountCents) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Payment amount does not match the booking total');
    }

    if (normalizeCurrency(paymentIntent.currency) !== normalizeCurrency(pendingPayment.currency)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Payment currency does not match');
    }

    if (String(paymentIntent.metadata?.['hotelId'] || '') !== String(data.hotelId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Payment does not belong to this hotel');
    }

    if (String(paymentIntent.metadata?.['checkoutId'] || '') !== data.guestCheckoutId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Payment does not belong to this checkout session');
    }

    // Mark as used to prevent duplicate submissions
    await PendingGuestPayment.findOneAndUpdate(
      { paymentIntentId: data.stripePaymentIntentId },
      { $set: { usedAt: new Date(), status: 'succeeded' } }
    );
  }
  const guestCancelToken = crypto.randomBytes(24).toString('hex');
  const guestCancelTokenHash = crypto.createHash('sha256').update(guestCancelToken).digest('hex');
  const booking = await withOptionalTransaction<IBookingDoc>(async (session) => {
    const updatedSlot =
      config.slotType === 'private'
        ? await TimeSlot.findOneAndUpdate(
            { itemId: data.itemId, startTime: data.startTime, isBlocked: false, bookedPersons: 0 },
            { $set: { bookedPersons: data.partySize } },
            { new: true, ...(session ? { session } : {}) }
          )
        : await TimeSlot.findOneAndUpdate(
            {
              itemId: data.itemId,
              startTime: data.startTime,
              isBlocked: false,
              $expr: { $lte: [{ $add: ['$bookedPersons', data.partySize] }, '$maxPersons'] },
            },
            { $inc: { bookedPersons: data.partySize } },
            { new: true, ...(session ? { session } : {}) }
          );

    if (!updatedSlot) {
      throw Object.assign(new Error('Slot unavailable'), { statusCode: 409, code: 'SLOT_UNAVAILABLE' });
    }

    let nextTotal = totalBeforeDiscount;
    let nextDiscountAmount: number | undefined;
    let nextAppliedDiscountCode: string | undefined;
    let discountUsageIncremented = false;

    if (data.discountCode?.trim()) {
      const validation = await validateDiscount({
        hotelId: data.hotelId,
        code: data.discountCode,
        items: [
          {
            itemId: data.itemId,
            qty: 1,
            categoryId: String((item as any).categoryId ?? ''),
            price: totalBeforeDiscount,
          },
        ],
        totalAmount: totalBeforeDiscount,
      });

      if (validation.valid && validation.discountAmount != null && validation.newTotal != null) {
        nextTotal = validation.newTotal;
        nextDiscountAmount = validation.discountAmount;
        nextAppliedDiscountCode = data.discountCode.trim().toUpperCase();
        await DiscountCode.findOneAndUpdate(
          {
            hotelId: data.hotelId,
            code: nextAppliedDiscountCode,
            $or: [{ maxUses: null }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }],
          },
          { $inc: { usedCount: 1 } },
          session ? { session } : {}
        );
        discountUsageIncremented = true;
      }
    }

    const bookingRef = await generateBookingRef(new Date(), session);

    try {
      const bookingDoc = new Booking({
        ...data,
        idempotencyKey: normalizedIdempotencyKey,
        bookingRef,
        guestEmail: data.guestEmail.trim().toLowerCase(),
        endTime,
        resourceIds: config.resourceIds ?? [],
        status,
        total: nextTotal,
        ...(nextAppliedDiscountCode
          ? {
              discountCode: nextAppliedDiscountCode,
              discountAmount: nextDiscountAmount,
              originalTotal: totalBeforeDiscount,
            }
          : {}),
        guestCancelTokenHash,
        selectedAddons: data.selectedAddons ?? [],
        ...(data.payment === 'online'
          ? {
              stripePaymentIntentId: data.stripePaymentIntentId,
              guestCheckoutId: data.guestCheckoutId,
              stripeStatus: 'succeeded',
              paidAt: new Date(),
            }
          : {}),
      });
      await bookingDoc.save(session ? { session } : {});
      return bookingDoc;
    } catch (error: any) {
      if (!session) {
        await TimeSlot.findOneAndUpdate(
          {
            itemId: data.itemId,
            startTime: data.startTime,
            bookedPersons: { $gte: data.partySize },
          },
          { $inc: { bookedPersons: -data.partySize } }
        );

        if (discountUsageIncremented && nextAppliedDiscountCode) {
          await DiscountCode.findOneAndUpdate(
            {
              hotelId: data.hotelId,
              code: nextAppliedDiscountCode,
              usedCount: { $gt: 0 },
            },
            { $inc: { usedCount: -1 } }
          );
        }
      }

      if (normalizedIdempotencyKey && error?.code === 11000) {
        const existingBooking = await Booking.findOne({
          hotelId: data.hotelId,
          idempotencyKey: normalizedIdempotencyKey,
        });
        if (existingBooking) {
          return existingBooking;
        }
      }

      throw error;
    }
  });

  // Dispatch + SSE
  const routeResult = await dispatchService.route(data.hotelId, 'booking', String((item as any).categoryId), data.itemId);
  sendSSEEventToAll(data.hotelId, routeResult.groupId, 'new_booking', booking.toJSON());

  const hotel = await Hotel.findById(data.hotelId).select('bookings name');
  const bookingNotificationEmails = Array.isArray((hotel as any)?.bookings?.emails)
    ? ((hotel as any).bookings.emails as string[]).filter(Boolean)
    : [];

  if (bookingNotificationEmails.length > 0) {
    const subject = `[New booking] ${item.name} - ${booking.bookingRef}`;
    const text = [
      `A new booking has been created.`,
      `Reference: ${booking.bookingRef}`,
      `Service: ${item.name}`,
      `Guest room: ${data.guestRoomNumber}`,
      `Start: ${data.startTime.toISOString()}`,
      `Status: ${status}`,
    ].join('\n');
    const html = `
      <p>A new booking has been created.</p>
      <p><strong>Reference:</strong> ${booking.bookingRef}</p>
      <p><strong>Service:</strong> ${item.name}</p>
      <p><strong>Guest room:</strong> ${data.guestRoomNumber}</p>
      <p><strong>Start:</strong> ${data.startTime.toLocaleString()}</p>
      <p><strong>Status:</strong> ${status}</p>
    `;

    await sendEmail(bookingNotificationEmails.join(','), subject, text, html).catch((err) =>
      logger.error('Booking notification email failed', err)
    );
  }

  // Escalation for pending bookings
  if (approvalRequired) {
    const escalationTimer = setTimeout(async () => {
      try {
        const b = await Booking.findById(booking._id).select('status bookingRef guestEmail');
        if (!b || b.status !== 'pending') return;

        const subject = `[Escalation] Booking ${b.bookingRef} unconfirmed`;
        const text = `Booking ${b.bookingRef} has not been confirmed within the required time.`;
        const html = `<p>Booking <strong>${b.bookingRef}</strong> has not been confirmed within the required time. Please check the dashboard.</p>`;

        if (routeResult.groupEmails.length > 0) {
          await sendEmail(routeResult.groupEmails.join(','), subject, text, html).catch((err) =>
            logger.error('Booking escalation email failed', err)
          );
        }
        sendSSEEventToAll(data.hotelId, routeResult.groupId, 'escalation_alert', {
          bookingId: String(booking._id),
          bookingRef: b.bookingRef,
          firedAt: new Date(),
        });
      } catch (err) {
        logger.error('Booking escalation handler error', err);
      }
    }, routeResult.escalationSeconds * 1000);

    // Store timer so it can be cancelled on confirmation/cancellation
    escalationTimers.set(String(booking._id), escalationTimer);
  }

  // Booking confirmation email
  const subject = `Booking ${status === 'confirmed' ? 'confirmed' : 'pending'}: ${item.name}`;
  const statusUrl = getGuestStatusUrl(data.roomId, data.hotelId, data.guestEmail);
  const text = `Your booking for ${item.name} on ${data.startTime.toISOString()} has been ${status}. Check your status: ${statusUrl}`;
  const html = `<p>Your booking for <strong>${
    item.name
  }</strong> on ${data.startTime.toLocaleString()} has been <strong>${status}</strong>.</p><p>Booking reference: ${
    booking.bookingRef
  }</p><p style="margin-top:24px"><a href="${statusUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600">Check your status</a></p>`;
  await sendEmail(data.guestEmail, subject, text, html).catch((err) =>
    logger.error('Booking confirmation email failed', err)
  );

  return {
    booking,
    guestCancelToken,
    guestStatusToken: generateGuestStatusToken(data.hotelId, data.guestEmail),
  };
}

export function cancelBookingEscalation(bookingId: string): void {
  const timer = escalationTimers.get(bookingId);
  if (timer) {
    clearTimeout(timer);
    escalationTimers.delete(bookingId);
  }
}

export async function cancelBooking(bookingId: string, cancelledBy: 'guest' | 'staff', guestCancelToken?: string) {
  const bookingQuery =
    cancelledBy === 'guest' ? Booking.findById(bookingId).select('+guestCancelTokenHash') : Booking.findById(bookingId);
  const booking = await bookingQuery;

  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
  if (booking.status === 'cancelled') {
    return booking;
  }
  if (booking.status === 'completed' || booking.status === 'no_show') {
    throw Object.assign(new Error('Cannot cancel booking in current state'), { statusCode: 400 });
  }

  if (cancelledBy === 'guest') {
    const providedHash = guestCancelToken ? crypto.createHash('sha256').update(guestCancelToken).digest('hex') : '';

    if (!providedHash || providedHash !== booking.guestCancelTokenHash) {
      throw Object.assign(new Error('Valid guest cancellation token is required'), { statusCode: 403 });
    }
  }

  // Cancel any pending escalation
  cancelBookingEscalation(bookingId);

  const cancelledAt = new Date();
  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      status: { $nin: ['cancelled', 'completed', 'no_show'] },
    },
    {
      $set: {
        status: 'cancelled',
        cancelledAt,
        cancelledBy,
        guestCancelTokenHash: null,
      },
    },
    { new: true }
  );

  if (!updatedBooking) {
    const currentBooking = await Booking.findById(bookingId);
    if (!currentBooking) {
      throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
    }
    return currentBooking;
  }

  await TimeSlot.findOneAndUpdate(
    {
      itemId: booking.itemId,
      startTime: booking.startTime,
      bookedPersons: { $gte: booking.partySize },
    },
    { $inc: { bookedPersons: -booking.partySize } }
  );

  // Find first unnotified waitlist entry — set notifiedAt BEFORE sending email
  const waitlistEntry = await BookingWaitlist.findOne({
    itemId: booking.itemId,
    slotStartTime: booking.startTime,
    notifiedAt: null,
  }).sort({ createdAt: 1 });

  if (waitlistEntry) {
    waitlistEntry.notifiedAt = new Date();
    await waitlistEntry.save();
    const subject = 'Slot available — book now';
    const text = `A slot is now available for booking starting ${updatedBooking.startTime.toISOString()}. Book now before it fills up.`;
    const html = `<p>A slot you were waiting for is now available. <strong>Book now</strong> before it fills up!</p>`;
    await sendEmail(waitlistEntry.guestEmail, subject, text, html).catch((err) =>
      logger.error('Waitlist notification email failed', err)
    );
  }

  return updatedBooking;
}

export async function joinWaitlist(data: {
  itemId: string;
  slotStartTime: Date;
  hotelId: string;
  guestEmail: string;
  guestRoomNumber: string;
  partySize: number;
}) {
  const item = await CatalogItem.findOne({
    _id: data.itemId,
    hotelId: data.hotelId,
    type: 'bookable',
    available: true,
  }).select('_id');
  if (!item) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Item not available for waitlist');
  }

  return BookingWaitlist.create(data);
}

async function processWaitlistFollowUps(): Promise<void> {
  const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000);
  const expired = await BookingWaitlist.find({ notifiedAt: { $lte: twoHoursAgo } });

  for (const entry of expired) {
    const slot = await TimeSlot.findOne({ itemId: entry.itemId, startTime: entry.slotStartTime });
    if (!slot || slot.bookedPersons >= slot.maxPersons) continue;

    const next = await BookingWaitlist.findOne({
      itemId: entry.itemId,
      slotStartTime: entry.slotStartTime,
      notifiedAt: null,
    }).sort({ createdAt: 1 });

    if (next) {
      next.notifiedAt = new Date();
      await next.save();
      const subject = 'Slot available — book now';
      const text = `A slot is now available starting ${entry.slotStartTime.toISOString()}.`;
      const html = `<p>A slot you were waiting for is now available. Book now!</p>`;
      await sendEmail(next.guestEmail, subject, text, html).catch((err) =>
        logger.error('Waitlist follow-up email failed', err)
      );
    }
  }
}

export function startWaitlistCron(): void {
  cron.schedule('*/15 * * * *', processWaitlistFollowUps);
  logger.info('Waitlist follow-up cron started (every 15 min)');
}
