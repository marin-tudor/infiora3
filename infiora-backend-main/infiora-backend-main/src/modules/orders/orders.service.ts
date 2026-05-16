import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { withOptionalTransaction } from '../utils';
import OrderCategory from './order-category.model';
import OrderVisit from './order-visit.model';
import CatalogItem from './catalog-item.model';
import GuestOrder from './guest-order.model';
import ReservationCode from './reservation-code.model';
import OrderPromotion from './order-promotion.model';
import DiscountCode from './discount-code.model';
import PendingGuestPayment from './pending-guest-payment.model';
import Booking from '../booking/booking.model';
import { dispatchService } from '../dispatch';
import { cancelEscalation, scheduleEscalation } from '../scheduler/escalation';
import { sendSSEEvent, sendSSEEventToAll } from './sse.service';
import config from '../../config/config';
import logger from '../logger/logger';
import ApiError from '../errors/ApiError';
import { Room } from '../room';
import { Hotel } from '../hotel';
import { Activity } from '../activity';
import * as emailService from '../email/email.service';
import { scheduleNpsEmail } from '../nps/nps.service';
import {
  IOrderCategoryDoc,
  ICatalogItemDoc,
  IGuestOrderDoc,
  IReservationCodeDoc,
  IOrderPromotionDoc,
  IHotelOrdersSettings,
  IGuestOrdersSettings,
  IPlaceOrderBody,
  IOrderAnalytics,
  IOrderVisitAnalytics,
  IPaymentMethodsSettings,
  NewOrderCategory,
  UpdateOrderCategory,
  NewCatalogItem,
  UpdateCatalogItem,
  NewReservationCode,
  UpdateReservationCode,
  NewOrderPromotion,
  UpdateOrderPromotion,
  OrderStatus,
  ISSENewOrderPayload,
  ISSEOrderUpdatedPayload,
  ICalPlatform,
  NewICalSource,
  IICalSourceDoc,
  NewDiscountCode,
  UpdateDiscountCode,
  DiscountType,
} from './orders.interfaces';
import { IOptions, QueryResult } from '../paginate/paginate';
import ICalSource from './ical-source.model';
import { assertSafeRemoteUrl, syncICalSource } from './ical-sync.service';
import { createPaymentIntent, getHotelStripeCurrency, retrievePaymentIntent } from '../stripe/stripe.service';

// ─── PIN Rate Limiter ─────────────────────────────────────────────────────────
const pinAttempts = new Map<string, { count: number; resetAt: number }>();

const checkPinRateLimit = (hotelId: string): void => {
  const entry = pinAttempts.get(hotelId);
  if (!entry) return;
  if (Date.now() >= entry.resetAt) {
    pinAttempts.delete(hotelId);
    return;
  }
  if (entry.count >= 5) {
    throw new ApiError(httpStatus.TOO_MANY_REQUESTS, 'Too many PIN attempts. Try again in 15 minutes.');
  }
};

const recordPinFailure = (hotelId: string): void => {
  const entry = pinAttempts.get(hotelId);
  if (!entry || Date.now() >= entry.resetAt) {
    pinAttempts.set(hotelId, { count: 1, resetAt: Date.now() + 15 * 60 * 1000 });
  } else {
    entry.count += 1;
  }
};

const resetPinAttempts = (hotelId: string): void => {
  pinAttempts.delete(hotelId);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateOrderId = (): string => {
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `#${rnd}${ts}`;
};

const generateTrackingToken = (): string => randomBytes(24).toString('hex');
const generateCheckoutId = (): string => randomBytes(18).toString('hex');
const normalizeGuestEmail = (email: string): string => email.trim().toLowerCase();
const normalizeCurrency = (currency: string): string => currency.trim().toLowerCase();

type DiscountValidationItemInput = {
  itemId: string;
  qty: number;
  categoryId?: string;
  price?: number;
};

const buildGuestCheckoutCartHash = ({
  roomId,
  items,
  discountCode,
}: {
  roomId: string;
  items: IPlaceOrderBody['items'];
  discountCode?: string | null | undefined;
}): string => {
  const normalizedItems = items
    .map((item) => ({
      itemId: String(item.itemId),
      qty: Number(item.qty),
      selectedModifiers: (item.selectedModifiers ?? [])
        .map((modifier) => ({
          group: modifier.group,
          option: modifier.option,
          priceAdj: Number(modifier.priceAdj ?? 0),
        }))
        .sort((left, right) => `${left.group}:${left.option}`.localeCompare(`${right.group}:${right.option}`)),
    }))
    .sort((left, right) => left.itemId.localeCompare(right.itemId));

  return createHash('sha256')
    .update(
      JSON.stringify({
        roomId: String(roomId),
        discountCode: discountCode?.trim().toUpperCase() || null,
        items: normalizedItems,
      })
    )
    .digest('hex');
};

const syncPendingGuestPaymentFromIntent = async ({
  paymentIntent,
  fallbackCheckoutId,
}: {
  paymentIntent: Awaited<ReturnType<typeof retrievePaymentIntent>>;
  fallbackCheckoutId?: string;
}) => {
  const hotelId = String(paymentIntent.metadata?.['hotelId'] || '');
  const roomId = String(paymentIntent.metadata?.['roomId'] || '');
  const checkoutId = String(paymentIntent.metadata?.['checkoutId'] || fallbackCheckoutId || '');
  const cartHash = String(paymentIntent.metadata?.['cartHash'] || '');

  if (!hotelId || !roomId || !checkoutId) {
    return null;
  }

  return PendingGuestPayment.findOneAndUpdate(
    { paymentIntentId: paymentIntent.id },
    {
      $set: {
        checkoutId,
        hotelId: new mongoose.Types.ObjectId(hotelId),
        roomId: new mongoose.Types.ObjectId(roomId),
        amountCents: paymentIntent.amount,
        currency: normalizeCurrency(paymentIntent.currency),
        cartHash,
        status:
          paymentIntent.status === 'succeeded'
            ? 'succeeded'
            : paymentIntent.status === 'processing'
              ? 'processing'
              : paymentIntent.status === 'requires_payment_method'
                ? 'requires_payment_method'
                : paymentIntent.status === 'canceled'
                  ? 'failed'
                  : 'pending',
        paidAt: paymentIntent.status === 'succeeded' ? new Date() : null,
      },
    },
    { new: true, upsert: true }
  );
};

const DEFAULT_PAYMENT_METHODS: IPaymentMethodsSettings = {
  cash: true,
  card: true,
  online: false,
};

const normalizePaymentMethod = (payment: IPlaceOrderBody['payment']): 'cash' | 'card' | 'room' | 'online' => payment;

/** Parse 'HH:MM' to total minutes since midnight */
const timeToMinutes = (t: string): number => {
  if (!t) return -1;
  const parts = t.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
};

/** Returns true if current time is within [from, to] ('HH:MM') */
const isWithinTimeWindow = (from?: string, to?: string): boolean => {
  if (!from || !to) return true; // no restriction
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(from);
  const end = timeToMinutes(to);
  if (start <= end) return current >= start && current <= end;
  // overnight window e.g. 22:00–06:00
  return current >= start || current <= end;
};

/** Ensure the requesting user owns the hotel that owns the order */
export const assertOrderOwner = async (orderId: string, userId: string, role: string): Promise<IGuestOrderDoc> => {
  const order = await GuestOrder.findOne({ orderId });
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');

  if (role === 'admin') return order;

  const hotel = await Hotel.findById(order.hotelId);
  if (!hotel) throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');

  const hotelUserId = String((hotel as any).user);
  const hotelManagerId = String((hotel as any).manager);

  if (hotelUserId !== userId && hotelManagerId !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }
  return order;
};

export const trackCheckinUsage = async ({
  hotelId,
  actorUserId,
  actorRole,
}: {
  hotelId: mongoose.Types.ObjectId;
  actorUserId: string;
  actorRole?: string;
}) => {
  const hotel = await Hotel.findById(hotelId).select('_id user name image');
  if (!hotel) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');
  }

  const activity = await Activity.create({
    user: hotel.user,
    hotel: hotel._id,
    action: 'tap',
    details: {
      image: hotel.image,
      title: hotel.name,
      headline: `${hotel.name} opened Guests Check In`,
      button: 'checkin',
      buttonTitle: 'Guests Check In',
      source: 'sidebar',
      destination: 'https://dash.eprijava.hr',
      actorUserId,
      actorRole: actorRole || 'hotel',
    },
  });

  return { tracked: true, activityId: String(activity._id) };
};

