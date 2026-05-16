import httpStatus from 'http-status';
import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import * as bookingService from './booking.service';
import Booking from './booking.model';
import TimeSlot from './time-slot.model';
import CatalogItem from '../orders/catalog-item.model';
import ServiceResource from './service-resource.model';
import { verifyGuestStatusToken } from '../orders/orders.service';
import { scheduleNpsEmail } from '../nps/nps.service';
import Hotel from '../hotel/hotel.model';
import { toPopulateString } from '../utils/miscUtils';
import Room from '../room/room.model';
import { normalizeDateRange } from '../utils/dateRange';

const serializeGuestBooking = (booking: any) => ({
  id: String(booking._id),
  bookingRef: booking.bookingRef,
  itemId:
    typeof booking.itemId === 'object' && booking.itemId
      ? {
          id: String(booking.itemId._id ?? booking.itemId.id),
          name: booking.itemId.name,
        }
      : booking.itemId,
  startTime: booking.startTime,
  endTime: booking.endTime,
  partySize: booking.partySize,
  status: booking.status,
  payment: booking.payment,
  total: booking.total,
  cancelPolicyHours:
    booking.itemId?.bookingConfig?.cancelPolicyHours ?? booking.itemId?.bookingConfig?.cancellationPolicyHours ?? 24,
  cancelledAt: booking.cancelledAt ?? undefined,
});

export const createBookingPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingService.createBookingPaymentIntent({
    hotelId: req.params['hotelId']!,
    ...req.body,
  });
  res.status(httpStatus.CREATED).json(result);
});

export const createBooking = catchAsync(async (req: Request, res: Response) => {
  try {
    const { booking, guestCancelToken, guestStatusToken } = await bookingService.createBooking({
      ...req.body,
      hotelId: req.params['hotelId'],
      startTime: new Date(req.body.startTime),
    });
    res.status(httpStatus.CREATED).json({
      ...booking.toJSON(),
      guestCancelToken,
      guestStatusToken,
    });
  } catch (err: any) {
    if (err.code === 'SLOT_UNAVAILABLE') {
      res.status(409).json({ code: 'SLOT_UNAVAILABLE', message: 'Slot unavailable. Join the waitlist?' });
      return;
    }
    throw err;
  }
});

export const getHotelBookings = catchAsync(async (req: Request, res: Response) => {
  const { status, itemId, date, from, to, createdFrom, createdTo, page = 1, limit = 50, sortBy } = req.query;
  const filter: any = { hotelId: req.params['hotelId'] };
  if (status) filter.status = status;
  if (itemId) filter.itemId = itemId;
  if (from || to) {
    const range = normalizeDateRange({ start: from as string | undefined, end: to as string | undefined, defaultDays: 30 });
    filter.startTime = {};
    filter.startTime.$gte = range.start;
    filter.startTime.$lte = range.end;
  } else if (date) {
    const d = new Date(date as string);
    filter.startTime = { $gte: d, $lt: new Date(d.getTime() + 86_400_000) };
  } else {
    const range = normalizeDateRange({ defaultDays: 30, maxDays: 93 });
    filter.startTime = { $gte: range.start, $lte: range.end };
  }
  if (createdFrom || createdTo) {
    const createdRange = normalizeDateRange({
      start: createdFrom as string | undefined,
      end: createdTo as string | undefined,
      defaultDays: 30,
    });
    filter.createdAt = {};
    filter.createdAt.$gte = createdRange.start;
    filter.createdAt.$lte = createdRange.end;
  }
  const bookings = await (Booking as any).paginate(filter, {
    page: Number(page),
    limit: Math.min(Number(limit), 100),
    populate: toPopulateString([{ path: 'itemId' }, { path: 'staffMemberId' }]),
    sortBy: typeof sortBy === 'string' && sortBy.trim().length > 0 ? sortBy : 'createdAt:desc',
  });
  res.json(bookings);
});

export const getGuestBookings = catchAsync(async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const guestToken = req.get('x-guest-status-token') || undefined;
  if (!guestToken) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Guest status token is required');
  }

  const tokenPayload = verifyGuestStatusToken(guestToken);
  const room = await Room.findOne({ _id: roomId, hotel: req.params['hotelId'] }).select('_id');
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
  }

  if (String(req.params['hotelId']) !== tokenPayload.hotelId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Guest token does not belong to this hotel');
  }

  const bookings = await Booking.find({
    hotelId: req.params['hotelId'],
    roomId,
    guestEmail: tokenPayload.email,
    status: { $nin: ['cancelled', 'completed', 'no_show'] },
    startTime: { $gte: new Date() },
  })
    .populate('itemId', 'name bookingConfig.cancelPolicyHours bookingConfig.cancellationPolicyHours')
    .sort({ startTime: 1 });
  res.json(bookings.map(serializeGuestBooking));
});

export const updateBooking = catchAsync(async (req: Request, res: Response) => {
  const previous = await Booking.findOne({ _id: req.params['bookingId'], hotelId: req.params['hotelId'] });
  if (!previous) throw new ApiError(httpStatus.NOT_FOUND, 'Booking not found');

  const booking = await Booking.findOneAndUpdate(
    { _id: req.params['bookingId'], hotelId: req.params['hotelId'] },
    req.body,
    { new: true }
  ).populate('itemId', 'name');
  if (!booking) throw new ApiError(httpStatus.NOT_FOUND, 'Booking not found');
  // Cancel escalation when booking leaves pending state
  if (req.body.status && req.body.status !== 'pending') {
    bookingService.cancelBookingEscalation(req.params['bookingId']!);
  }
  if (req.body.status === 'completed' && previous.status !== 'completed' && booking.guestEmail) {
    scheduleNpsEmail({
      entityId: String(booking._id),
      entityType: 'booking',
      guestEmail: booking.guestEmail,
      itemName: (booking.itemId as any)?.name ?? 'your booking',
    });
  }
  res.json(booking);
});