const assertStaffOrderAccess = async (orderId: string, hotelId: string): Promise<IGuestOrderDoc> => {
  const order =
    (mongoose.Types.ObjectId.isValid(orderId) ? await GuestOrder.findOne({ _id: orderId }) : null) ??
    (await GuestOrder.findOne({ orderId }));
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  if (String(order.hotelId) !== hotelId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }
  return order;
};

const assertCategoryBelongsToHotel = async (
  hotelId: mongoose.Types.ObjectId,
  categoryId?: mongoose.Types.ObjectId | string | null
): Promise<void> => {
  if (!categoryId) return;

  const category = await OrderCategory.findOne({ _id: categoryId, hotelId }).select('_id');
  if (!category) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Category does not belong to this hotel');
  }
};

const assertItemsBelongToHotel = async (
  hotelId: mongoose.Types.ObjectId,
  itemIds?: (mongoose.Types.ObjectId | string)[] | null
): Promise<void> => {
  if (!itemIds?.length) return;

  const normalizedIds = itemIds.map((itemId) => new mongoose.Types.ObjectId(String(itemId)));
  const count = await CatalogItem.countDocuments({ _id: { $in: normalizedIds }, hotelId });

  if (count !== normalizedIds.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'One or more items do not belong to this hotel');
  }
};

const assertPromotionTargetsBelongToHotel = async (
  hotelId: mongoose.Types.ObjectId,
  payload: { categoryIds?: (mongoose.Types.ObjectId | string)[]; itemIds?: (mongoose.Types.ObjectId | string)[] }
): Promise<void> => {
  if (payload.categoryIds?.length) {
    const normalizedCategoryIds = payload.categoryIds.map((categoryId) => new mongoose.Types.ObjectId(String(categoryId)));
    const count = await OrderCategory.countDocuments({ _id: { $in: normalizedCategoryIds }, hotelId });

    if (count !== normalizedCategoryIds.length) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'One or more promotion categories do not belong to this hotel');
    }
  }

  await assertItemsBelongToHotel(hotelId, payload.itemIds);
};

const resolveSelectedModifiers = (
  catalogItem: ICatalogItemDoc,
  selectedModifiers: { group: string; option: string; priceAdj: number }[] = []
) => {
  const resolvedModifiers = selectedModifiers.map((selectedModifier) => {
    const modifierGroup = catalogItem.modifiers.find((group) => group.group === selectedModifier.group);
    if (!modifierGroup) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Modifier group ${selectedModifier.group} is invalid for ${catalogItem.name}`
      );
    }

    const modifierOption = modifierGroup.options.find((option) => option.label === selectedModifier.option);
    if (!modifierOption) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Modifier option ${selectedModifier.option} is invalid for ${catalogItem.name}`
      );
    }

    return {
      group: modifierGroup.group,
      option: modifierOption.label,
      priceAdj: modifierOption.priceAdj,
    };
  });

  catalogItem.modifiers
    .filter((group) => group.required)
    .forEach((requiredGroup) => {
      const hasSelection = resolvedModifiers.some((modifier) => modifier.group === requiredGroup.group);

      if (!hasSelection) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Modifier group ${requiredGroup.group} is required for ${catalogItem.name}`
        );
      }
    });

  return resolvedModifiers;
};

const calculateOrderPricing = async (
  hotelId: mongoose.Types.ObjectId,
  items: IPlaceOrderBody['items'],
  discountCode?: string | null
) => {
  const itemIds = items.map((i) => new mongoose.Types.ObjectId(i.itemId));
  const catalogItems = await CatalogItem.find({ _id: { $in: itemIds }, hotelId });
  const catalogItemMap = new Map(catalogItems.map((i) => [String(i._id), i]));

  if (catalogItems.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No valid items found');
  }

  const orderItems = items.map((bodyItem) => {
    const catalogItem = catalogItems.find((ci) => String(ci._id) === bodyItem.itemId);
    if (!catalogItem) throw new ApiError(httpStatus.BAD_REQUEST, `Item ${bodyItem.itemId} not found`);
    if (!catalogItem.available) throw new ApiError(httpStatus.BAD_REQUEST, `${catalogItem.name} is currently unavailable`);

    const discountedPrice =
      catalogItem.discount > 0
        ? parseFloat((catalogItem.price * (1 - catalogItem.discount / 100)).toFixed(2))
        : catalogItem.price;

    const resolvedModifiers = resolveSelectedModifiers(catalogItem, bodyItem.selectedModifiers ?? []);
    const modifierAdj = resolvedModifiers.reduce((sum, modifier) => sum + modifier.priceAdj, 0);
    const finalPrice = parseFloat((discountedPrice + modifierAdj).toFixed(2));

    return {
      itemId: catalogItem._id as mongoose.Types.ObjectId,
      name: catalogItem.name,
      qty: bodyItem.qty,
      price: finalPrice,
      originalPrice: catalogItem.price,
      image: catalogItem.image,
      selectedModifiers: resolvedModifiers,
    };
  });

  let total = parseFloat(orderItems.reduce((sum, item) => sum + item.price * item.qty, 0).toFixed(2));
  let discountAmount: number | undefined;
  let originalTotal: number | undefined;
  let appliedDiscountCode: string | undefined;

  if (discountCode) {
    const itemsForDiscount = items.map((item) => ({
      itemId: item.itemId,
      qty: item.qty,
      categoryId: String((catalogItemMap.get(item.itemId) as any)?.categoryId || ''),
      price: orderItems.find((orderItem) => String(orderItem.itemId) === item.itemId)?.price ?? 0,
    }));
    const validation = await validateDiscount({
      hotelId: String(hotelId),
      code: discountCode,
      items: itemsForDiscount,
      totalAmount: total,
    });
    if (validation.valid && validation.discountAmount != null) {
      originalTotal = total;
      discountAmount = validation.discountAmount;
      total = validation.newTotal!;
      appliedDiscountCode = discountCode.trim().toUpperCase();
    }
  }

  return {
    orderItems,
    total,
    catalogItems,
    discountAmount,
    originalTotal,
    appliedDiscountCode,
  };
};

export const createGuestPaymentIntent = async (body: {
  roomId: string;
  items: IPlaceOrderBody['items'];
  discountCode?: string | null;
}) => {
  const room = await Room.findById(body.roomId).populate('hotel');
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
  }

  const hotel = (room as any).hotel;
  const hotelId: mongoose.Types.ObjectId = hotel._id;
  const settings = await getOrdersSettings(hotelId);

  if (!settings.enabled || !settings.paymentMethods?.online) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Online payment is not available');
  }

  const pricing = await calculateOrderPricing(hotelId, body.items, body.discountCode);
  const checkoutId = generateCheckoutId();
  const cartHash = buildGuestCheckoutCartHash({
    roomId: body.roomId,
    items: body.items,
    discountCode: body.discountCode,
  });
  const amountCents = Math.round(pricing.total * 100);
  const currency = getHotelStripeCurrency(hotel);

  const paymentIntent = await createPaymentIntent({
    hotelId: String(hotelId),
    amountCents,
    metadata: {
      roomId: body.roomId,
      checkoutId,
      cartHash,
    },
  });

  await PendingGuestPayment.findOneAndUpdate(
    { paymentIntentId: paymentIntent.paymentIntentId },
    {
      $set: {
        checkoutId,
        paymentIntentId: paymentIntent.paymentIntentId,
        hotelId,
        roomId: new mongoose.Types.ObjectId(body.roomId),
        amountCents,
        currency,
        cartHash,
        discountCode: body.discountCode?.trim().toUpperCase() || null,
        status: 'pending',
      },
    },
    { upsert: true }
  );

  return {
    ...paymentIntent,
    checkoutId,
  };
};

// ─── Hotel Orders Settings ────────────────────────────────────────────────────

export const getOrdersSettings = async (hotelId: mongoose.Types.ObjectId): Promise<IHotelOrdersSettings> => {
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');
  const settings = (hotel as any).orders as IHotelOrdersSettings | undefined;
  return {
    ...(settings ?? {
      enabled: false,
      availableFrom: '00:00',
      availableTo: '00:00',
      currencySymbol: '€',
      processingLabel: 'Processing',
      onTheWayLabel: 'On the way',
      completedLabel: 'Completed',
      paymentMethods: DEFAULT_PAYMENT_METHODS,
      venueType: 'hotel' as const,
      requireCode: true,
      requireLocation: true,
      locationLabel: 'Room number',
      tablePin: '',
      kioskMode: false,
    }),
    paymentMethods: settings?.paymentMethods ?? DEFAULT_PAYMENT_METHODS,
  };
};

export const updateOrdersSettings = async (
  hotelId: mongoose.Types.ObjectId,
  body: Partial<IHotelOrdersSettings>
): Promise<IHotelOrdersSettings> => {
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');
  const current = (hotel as any).orders ?? {};
  (hotel as any).orders = { ...current, ...body };
  await hotel.save();
  return (hotel as any).orders;
};

// ─── Catalog for Guest (public) ───────────────────────────────────────────────

export const getCatalogForRoom = async (
  roomId: string
): Promise<{
  settings: IGuestOrdersSettings;
  categories: IOrderCategoryDoc[];
  items: ICatalogItemDoc[];
  promotions: IOrderPromotionDoc[];
  hotelName: string;
  hotelImage: string | null;
}> => {
  const room = await Room.findById(roomId).populate('hotel');
  if (!room) throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');

  const { hotel } = room as any;
  const hotelId = hotel._id;
  const settings = await getOrdersSettings(hotelId);

  if (!settings.enabled) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Orders are currently unavailable');
  }

  const now24h = isWithinTimeWindow(settings.availableFrom, settings.availableTo);
  if (!now24h && settings.availableFrom !== '00:00') {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      `Orders available from ${settings.availableFrom} to ${settings.availableTo}`
    );
  }

  const [categories, items, promotions] = await Promise.all([
    OrderCategory.find({ hotelId, active: true }).sort({ sortOrder: 1, createdAt: 1 }),
    CatalogItem.find({ hotelId }).sort({ sortOrder: 1, createdAt: 1 }),
    OrderPromotion.find({
      hotelId,
      active: true,
      $or: [{ validFrom: null }, { validFrom: { $lte: new Date() } }],
      $and: [{ $or: [{ validTo: null }, { validTo: { $gte: new Date() } }] }],
    }),
  ]);

  const { tablePin: _pin, ...guestSettings } = settings;
  return {
    settings: guestSettings as IGuestOrdersSettings,
    categories,
    items,
    promotions,
    hotelName: hotel.name || '',
    hotelImage: hotel.image || null,
  };
};

export const generateGuestStatusToken = (hotelId: string, email: string): string =>
  jwt.sign({ type: 'guest-status', hotelId, email: normalizeGuestEmail(email) }, config.jwt.secret, { expiresIn: '7d' });

export const verifyGuestStatusToken = (token: string): { hotelId: string; email: string } => {
  let payload: any;
  try {
    payload = jwt.verify(token, config.jwt.secret) as any;
  } catch {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired guest status link');
  }

  if (payload?.type !== 'guest-status' || !payload?.hotelId || !payload?.email) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid guest status link');
  }

  return {
    hotelId: String(payload.hotelId),
    email: normalizeGuestEmail(String(payload.email)),
  };
};

export const getGuestStatusUrl = (roomId: string, hotelId: string, email: string): string => {
  const token = generateGuestStatusToken(hotelId, email);
  return `${config.urls.app}/${roomId}/guest-status#token=${encodeURIComponent(token)}`;
};

export const sendGuestStatusLink = async (roomId: string, email: string): Promise<void> => {
  const normalizedEmail = normalizeGuestEmail(email);
  const room = await Room.findById(roomId).populate('hotel');
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
  }

  const hotelId = String((room as any).hotel._id);
  const [ordersCount, bookingsCount] = await Promise.all([
    GuestOrder.countDocuments({ hotelId, guestEmail: normalizedEmail }),
    Booking.countDocuments({ hotelId, guestEmail: normalizedEmail }),
  ]);

  if (ordersCount === 0 && bookingsCount === 0) {
    return;
  }

  const statusUrl = getGuestStatusUrl(roomId, hotelId, normalizedEmail);
  try {
    await emailService.sendGuestStatusLinkEmail(normalizedEmail, (room as any).hotel.name || 'Infiora', statusUrl);
  } catch (error) {
    if (config.env !== 'production') {
      logger.error('Failed to send guest status email locally', error);
      return;
    }

    throw error;
  }
};