export const cancelBooking = catchAsync(async (req: Request, res: Response) => {
  const cancelledBy =
    req.params['hotelId'] || req.user
      ? 'staff'
      : (req.query['by'] as 'guest' | 'staff' | undefined) ?? (req.body?.token ? 'guest' : 'staff');
  if (cancelledBy === 'staff') {
    const existing = await Booking.findOne({ _id: req.params['bookingId'], hotelId: req.params['hotelId'] }).select('_id');
    if (!existing) throw new ApiError(httpStatus.NOT_FOUND, 'Booking not found');
  }
  const booking = await bookingService.cancelBooking(
    req.params['bookingId']!,
    cancelledBy,
    cancelledBy === 'guest' ? req.body?.token : undefined
  );
  res.json(booking);
});

export const joinWaitlist = catchAsync(async (req: Request, res: Response) => {
  const entry = await bookingService.joinWaitlist({
    ...req.body,
    hotelId: req.params['hotelId'],
    slotStartTime: new Date(req.body.slotStartTime),
  });
  res.status(httpStatus.CREATED).json(entry);
});

export const getTimeSlots = catchAsync(async (req: Request, res: Response) => {
  const { itemId, from, to } = req.query;
  const filter: any = {};
  if (itemId) {
    const item = await CatalogItem.findOne({ _id: itemId, hotelId: req.params['hotelId'], type: 'bookable' }, '_id');
    if (!item) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Item not found');
    }
    filter.itemId = item._id;
  } else {
    const items = await CatalogItem.find({ hotelId: req.params['hotelId'], type: 'bookable' }, '_id');
    filter.itemId = { $in: items.map((i) => i._id) };
  }
  const range = normalizeDateRange({
    start: from as string | undefined,
    end: to as string | undefined,
    defaultDays: 14,
    maxDays: 62,
  });
  filter.startTime = { $gte: range.start, $lte: range.end };
  const slots = await TimeSlot.find(filter).sort({ startTime: 1 }).populate('itemId', 'name');
  res.json(slots);
});

export const blockSlot = catchAsync(async (req: Request, res: Response) => {
  const slot = await TimeSlot.findById(req.params['slotId']).populate('itemId', 'hotelId');
  if (!slot) throw new ApiError(httpStatus.NOT_FOUND, 'Slot not found');
  if (String((slot.itemId as any)?.hotelId) !== String(req.params['hotelId'])) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Slot not found');
  }
  if (slot.bookedPersons > 0) {
    const affected = await Booking.find({
      itemId: slot.itemId,
      startTime: slot.startTime,
      status: { $nin: ['cancelled', 'completed'] },
    });
    res.status(httpStatus.CONFLICT).json({
      message: 'Slot has active bookings. Cancel them first.',
      affected,
    });
    return;
  }
  slot.isBlocked = true;
  await slot.save();
  res.json(slot);
});

export const unblockSlot = catchAsync(async (req: Request, res: Response) => {
  const slot = await TimeSlot.findById(req.params['slotId']).populate('itemId', 'hotelId');
  if (!slot) throw new ApiError(httpStatus.NOT_FOUND, 'Slot not found');
  if (String((slot.itemId as any)?.hotelId) !== String(req.params['hotelId'])) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Slot not found');
  }
  slot.isBlocked = false;
  await slot.save();
  res.json(slot);
});

export const listResources = catchAsync(async (req: Request, res: Response) => {
  const filter: any = { hotelId: req.params['hotelId'] };
  if (req.query['includeInactive'] !== 'true') filter.isActive = true;
  const resources = await ServiceResource.find(filter).sort({ type: 1, name: 1 });
  res.json(resources);
});

export const createResource = catchAsync(async (req: Request, res: Response) => {
  const resource = await ServiceResource.create({ ...req.body, hotelId: req.params['hotelId'] });
  res.status(201).json(resource);
});

export const updateResource = catchAsync(async (req: Request, res: Response) => {
  const resource = await ServiceResource.findOneAndUpdate(
    { _id: req.params['resourceId'], hotelId: req.params['hotelId'] },
    req.body,
    { new: true }
  );
  if (!resource) throw new ApiError(httpStatus.NOT_FOUND, 'Resource not found');
  res.json(resource);
});

export const deleteResource = catchAsync(async (req: Request, res: Response) => {
  await ServiceResource.findOneAndUpdate(
    { _id: req.params['resourceId'], hotelId: req.params['hotelId'] },
    { isActive: false }
  );
  res.status(204).send();
});

export const getBookingSettings = catchAsync(async (req: Request, res: Response) => {
  const hotel = await Hotel.findById(req.params['hotelId']).select('bookings');
  if (!hotel) throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');

  res.json({
    emails: ((hotel as any).bookings?.emails ?? []) as string[],
  });
});

export const updateBookingSettings = catchAsync(async (req: Request, res: Response) => {
  const emails = Array.isArray(req.body?.emails)
    ? req.body.emails.map((email: unknown) => String(email ?? '').trim()).filter(Boolean)
    : [];

  const hotel = await Hotel.findByIdAndUpdate(
    req.params['hotelId'],
    { $set: { 'bookings.emails': emails } },
    { new: true }
  ).select('bookings');

  if (!hotel) throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');

  res.json({
    emails: ((hotel as any).bookings?.emails ?? []) as string[],
  });
});