export const getGuestStatusSummary = async (
  token: string
): Promise<{ hotel: { id: string; name: string }; email: string; orders: any[]; bookings: any[] }> => {
  const payload = verifyGuestStatusToken(token);
  const hotelId = payload.hotelId;
  const email = payload.email;

  const [hotel, orders, bookings] = await Promise.all([
    Hotel.findById(hotelId).select('name'),
    GuestOrder.find({ hotelId, guestEmail: email }).sort({ createdAt: -1 }).limit(100),
    Booking.find({ hotelId, guestEmail: email })
      .populate('itemId', 'name bookingConfig.cancelPolicyHours bookingConfig.cancellationPolicyHours')
      .sort({ startTime: -1, createdAt: -1 })
      .limit(100),
  ]);

  if (!hotel) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');
  }

  return {
    hotel: { id: String(hotel._id), name: hotel.name || 'Hotel' },
    email,
    orders: orders.map((order: any) => ({
      id: String(order._id),
      orderId: order.orderId,
      roomNumber: order.roomNumber,
      guestRoomNumber: order.guestRoomNumber,
      items: order.items,
      total: order.total,
      payment: order.payment,
      status: order.status,
      acceptedEta: order.acceptedEta,
      acceptedAt: order.acceptedAt,
      completedAt: order.completedAt,
      scheduledFor: order.scheduledFor,
      note: order.note,
      createdAt: order.createdAt,
    })),
    bookings: bookings.map((booking: any) => ({
      id: String(booking._id),
      bookingRef: booking.bookingRef,
      itemName: booking.itemId?.name || 'Booking',
      guestRoomNumber: booking.guestRoomNumber,
      startTime: booking.startTime,
      endTime: booking.endTime,
      partySize: booking.partySize,
      status: booking.status,
      payment: booking.payment,
      total: booking.total,
      cancelledAt: booking.cancelledAt,
      createdAt: booking.createdAt,
      cancelPolicyHours:
        booking.itemId?.bookingConfig?.cancelPolicyHours ?? booking.itemId?.bookingConfig?.cancellationPolicyHours ?? 24,
    })),
  };
};

// ─── Reservation Code Validation ──────────────────────────────────────────────

export const validateReservationCode = async (
  roomId: string,
  hotelId: mongoose.Types.ObjectId,
  code: string | undefined
): Promise<IReservationCodeDoc> => {
  if (!code) throw new ApiError(httpStatus.UNAUTHORIZED, 'Reservation code is required');
  const normalizedCode = code.trim().toUpperCase().replace(/\s/g, '');
  const now = new Date();
  const reservationCode = await ReservationCode.findOne({
    hotelId,
    $or: [{ roomId: new mongoose.Types.ObjectId(roomId) }, { roomId: null }, { roomId: { $exists: false } }],
    code: normalizedCode,
    active: true,
    checkIn: { $lte: now },
    checkOut: { $gte: now },
  });

  if (!reservationCode) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired code');
  }

  return reservationCode;
};

// ─── Place Order ──────────────────────────────────────────────────────────────

export const placeOrder = async (roomId: string, body: IPlaceOrderBody): Promise<IGuestOrderDoc> => {
  const room = await Room.findById(roomId).populate('hotel');
  if (!room) throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');

  const { hotel } = room as any;
  const hotelId: mongoose.Types.ObjectId = hotel._id;
  const normalizedIdempotencyKey = body.idempotencyKey?.trim() || null;

  if (normalizedIdempotencyKey) {
    const existingOrder = await GuestOrder.findOne({ hotelId, idempotencyKey: normalizedIdempotencyKey });
    if (existingOrder) {
      return existingOrder;
    }
  }

  const settings = await getOrdersSettings(hotelId);
  const paymentMethods = settings.paymentMethods ?? DEFAULT_PAYMENT_METHODS;
  if (!settings.enabled) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Orders are currently unavailable');
  }
  const hotelIdStr = String(hotelId);
  let reservationCodeId: mongoose.Types.ObjectId | null = null;

  if (settings.requireCode) {
    if (settings.venueType === 'restaurant') {
      if (!settings.tablePin.trim()) {
        throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Table PIN is not configured. Contact staff.');
      }
      checkPinRateLimit(hotelIdStr);
      if (!body.tablePin || body.tablePin.trim() !== settings.tablePin.trim()) {
        recordPinFailure(hotelIdStr);
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid PIN');
      }
      resetPinAttempts(hotelIdStr);
    } else {
      if (!body.code) throw new ApiError(httpStatus.UNAUTHORIZED, 'Reservation code is required');
      const reservationCode = await validateReservationCode(roomId, hotelId, body.code);
      reservationCodeId = reservationCode._id as mongoose.Types.ObjectId;
    }
  }

  if (settings.requireLocation && !body.guestRoomNumber?.trim()) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${settings.locationLabel || 'Location'} is required`);
  }

  const normalizedPayment = normalizePaymentMethod(body.payment);
  const isPaymentMethodEnabled =
    (normalizedPayment === 'cash' && paymentMethods.cash) ||
    (normalizedPayment === 'card' && paymentMethods.card) ||
    normalizedPayment === 'room' ||
    (normalizedPayment === 'online' && paymentMethods.online);

  if (!isPaymentMethodEnabled) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Selected payment method is not available');
  }

  if (normalizedPayment === 'online' && !body.stripePaymentIntentId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Stripe payment intent is required for online payment');
  }

  if (normalizedPayment === 'online' && !body.guestCheckoutId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Checkout id is required for online payment');
  }

  // Enforce time window at placement too (catalog already checks on page load)
  if (settings.availableFrom !== '00:00' && !isWithinTimeWindow(settings.availableFrom, settings.availableTo)) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      `Orders available from ${settings.availableFrom} to ${settings.availableTo}`
    );
  }

  const pricing = await calculateOrderPricing(hotelId, body.items, body.discountCode);
  const { orderItems, total } = pricing;
  const firstCatalogItem = pricing.catalogItems.find((ci) => String(ci._id) === body.items[0]?.itemId);
  let { discountAmount, originalTotal, appliedDiscountCode } = pricing;
  const expectedAmountCents = Math.round(total * 100);

  if (normalizedPayment === 'online') {
    const paymentIntentId = body.stripePaymentIntentId!;
    const guestCheckoutId = body.guestCheckoutId!;
    const expectedCartHash = buildGuestCheckoutCartHash({
      roomId,
      items: body.items,
      discountCode: body.discountCode,
    });
    const existingOrder = await GuestOrder.findOne({
      $or: [{ stripePaymentIntentId: paymentIntentId }, { guestCheckoutId }],
    });
    if (existingOrder) {
      return existingOrder;
    }

    const paymentIntent = await retrievePaymentIntent(paymentIntentId);
    const pendingPayment = await PendingGuestPayment.findOne({
      paymentIntentId,
      checkoutId: guestCheckoutId,
      hotelId,
      roomId: new mongoose.Types.ObjectId(roomId),
    });

    if (!pendingPayment) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Checkout session was not found or has expired');
    }

    if (pendingPayment.usedAt || pendingPayment.orderId) {
      const alreadyCreatedOrder = await GuestOrder.findOne({
        $or: [{ stripePaymentIntentId: paymentIntentId }, { guestCheckoutId }],
      });
      if (alreadyCreatedOrder) {
        return alreadyCreatedOrder;
      }
      throw new ApiError(httpStatus.CONFLICT, 'Checkout session has already been used');
    }

    if (pendingPayment.cartHash !== expectedCartHash) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Payment no longer matches the current order contents');
    }

    if (paymentIntent.status !== 'succeeded') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Payment has not been completed');
    }

    if (paymentIntent.amount !== expectedAmountCents) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Payment amount does not match the current order total');
    }

    if (normalizeCurrency(paymentIntent.currency) !== normalizeCurrency(pendingPayment.currency)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Payment currency does not match hotel settings');
    }

    if (String(paymentIntent.metadata?.['hotelId'] || '') !== String(hotelId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Payment does not belong to this hotel');
    }

    if (String(paymentIntent.metadata?.['roomId'] || '') !== String(roomId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Payment does not belong to this room');
    }

    if (String(paymentIntent.metadata?.['checkoutId'] || '') !== guestCheckoutId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Payment does not belong to this checkout session');
    }

    if (String(paymentIntent.metadata?.['cartHash'] || '') !== expectedCartHash) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Payment no longer matches the current order contents');
    }

    await syncPendingGuestPaymentFromIntent({ paymentIntent, fallbackCheckoutId: guestCheckoutId });
  }

  const order = await withOptionalTransaction<IGuestOrderDoc>(async (session) => {
    let nextDiscountUsageIncremented = false;

    if (appliedDiscountCode) {
      await DiscountCode.findOneAndUpdate(
        {
          hotelId,
          code: appliedDiscountCode,
          $or: [{ maxUses: null }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }],
        },
        { $inc: { usedCount: 1 } },
        session ? { session } : {}
      );
      nextDiscountUsageIncremented = true;
    }

    let orderId = generateOrderId();
    let existing = session ? await GuestOrder.findOne({ orderId }).session(session) : await GuestOrder.findOne({ orderId });
    while (existing) {
      orderId = generateOrderId();
      existing = session ? await GuestOrder.findOne({ orderId }).session(session) : await GuestOrder.findOne({ orderId });
    }

    try {
      const orderDoc = new GuestOrder({
        orderId,
        trackingToken: generateTrackingToken(),
        hotelId,
        roomId: new mongoose.Types.ObjectId(roomId),
        roomNumber: (room as any).number ?? '',
        guestRoomNumber: body.guestRoomNumber ?? '',
        guestEmail: body.guestEmail ? normalizeGuestEmail(body.guestEmail) : null,
        items: orderItems,
        total,
        note: body.note ?? '',
        payment: normalizedPayment,
        language: body.language ?? '',
        status: 'Awaiting confirmation',
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
        reservationCodeId: reservationCodeId ?? undefined,
        idempotencyKey: normalizedIdempotencyKey,
        ...(body.stripePaymentIntentId
          ? {
              guestCheckoutId: body.guestCheckoutId,
              stripePaymentIntentId: body.stripePaymentIntentId,
              stripeStatus: normalizedPayment === 'online' ? 'succeeded' : 'pending',
              ...(normalizedPayment === 'online' ? { paidAt: new Date() } : {}),
            }
          : {}),
        ...(appliedDiscountCode ? { discountCode: appliedDiscountCode, discountAmount, originalTotal } : {}),
      });
      await orderDoc.save(session ? { session } : {});

      if (normalizedPayment === 'online' && body.stripePaymentIntentId && body.guestCheckoutId) {
        const pendingPaymentUpdate = PendingGuestPayment.findOneAndUpdate(
          {
            paymentIntentId: body.stripePaymentIntentId,
            checkoutId: body.guestCheckoutId,
            hotelId,
          },
          {
            $set: {
              orderId: orderDoc._id,
              usedAt: new Date(),
              status: 'succeeded',
              paidAt: orderDoc.paidAt ?? new Date(),
            },
          },
          session ? { session } : {}
        );

        if (session) {
          await pendingPaymentUpdate;
        } else {
          await pendingPaymentUpdate.catch((error) => {
            logger.error('Order pending payment finalization failed', error);
          });
        }
      }

      return orderDoc;
    } catch (error: any) {
      if (!session && nextDiscountUsageIncremented && appliedDiscountCode) {
        await DiscountCode.findOneAndUpdate(
          {
            hotelId,
            code: appliedDiscountCode,
            usedCount: { $gt: 0 },
          },
          { $inc: { usedCount: -1 } }
        );
      }

      if (normalizedIdempotencyKey && error?.code === 11000) {
        const existingOrder = await GuestOrder.findOne({ hotelId, idempotencyKey: normalizedIdempotencyKey });
        if (existingOrder) {
          return existingOrder;
        }
      }

      throw error;
    }
  });

  let dispatchGroupId: string | null = null;
  try {
    const hotelForDispatch = await Hotel.findById(hotelId).select('features orders');

    if ((hotelForDispatch as any)?.features?.smartDispatchingEnabled) {
      const routeResult = await dispatchService.route(
        String(hotelId),
        'order',
        firstCatalogItem?.categoryId ? String(firstCatalogItem.categoryId) : undefined,
        firstCatalogItem?._id ? String(firstCatalogItem._id) : undefined
      );
      dispatchGroupId = routeResult.groupId;
      order.set('dispatchGroupId', dispatchGroupId);
      await order.save();
      scheduleEscalation(String(order._id), String(hotelId), dispatchGroupId, routeResult.escalationSeconds);
    }
  } catch (error) {
    logger.error('Order post-create dispatch handling failed', error);
  }

  const ssePayload: ISSENewOrderPayload = {
    id: String(order._id),
    _id: String(order._id),
    orderId: order.orderId,
    roomNumber: order.guestRoomNumber || order.roomNumber,
    items: order.items.map((item) => ({ name: item.name, qty: item.qty })),
    itemCount: order.items.reduce((sum, item) => sum + item.qty, 0),
    total: order.total,
    note: order.note ?? undefined,
    payment: order.payment,
    status: order.status,
    scheduledFor: order.scheduledFor ?? undefined,
    createdAt: (order as any).createdAt,
  };
  sendSSEEventToAll(String(hotelId), dispatchGroupId, 'rs:new-order', ssePayload);

  // Emails (fire and forget — do not await to avoid blocking response)
  const hotelUser = await Hotel.findById(hotelId).populate('user');
  const staffEmail: string = (hotelUser as any)?.user?.email;
  const extraEmails: string[] = (hotelUser as any)?.orders?.emails || [];
  const allStaffEmails = Array.from(new Set([staffEmail, ...extraEmails].filter(Boolean)));

  allStaffEmails.forEach((email) => {
    emailService.sendNewOrderAlertEmail(email, hotel.name, order).catch(() => {});
  });
  if (body.guestEmail) {
    const normalizedEmail = normalizeGuestEmail(body.guestEmail);
    const statusUrl = getGuestStatusUrl(roomId, String(hotelId), normalizedEmail);
    emailService.sendOrderConfirmationEmail(normalizedEmail, hotel.name, order, statusUrl).catch(() => {});
  }

  return order;
};

// ─── Track Order (public) ─────────────────────────────────────────────────────

export const trackOrder = async (orderId: string, trackingToken?: string): Promise<IGuestOrderDoc> => {
  if (!trackingToken) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Tracking token is required');
  }

  return trackOrderSecure(orderId, trackingToken);
};

export const trackOrderSecure = async (orderId: string, trackingToken: string): Promise<IGuestOrderDoc> => {
  const order = await GuestOrder.findOne({ orderId }).select('+trackingToken');
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  if (order.trackingToken !== trackingToken) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid tracking token');
  }
  return order;
};

// ─── Submit Rating ────────────────────────────────────────────────────────────

export const submitRating = async (
  orderId: string,
  trackingToken: string,
  rating: number,
  comment?: string
): Promise<IGuestOrderDoc> => {
  const order = await GuestOrder.findOne({ orderId }).select('+trackingToken');
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  if (order.trackingToken !== trackingToken) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid tracking token');
  }
  if (order.status !== 'Completed') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Rating can only be submitted after order is completed');
  }
  order.rating = rating;
  order.ratingComment = comment ?? '';
  await order.save();
  return order;
};

// ─── Admin: Get Orders ────────────────────────────────────────────────────────

export const getOrders = async (
  hotelId: mongoose.Types.ObjectId,
  filter: Record<string, any>,
  options: IOptions
): Promise<QueryResult> => {
  const baseFilter = { hotelId, ...filter };
  return GuestOrder.paginate(baseFilter, options);
};

// ─── Admin: Accept Order ──────────────────────────────────────────────────────

export const acceptOrder = async (
  orderId: string,
  eta: number | undefined,
  message: string,
  userId?: string,
  role?: string,
  staffHotelId?: string,
  staffMemberId?: string
): Promise<IGuestOrderDoc> => {
  const order =
    userId && role ? await assertOrderOwner(orderId, userId, role) : await assertStaffOrderAccess(orderId, staffHotelId!);

  if (order.status !== 'Awaiting confirmation') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Order is not awaiting confirmation');
  }

  cancelEscalation(String(order._id));
  order.status = 'Processing';
  if (eta) order.acceptedEta = eta;
  order.acceptedAt = new Date();
  order.staffNote = message;
  if (staffMemberId) {
    order.set('staffMemberId', staffMemberId);
  }
  await order.save();

  const ssePayload: ISSEOrderUpdatedPayload = {
    orderId: order.orderId,
    status: order.status,
    ...(eta !== undefined && { acceptedEta: eta }),
    staffNote: message,
  };
  sendSSEEvent(String(order.hotelId), 'rs:order-updated', ssePayload);

  if (order.guestEmail) {
    const hotel = await Hotel.findById(order.hotelId);
    const statusUrl = getGuestStatusUrl(String(order.roomId), String(order.hotelId), order.guestEmail);
    emailService.sendOrderAcceptedEmail(order.guestEmail, (hotel as any)?.name, order, statusUrl).catch(() => {});
  }

  return order;
};

// ─── Admin: Advance Status ────────────────────────────────────────────────────

const STATUS_FLOW: Record<string, OrderStatus> = {
  Processing: 'On the way',
  'On the way': 'Completed',
};

export const advanceOrderStatus = async (
  orderId: string,
  userId?: string,
  role?: string,
  staffHotelId?: string
): Promise<IGuestOrderDoc> => {
  const order =
    userId && role ? await assertOrderOwner(orderId, userId, role) : await assertStaffOrderAccess(orderId, staffHotelId!);

  const next = STATUS_FLOW[order.status];
  if (!next) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Cannot advance order from status: ${order.status}`);
  }

  order.status = next;
  if (next === 'Completed') {
    order.completedAt = new Date();
  }
  await order.save();

  const ssePayload: ISSEOrderUpdatedPayload = { orderId: order.orderId, status: order.status };
  sendSSEEvent(String(order.hotelId), 'rs:order-updated', ssePayload);

  if (next === 'Completed' && order.guestEmail) {
    const hotel = await Hotel.findById(order.hotelId);
    const statusUrl = getGuestStatusUrl(String(order.roomId), String(order.hotelId), order.guestEmail);
    emailService.sendOrderCompletedEmail(order.guestEmail, (hotel as any)?.name, order, statusUrl).catch(() => {});
    scheduleNpsEmail({
      entityId: String(order._id),
      entityType: 'order',
      guestEmail: order.guestEmail,
      itemName: order.items?.[0]?.name ?? 'your order',
    });
  }

  return order;
};

// ─── Admin: Cancel Order ──────────────────────────────────────────────────────

export const cancelOrder = async (
  orderId: string,
  userId?: string,
  role?: string,
  staffHotelId?: string
): Promise<IGuestOrderDoc> => {
  const order =
    userId && role ? await assertOrderOwner(orderId, userId, role) : await assertStaffOrderAccess(orderId, staffHotelId!);

  if (['Completed', 'Cancelled'].includes(order.status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Order cannot be cancelled');
  }

  if (order.status === 'Awaiting confirmation') {
    cancelEscalation(String(order._id));
  }
  order.status = 'Cancelled';
  await order.save();

  const ssePayload: ISSEOrderUpdatedPayload = { orderId: order.orderId, status: 'Cancelled' };
  sendSSEEvent(String(order.hotelId), 'rs:order-updated', ssePayload);

  if (order.guestEmail) {
    const hotel = await Hotel.findById(order.hotelId);
    const statusUrl = getGuestStatusUrl(String(order.roomId), String(order.hotelId), order.guestEmail);
    emailService.sendOrderCancelledEmail(order.guestEmail, (hotel as any)?.name, order, statusUrl).catch(() => {});
  }

  return order;
};

// ─── Categories CRUD ──────────────────────────────────────────────────────────

export const getCategories = async (hotelId: mongoose.Types.ObjectId): Promise<IOrderCategoryDoc[]> => {
  return OrderCategory.find({ hotelId }).sort({ sortOrder: 1, createdAt: 1 });
};

export const createCategory = async (
  hotelId: mongoose.Types.ObjectId,
  body: NewOrderCategory
): Promise<IOrderCategoryDoc> => {
  const count = await OrderCategory.countDocuments({ hotelId });
  return OrderCategory.create({ ...body, hotelId, sortOrder: count });
};

export const updateCategory = async (
  hotelId: mongoose.Types.ObjectId,
  categoryId: string,
  body: UpdateOrderCategory
): Promise<IOrderCategoryDoc> => {
  const category = await OrderCategory.findOne({ _id: categoryId, hotelId });
  if (!category) throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  Object.assign(category, body);
  await category.save();
  return category;
};

export const deleteCategory = async (hotelId: mongoose.Types.ObjectId, categoryId: string): Promise<void> => {
  const category = await OrderCategory.findOne({ _id: categoryId, hotelId });
  if (!category) throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  await category.deleteOne();
  // Optionally remove items in this category or keep them with a null category
};

// ─── Catalog Items CRUD ───────────────────────────────────────────────────────

export const getCatalogItems = async (
  hotelId: mongoose.Types.ObjectId,
  filter: Record<string, any>,
  options: IOptions
): Promise<QueryResult> => {
  return CatalogItem.paginate({ hotelId, ...filter }, options);
};

export const createCatalogItem = async (
  hotelId: mongoose.Types.ObjectId,
  body: NewCatalogItem,
  imageFile?: Express.Multer.File
): Promise<ICatalogItemDoc> => {
  await assertCategoryBelongsToHotel(hotelId, body.categoryId);
  const count = await CatalogItem.countDocuments({ hotelId });
  let { image } = body;
  let { imageType } = body;

  if (imageFile) {
    const { uploadToS3 } = await import('../utils/awsS3Utils');
    image = await uploadToS3(imageFile, 'orders');
    imageType = 'upload';
  }

  return CatalogItem.create({ ...body, hotelId, image, imageType, sortOrder: count });
};

export const updateCatalogItem = async (
  hotelId: mongoose.Types.ObjectId,
  itemId: string,
  body: UpdateCatalogItem,
  imageFile?: Express.Multer.File
): Promise<ICatalogItemDoc> => {
  const item = await CatalogItem.findOne({ _id: itemId, hotelId });
  if (!item) throw new ApiError(httpStatus.NOT_FOUND, 'Item not found');

  await assertCategoryBelongsToHotel(hotelId, body.categoryId);

  if (imageFile) {
    const { uploadToS3 } = await import('../utils/awsS3Utils');
    body.image = await uploadToS3(imageFile, 'orders');
    body.imageType = 'upload';
  }

  Object.assign(item, body);
  await item.save();
  return item;
};

export const toggleCatalogItem = async (hotelId: mongoose.Types.ObjectId, itemId: string): Promise<ICatalogItemDoc> => {
  const item = await CatalogItem.findOne({ _id: itemId, hotelId });
  if (!item) throw new ApiError(httpStatus.NOT_FOUND, 'Item not found');
  item.available = !item.available;
  await item.save();
  return item;
};

export const deleteCatalogItem = async (hotelId: mongoose.Types.ObjectId, itemId: string): Promise<void> => {
  const item = await CatalogItem.findOne({ _id: itemId, hotelId });
  if (!item) throw new ApiError(httpStatus.NOT_FOUND, 'Item not found');
  await item.deleteOne();
};

// ─── Reservation Codes CRUD ───────────────────────────────────────────────────

export const getReservationCodes = async (
  hotelId: string,
  filters: { showExpired?: boolean; status?: 'all' | 'current' | 'upcoming'; source?: string }
): Promise<IReservationCodeDoc[]> => {
  const now = new Date();
  const query: Record<string, any> = { hotelId };

  // Hide expired by default
  if (!filters.showExpired) {
    query['checkOut'] = { $gte: now };
  }

  // Status filter (takes precedence over showExpired for checkIn/checkOut)
  if (filters.status === 'current') {
    query['checkIn'] = { $lte: now };
    query['checkOut'] = { $gte: now };
  } else if (filters.status === 'upcoming') {
    query['checkIn'] = { $gt: now };
  }

  // Source filter
  if (filters.source && filters.source !== 'all') {
    if (filters.source === 'manual') {
      query['source'] = { $in: ['manual', null] };
    } else {
      query['source'] = filters.source;
    }
  }

  return ReservationCode.find(query).sort({ checkIn: 1 }).limit(500);
};

export const createReservationCode = async (
  hotelId: mongoose.Types.ObjectId,
  body: NewReservationCode
): Promise<IReservationCodeDoc> => {
  let roomNumber = '';
  if (body.roomId) {
    const room = await Room.findById(body.roomId);
    if (!room) throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
    if (String((room as any).hotel) !== String(hotelId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Room does not belong to this hotel');
    }
    roomNumber = (room as any).number ?? '';
  }
  try {
    return await ReservationCode.create({
      ...body,
      hotelId,
      roomId: body.roomId ?? undefined,
      roomNumber,
      active: true,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      throw new ApiError(httpStatus.CONFLICT, 'An active reservation code with this scope already exists');
    }
    throw error;
  }
};

export const updateReservationCode = async (
  hotelId: mongoose.Types.ObjectId,
  codeId: string,
  body: UpdateReservationCode
): Promise<IReservationCodeDoc> => {
  const code = await ReservationCode.findOne({ _id: codeId, hotelId });
  if (!code) throw new ApiError(httpStatus.NOT_FOUND, 'Code not found');
  try {
    Object.assign(code, body);
    await code.save();
    return code;
  } catch (error: any) {
    if (error?.code === 11000) {
      throw new ApiError(httpStatus.CONFLICT, 'An active reservation code with this scope already exists');
    }
    throw error;
  }
};

export const deleteReservationCode = async (hotelId: mongoose.Types.ObjectId, codeId: string): Promise<void> => {
  const code = await ReservationCode.findOne({ _id: codeId, hotelId });
  if (!code) throw new ApiError(httpStatus.NOT_FOUND, 'Code not found');
  await code.deleteOne();
};

// ─── Promotions CRUD ──────────────────────────────────────────────────────────

export const getPromotions = async (hotelId: mongoose.Types.ObjectId): Promise<IOrderPromotionDoc[]> => {
  return OrderPromotion.find({ hotelId }).sort({ createdAt: -1 });
};

export const createPromotion = async (
  hotelId: mongoose.Types.ObjectId,
  body: NewOrderPromotion
): Promise<IOrderPromotionDoc> => {
  await assertPromotionTargetsBelongToHotel(hotelId, body);
  return OrderPromotion.create({ ...body, hotelId, active: true });
};

export const updatePromotion = async (
  hotelId: mongoose.Types.ObjectId,
  promoId: string,
  body: UpdateOrderPromotion
): Promise<IOrderPromotionDoc> => {
  const promo = await OrderPromotion.findOne({ _id: promoId, hotelId });
  if (!promo) throw new ApiError(httpStatus.NOT_FOUND, 'Promotion not found');
  await assertPromotionTargetsBelongToHotel(hotelId, body);
  Object.assign(promo, body);
  await promo.save();
  return promo;
};

export const deletePromotion = async (hotelId: mongoose.Types.ObjectId, promoId: string): Promise<void> => {
  const promo = await OrderPromotion.findOne({ _id: promoId, hotelId });
  if (!promo) throw new ApiError(httpStatus.NOT_FOUND, 'Promotion not found');
  await promo.deleteOne();
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const getOrderAnalytics = async (
  hotelId: mongoose.Types.ObjectId,
  startDate?: string,
  endDate?: string
): Promise<IOrderAnalytics> => {
  const dateFilter: Record<string, Date> = {};
  if (startDate) dateFilter['$gte'] = new Date(startDate);
  if (endDate) dateFilter['$lte'] = new Date(endDate);

  const filter: Record<string, any> = { hotelId };
  if (Object.keys(dateFilter).length) filter['createdAt'] = dateFilter;

  const orders = await GuestOrder.find(filter);

  const completed = orders.filter((o) => o.status === 'Completed');
  const cancelled = orders.filter((o) => o.status === 'Cancelled');

  const totalRevenue = parseFloat(completed.reduce((s, o) => s + o.total, 0).toFixed(2));
  const avgOrderValue = completed.length ? parseFloat((totalRevenue / completed.length).toFixed(2)) : 0;

  // Avg accept time (minutes)
  const acceptTimes = orders
    .filter((o) => o.acceptedAt && (o as any).createdAt)
    .map((o) => (o.acceptedAt!.getTime() - (o as any).createdAt.getTime()) / 60000);
  const avgAcceptTime = acceptTimes.length
    ? parseFloat((acceptTimes.reduce((a, b) => a + b, 0) / acceptTimes.length).toFixed(1))
    : 0;

  // Avg fulfill time (accepted → completed)
  const fulfillTimes = completed
    .filter((o) => o.acceptedAt && o.completedAt)
    .map((o) => (o.completedAt!.getTime() - o.acceptedAt!.getTime()) / 60000);
  const avgFulfillTime = fulfillTimes.length
    ? parseFloat((fulfillTimes.reduce((a, b) => a + b, 0) / fulfillTimes.length).toFixed(1))
    : null;

  const cancellationRate = orders.length > 0 ? parseFloat(((cancelled.length / orders.length) * 100).toFixed(1)) : 0;

  const ratings = orders.filter((o) => o.rating != null).map((o) => o.rating as number);
  const avgRating = ratings.length ? parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) : null;

  // By status
  const byStatus: Record<string, number> = {};
  orders.forEach((o) => {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
  });

  // By payment
  const byPayment: Record<string, number> = {};
  orders.forEach((o) => {
    byPayment[o.payment] = (byPayment[o.payment] ?? 0) + 1;
  });

  // By language
  const byLanguage: Record<string, number> = {};
  orders.forEach((o) => {
    const lang = (o as any).language || 'Unknown';
    byLanguage[lang] = (byLanguage[lang] ?? 0) + 1;
  });

  // Top items
  const itemMap: Record<string, { name: string; count: number; revenue: number }> = {};
  completed.forEach((o) => {
    o.items.forEach((item) => {
      const key = String(item.itemId);
      const entry = itemMap[key] ?? { name: item.name, count: 0, revenue: 0 };
      entry.count += item.qty;
      entry.revenue += item.price * item.qty;
      itemMap[key] = entry;
    });
  });
  const topItems = Object.entries(itemMap)
    .map(([itemId, d]) => ({ itemId, ...d, revenue: parseFloat(d.revenue.toFixed(2)) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top rooms
  const roomMap: Record<string, { roomNumber: string; count: number; revenue: number }> = {};
  completed.forEach((o) => {
    const key = String(o.roomId);
    const entry = roomMap[key] ?? { roomNumber: o.roomNumber ?? '', count: 0, revenue: 0 };
    entry.count++;
    entry.revenue += o.total;
    roomMap[key] = entry;
  });
  const topRooms = Object.entries(roomMap)
    .map(([roomId, d]) => ({ roomId, ...d, revenue: parseFloat(d.revenue.toFixed(2)) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Over time (daily buckets)
  const overTimeMap: Record<string, { orders: number; revenue: number }> = {};
  orders.forEach((o) => {
    const date = (o as any).createdAt.toISOString().slice(0, 10) as string;
    const entry = overTimeMap[date] ?? { orders: 0, revenue: 0 };
    entry.orders++;
    if (o.status === 'Completed') entry.revenue += o.total;
    overTimeMap[date] = entry;
  });
  const overTime = Object.entries(overTimeMap)
    .map(([date, d]) => ({ date, ...d, revenue: parseFloat(d.revenue.toFixed(2)) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalOrders: orders.length,
    totalRevenue,
    avgOrderValue,
    avgAcceptTime,
    avgFulfillTime,
    avgFulfillmentTime: avgFulfillTime,
    cancellationRate,
    avgRating,
    completedOrders: completed.length,
    cancelledOrders: cancelled.length,
    pendingOrders: byStatus['Awaiting confirmation'] ?? 0,
    byStatus,
    byPayment,
    byLanguage,
    byCategory: [],
    topItems,
    topRooms,
    overTime,
  };
};

// ─── Order Page Visitor Tracking ──────────────────────────────────────────────

export const trackOrderVisit = async (roomId: string, visitorId: string, language?: string): Promise<{ id: string }> => {
  const room = await Room.findById(roomId);
  if (!room) throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
  const hotelId = (room as any).hotel;

  // One visit per visitor per room per day
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const existing = await OrderVisit.findOne({
    hotelId,
    roomId: new mongoose.Types.ObjectId(roomId),
    visitorId,
    createdAt: { $gte: dayStart },
  });

  if (existing) return { id: String(existing._id) };

  const visit = await OrderVisit.create({
    hotelId,
    roomId: new mongoose.Types.ObjectId(roomId),
    visitorId,
    language: language ?? '',
  });

  // Record activity so it appears in Recent Activity on /home
  const hotel = await Hotel.findById(hotelId).select('user name image').lean();
  if (hotel) {
    await Activity.create({
      user: (hotel as any).user,
      hotel: hotelId,
      action: 'view',
      details: {
        image: (hotel as any).image,
        title: (hotel as any).name,
        headline: `Room ${(room as any).number || ''} opened the orders menu.`,
        room: room._id,
        visitorId,
        source: 'orders',
      },
    });
  }

  return { id: String(visit._id) };
};

export const convertOrderVisit = async (roomId: string, visitId: string): Promise<void> => {
  const updated = await OrderVisit.findOneAndUpdate(
    {
      _id: visitId,
      roomId: new mongoose.Types.ObjectId(roomId),
    },
    {
      converted: true,
      convertedAt: new Date(),
    }
  );

  if (!updated) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Visit not found');
  }
};

export const getOrderVisitAnalytics = async (
  hotelId: mongoose.Types.ObjectId,
  startDate?: string,
  endDate?: string
): Promise<IOrderVisitAnalytics> => {
  const filter: Record<string, any> = { hotelId };
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter['$gte'] = new Date(startDate);
    if (endDate) dateFilter['$lte'] = new Date(endDate);
    filter['createdAt'] = dateFilter;
  }

  const visits = await OrderVisit.find(filter);
  const converted = visits.filter((v) => (v as any).converted).length;
  const notConverted = visits.length - converted;
  const conversionRate = visits.length > 0 ? parseFloat(((converted / visits.length) * 100).toFixed(1)) : 0;

  return { totalVisits: visits.length, converted, notConverted, conversionRate };
};

// ─── iCal Sources ─────────────────────────────────────────────────────────────

const PLATFORM_LABELS: Record<ICalPlatform, string> = {
  booking: 'Booking.com',
  airbnb: 'Airbnb',
  vrbo: 'Vrbo',
  agoda: 'Agoda',
  tripadvisor: 'TripAdvisor',
  custom: 'Custom',
};

export const getICalSources = async (hotelId: string): Promise<IICalSourceDoc[]> => {
  return ICalSource.find({ hotelId }).sort({ createdAt: 1 });
};

export const createICalSource = async (hotelId: string, data: NewICalSource): Promise<IICalSourceDoc> => {
  await assertSafeRemoteUrl(data.url);
  const label = data.platform !== 'custom' ? PLATFORM_LABELS[data.platform] : data.label;
  return ICalSource.create({ ...data, hotelId, label });
};

export const updateICalSource = async (
  sourceId: string,
  hotelId: string,
  data: Partial<NewICalSource>
): Promise<IICalSourceDoc> => {
  const source = await ICalSource.findOne({ _id: sourceId, hotelId });
  if (!source) throw new ApiError(httpStatus.NOT_FOUND, 'iCal source not found');
  if (data.url) {
    await assertSafeRemoteUrl(data.url);
  }
  const effectivePlatform = data.platform ?? source.platform;
  const effectiveLabel =
    effectivePlatform !== 'custom'
      ? PLATFORM_LABELS[effectivePlatform]
      : (data.label ?? source.label);
  Object.assign(source, data, { label: effectiveLabel });
  await source.save();
  return source;
};

export const deleteICalSource = async (sourceId: string, hotelId: string): Promise<void> => {
  const deleted = await ICalSource.findOneAndDelete({ _id: sourceId, hotelId });
  if (!deleted) throw new ApiError(httpStatus.NOT_FOUND, 'iCal source not found');
};

export const manualSyncICalSource = async (
  sourceId: string,
  hotelId: string
): Promise<{ synced: number; errors: number }> => {
  const source = await ICalSource.findOne({ _id: sourceId, hotelId });
  if (!source) throw new ApiError(httpStatus.NOT_FOUND, 'iCal source not found');
  return syncICalSource(sourceId);
};

export const manualSyncAllICalSources = async (hotelId: string): Promise<{ synced: number; sources: number; errors: number }> => {
  const sources = await ICalSource.find({ hotelId, enabled: true });
  let totalSynced = 0;
  let totalErrors = 0;
  for (const source of sources) {
    const result = await syncICalSource(String(source._id));
    totalSynced += result.synced;
    totalErrors += result.errors;
  }
  return { synced: totalSynced, sources: sources.length, errors: totalErrors };
};

// ─── Discount Codes ───────────────────────────────────────────────────────────

export const calculateDiscount = (params: {
  discountType: DiscountType;
  discountValue: number;
  applicableCategories: string[];
  orderTotal: number;
  items: { categoryId: string; subtotal: number }[];
}): { discountAmount: number; newTotal: number } => {
  const { discountType, discountValue, applicableCategories, orderTotal, items } = params;

  let base = orderTotal;
  if (applicableCategories.length > 0) {
    base = items
      .filter(i => applicableCategories.includes(i.categoryId))
      .reduce((sum, i) => sum + i.subtotal, 0);
  }

  const raw = discountType === 'percentage' ? base * (discountValue / 100) : discountValue;
  const discountAmount = parseFloat(Math.min(raw, orderTotal).toFixed(2));
  const newTotal = parseFloat((orderTotal - discountAmount).toFixed(2));
  return { discountAmount, newTotal };
};

const buildDiscountValidationItems = async ({
  hotelId,
  items,
}: {
  hotelId: string;
  items: DiscountValidationItemInput[];
}): Promise<{ orderTotal: number; itemsWithCategory: { categoryId: string; subtotal: number }[] }> => {
  const requestedItemIds = [...new Set(items.map((item) => item.itemId))];
  const catalogItems = requestedItemIds.length
    ? await CatalogItem.find({ _id: { $in: requestedItemIds }, hotelId }).select('_id categoryId price discount')
    : [];
  const catalogItemsById = new Map(catalogItems.map((item) => [String(item._id), item]));

  if (catalogItems.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No valid items found');
  }

  const itemsWithCategory = items.map((item) => {
    const catalogItem = catalogItemsById.get(String(item.itemId));
    if (!catalogItem) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Item ${item.itemId} not found`);
    }

    const discountedPrice =
      catalogItem.discount > 0
        ? parseFloat((catalogItem.price * (1 - catalogItem.discount / 100)).toFixed(2))
        : catalogItem.price;

    return {
      categoryId: String(catalogItem.categoryId || item.categoryId || ''),
      subtotal: parseFloat((discountedPrice * item.qty).toFixed(2)),
    };
  });

  const orderTotal = parseFloat(itemsWithCategory.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));

  return { orderTotal, itemsWithCategory };
};

export const getDiscountCodes = async (hotelId: string) => {
  return DiscountCode.find({ hotelId }).sort({ createdAt: -1 });
};

export const createDiscountCode = async (hotelId: string, userId: string, data: NewDiscountCode) => {
  return DiscountCode.create({ ...data, hotelId, createdBy: userId, usedCount: 0, isActive: true });
};

export const updateDiscountCode = async (codeId: string, hotelId: string, data: UpdateDiscountCode) => {
  const dc = await DiscountCode.findOne({ _id: codeId, hotelId });
  if (!dc) throw new ApiError(httpStatus.NOT_FOUND, 'Discount code not found');
  Object.assign(dc, data);
  await dc.save();
  return dc;
};

export const deleteDiscountCode = async (codeId: string, hotelId: string) => {
  const deleted = await DiscountCode.findOneAndDelete({ _id: codeId, hotelId });
  if (!deleted) throw new ApiError(httpStatus.NOT_FOUND, 'Discount code not found');
};

export const validateDiscount = async (params: {
  hotelId: string;
  code: string;
  items: DiscountValidationItemInput[];
  totalAmount?: number;
}): Promise<{ valid: boolean; reason?: string; discountType?: DiscountType; discountValue?: number; discountAmount?: number; newTotal?: number }> => {
  const { hotelId, code, items } = params;
  const dc = await DiscountCode.findOne({ hotelId, code: code.trim().toUpperCase() });

  if (!dc) return { valid: false, reason: 'Code not found' };
  if (!dc.isActive) return { valid: false, reason: 'Code is inactive' };

  const now = new Date();
  if (dc.validFrom && now < dc.validFrom) return { valid: false, reason: 'Code is not yet valid' };
  if (dc.validTo && now > dc.validTo) return { valid: false, reason: 'Code has expired' };
  if (dc.maxUses != null && dc.usedCount >= dc.maxUses) return { valid: false, reason: 'Code usage limit reached' };
  const { orderTotal, itemsWithCategory } = await buildDiscountValidationItems({ hotelId, items });
  if (dc.minOrderAmount != null && orderTotal < dc.minOrderAmount) {
    return { valid: false, reason: `Minimum order amount is ${dc.minOrderAmount}` };
  }
  const categoryIds = dc.applicableCategories.map(String);
  const { discountAmount, newTotal } = calculateDiscount({
    discountType: dc.discountType,
    discountValue: dc.discountValue,
    applicableCategories: categoryIds,
    orderTotal,
    items: itemsWithCategory,
  });

  return { valid: true, discountType: dc.discountType, discountValue: dc.discountValue, discountAmount, newTotal };
};
