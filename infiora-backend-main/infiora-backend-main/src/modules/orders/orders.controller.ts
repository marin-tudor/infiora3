import httpStatus from 'http-status';
import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { pick } from '../utils';
import { toObjectId } from '../utils/mongoUtils';
import ApiError from '../errors/ApiError';
import { addSSEClient } from './sse.service';
import * as ordersService from './orders.service';
import { IOptions } from '../paginate/paginate';
import NotificationGroup from '../dispatch/notification-group.model';
import { normalizeDateRange } from '../utils/dateRange';
import { isBotUserAgent } from '../utils/requestUtils';

const serializeGuestOrder = (order: any, includeTrackingToken = false) => ({
  id: String(order._id),
  orderId: order.orderId,
  ...(includeTrackingToken && { trackingToken: order.trackingToken }),
  roomId: String(order.roomId),
  roomNumber: order.roomNumber,
  guestRoomNumber: order.guestRoomNumber,
  guestEmail: order.guestEmail,
  items: order.items,
  total: order.total,
  note: order.note,
  payment: order.payment,
  status: order.status,
  acceptedEta: order.acceptedEta,
  acceptedAt: order.acceptedAt,
  staffNote: order.staffNote,
  completedAt: order.completedAt,
  language: order.language,
  rating: order.rating,
  ratingComment: order.ratingComment,
  createdAt: order.createdAt,
});

// ─── Public: Catalog ──────────────────────────────────────────────────────────

export const getCatalog = catchAsync(async (req: Request, res: Response) => {
  const roomId = req.params['roomId'] as string;
  const data = await ordersService.getCatalogForRoom(roomId);
  res.send(data);
});

// ─── Public: Place Order ──────────────────────────────────────────────────────

export const placeOrder = catchAsync(async (req: Request, res: Response) => {
  const roomId = req.params['roomId'] as string;
  const order = await ordersService.placeOrder(roomId, req.body);
  res.status(httpStatus.CREATED).send({
    ...serializeGuestOrder(order, true),
    guestStatusToken: order.guestEmail
      ? ordersService.generateGuestStatusToken(String(order.hotelId), order.guestEmail)
      : undefined,
  });
});

export const createGuestPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const result = await ordersService.createGuestPaymentIntent(req.body);
  res.send(result);
});

// ─── Public: Track Order ──────────────────────────────────────────────────────

export const trackOrder = catchAsync(async (req: Request, res: Response) => {
  const orderId = req.params['orderId'] as string;
  const token = req.get('x-order-tracking-token');
  if (!token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Order tracking token is required');
  }
  const order = await ordersService.trackOrderSecure(orderId, token);
  res.send(serializeGuestOrder(order));
});

// ─── Public: Submit Rating ────────────────────────────────────────────────────

export const submitRating = catchAsync(async (req: Request, res: Response) => {
  const orderId = req.params['orderId'] as string;
  const { token, rating, comment } = req.body;
  const order = await ordersService.submitRating(orderId, token, rating, comment);
  res.send(serializeGuestOrder(order));
});

export const sendGuestStatusLink = catchAsync(async (req: Request, res: Response) => {
  const roomId = req.params['roomId'] as string;
  await ordersService.sendGuestStatusLink(roomId, req.body.email);
  res.send({ message: 'If we found records for that email, we sent a status link.' });
});

export const getGuestStatus = catchAsync(async (req: Request, res: Response) => {
  const token = req.get('x-guest-status-token');
  if (!token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Guest status token is required');
  }
  const payload = await ordersService.getGuestStatusSummary(token);
  res.send(payload);
});

export const getGuestStatusByBody = catchAsync(async (req: Request, res: Response) => {
  const payload = await ordersService.getGuestStatusSummary(req.body.token);
  res.send(payload);
});

// ─── Admin: SSE Stream ────────────────────────────────────────────────────────

export const ordersEvents = catchAsync(async (req: Request, res: Response) => {
  const hotelId = String(toObjectId(req.params['hotelId'] as string));
  addSSEClient(hotelId, res);
  // Response is kept open — do not call res.send()
});

// ─── Admin: Get Orders ────────────────────────────────────────────────────────

export const getOrders = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const filter = pick(req.query, ['status']);
  const { staffSession } = req;

  if (staffSession) {
    if (staffSession.hotelId !== String(hotelId)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
    }

    const groupId = req.query['groupId'] as string | undefined;

    if (groupId) {
      if (!staffSession.groupIds.includes(groupId)) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
      }

      (filter as any).dispatchGroupId = toObjectId(groupId);
    } else if (staffSession.groupIds.length > 0) {
      (filter as any).dispatchGroupId = { $in: staffSession.groupIds.map((id) => toObjectId(id)) };
    }
  } else if (req.query['groupId']) {
    (filter as any).dispatchGroupId = toObjectId(req.query['groupId'] as string);
  }

  if (req.query['startDate'] || req.query['endDate']) {
    const dateFilter: Record<string, Date> = {};
    if (req.query['startDate']) dateFilter['$gte'] = new Date(req.query['startDate'] as string);
    if (req.query['endDate']) dateFilter['$lte'] = new Date(req.query['endDate'] as string);
    (filter as any).createdAt = dateFilter;
  }

  if (req.query['scheduled'] === 'true') {
    (filter as any).scheduledFor = { $ne: null };
    (filter as any).surfacedAt = null;
  }

  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page']);
  if (!options.sortBy) options.sortBy = 'createdAt:desc';

  const result = await ordersService.getOrders(hotelId, filter, options);
  res.send(result);
});

export const getGroupPendingCount = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.deviceSession?.hotelId as string);
  const groupId = req.params['groupId'] as string;
  const group = await NotificationGroup.findOne({ _id: groupId, hotelId }).select('_id');
  if (!group) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }

  const result = await ordersService.getOrders(
    hotelId,
    {
      status: 'Awaiting confirmation',
      dispatchGroupId: toObjectId(groupId),
    } as any,
    {
      limit: 1,
      page: 1,
      sortBy: 'createdAt:desc',
    }
  );

  res.send({
    count: result.totalResults || 0,
  });
});

// ─── Admin: Accept Order ──────────────────────────────────────────────────────

export const acceptOrder = catchAsync(async (req: Request, res: Response) => {
  const orderId = req.params['orderId'] as string;
  const eta = req.body.eta ?? req.body.acceptedEta;
  const message = req.body.message ?? req.body.staffNote ?? '';
  const { staffSession } = req;
  const order = await ordersService.acceptOrder(
    orderId,
    eta,
    message,
    req.user?.id,
    req.user?.role,
    staffSession?.hotelId,
    staffSession?.staffMemberId
  );
  res.send(order);
});

// ─── Admin: Advance Order Status ──────────────────────────────────────────────

export const advanceOrder = catchAsync(async (req: Request, res: Response) => {
  const orderId = req.params['orderId'] as string;
  const order = await ordersService.advanceOrderStatus(orderId, req.user?.id, req.user?.role, req.staffSession?.hotelId);
  res.send(order);
});

// ─── Admin: Cancel Order ──────────────────────────────────────────────────────

export const cancelOrder = catchAsync(async (req: Request, res: Response) => {
  const orderId = req.params['orderId'] as string;
  const order = await ordersService.cancelOrder(orderId, req.user?.id, req.user?.role, req.staffSession?.hotelId);
  res.send(order);
});

export const advanceOrderStatus = advanceOrder;

// ─── Admin: Analytics ────────────────────────────────────────────────────────

export const getAnalytics = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const range = normalizeDateRange({ start: startDate, end: endDate });
  const analytics = await ordersService.getOrderAnalytics(hotelId, range.start.toISOString(), range.end.toISOString());
  res.send(analytics);
});

// ─── Admin: Categories ────────────────────────────────────────────────────────

export const trackCheckinUsage = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const result = await ordersService.trackCheckinUsage({
    hotelId,
    actorUserId: req.user.id,
    actorRole: req.user.role,
  });
  res.status(result.tracked ? httpStatus.CREATED : httpStatus.OK).send(result);
});

export const getCategories = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const categories = await ordersService.getCategories(hotelId);
  res.send(categories);
});

export const createCategory = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const category = await ordersService.createCategory(hotelId, req.body);
  res.status(httpStatus.CREATED).send(category);
});

export const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const categoryId = req.params['categoryId'] as string;
  const category = await ordersService.updateCategory(hotelId, categoryId, req.body);
  res.send(category);
});

export const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const categoryId = req.params['categoryId'] as string;
  await ordersService.deleteCategory(hotelId, categoryId);
  res.status(httpStatus.NO_CONTENT).send();
});

// ─── Admin: Catalog Items ─────────────────────────────────────────────────────

export const getCatalogItems = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const filter = pick(req.query, ['categoryId', 'available']);
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await ordersService.getCatalogItems(hotelId, filter, options);
  res.send(result);
});

export const createCatalogItem = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const imageFile = (req.files as any)?.image?.[0] as Express.Multer.File | undefined;
  const item = await ordersService.createCatalogItem(hotelId, req.body, imageFile);
  res.status(httpStatus.CREATED).send(item);
});

export const updateCatalogItem = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const itemId = req.params['itemId'] as string;
  const imageFile = (req.files as any)?.image?.[0] as Express.Multer.File | undefined;
  const item = await ordersService.updateCatalogItem(hotelId, itemId, req.body, imageFile);
  res.send(item);
});

export const toggleCatalogItem = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const itemId = req.params['itemId'] as string;
  const item = await ordersService.toggleCatalogItem(hotelId, itemId);
  res.send(item);
});

export const deleteCatalogItem = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const itemId = req.params['itemId'] as string;
  await ordersService.deleteCatalogItem(hotelId, itemId);
  res.status(httpStatus.NO_CONTENT).send();
});

// ─── Admin: Reservation Codes ─────────────────────────────────────────────────

export const getReservationCodes = catchAsync(async (req: Request, res: Response) => {
  const hotelId = req.params['hotelId'] as string;
  const filters: { showExpired?: boolean; status?: 'all' | 'current' | 'upcoming'; source?: string } = {};
  if (req.query['showExpired'] === 'true') filters.showExpired = true;
  if (req.query['status']) filters.status = req.query['status'] as 'all' | 'current' | 'upcoming';
  if (req.query['source']) filters.source = req.query['source'] as string;
  const result = await ordersService.getReservationCodes(hotelId, filters);
  res.send(result);
});

export const createReservationCode = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const code = await ordersService.createReservationCode(hotelId, {
    ...req.body,
    createdBy: req.user.id,
    roomId: req.body.roomId ? toObjectId(req.body.roomId) : undefined,
    checkIn: new Date(req.body.checkIn),
    checkOut: new Date(req.body.checkOut),
  });
  res.status(httpStatus.CREATED).send(code);
});

export const updateReservationCode = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const codeId = req.params['codeId'] as string;
  const code = await ordersService.updateReservationCode(hotelId, codeId, req.body);
  res.send(code);
});

export const deleteReservationCode = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const codeId = req.params['codeId'] as string;
  await ordersService.deleteReservationCode(hotelId, codeId);
  res.status(httpStatus.NO_CONTENT).send();
});

// ─── Admin: Promotions ────────────────────────────────────────────────────────

export const getPromotions = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const promotions = await ordersService.getPromotions(hotelId);
  res.send(promotions);
});

export const createPromotion = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const promo = await ordersService.createPromotion(hotelId, req.body);
  res.status(httpStatus.CREATED).send(promo);
});

export const updatePromotion = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const promoId = req.params['promoId'] as string;
  const promo = await ordersService.updatePromotion(hotelId, promoId, req.body);
  res.send(promo);
});

export const deletePromotion = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const promoId = req.params['promoId'] as string;
  await ordersService.deletePromotion(hotelId, promoId);
  res.status(httpStatus.NO_CONTENT).send();
});

// ─── Public: Order Page Visit Tracking ───────────────────────────────────────

export const trackVisit = catchAsync(async (req: Request, res: Response) => {
  if (isBotUserAgent(req.get('user-agent'))) {
    res.status(httpStatus.ACCEPTED).send({ id: null, skipped: true });
    return;
  }

  const roomId = req.params['roomId'] as string;
  const { visitorId, language } = req.body;
  const result = await ordersService.trackOrderVisit(roomId, visitorId, language);
  res.send(result);
});

export const convertVisit = catchAsync(async (req: Request, res: Response) => {
  const roomId = req.params['roomId'] as string;
  const visitId = req.params['visitId'] as string;
  await ordersService.convertOrderVisit(roomId, visitId);
  res.status(httpStatus.NO_CONTENT).send();
});

// ─── Admin: Visit Analytics ───────────────────────────────────────────────────

export const getVisitAnalytics = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const range = normalizeDateRange({ start: startDate, end: endDate });
  const result = await ordersService.getOrderVisitAnalytics(hotelId, range.start.toISOString(), range.end.toISOString());
  res.send(result);
});

// ─── Admin: Settings ──────────────────────────────────────────────────────────

export const getSettings = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const settings = await ordersService.getOrdersSettings(hotelId);
  res.send(settings);
});

export const updateSettings = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId'] as string);
  const settings = await ordersService.updateOrdersSettings(hotelId, req.body);
  res.send(settings);
});

// ─── iCal Sources ─────────────────────────────────────────────────────────────

export const getICalSources = catchAsync(async (req: Request, res: Response) => {
  const sources = await ordersService.getICalSources(req.params['hotelId'] as string);
  res.send(sources);
});

export const createICalSource = catchAsync(async (req: Request, res: Response) => {
  const source = await ordersService.createICalSource(req.params['hotelId'] as string, req.body);
  res.status(httpStatus.CREATED).send(source);
});

export const updateICalSource = catchAsync(async (req: Request, res: Response) => {
  const source = await ordersService.updateICalSource(
    req.params['sourceId'] as string,
    req.params['hotelId'] as string,
    req.body
  );
  res.send(source);
});

export const deleteICalSource = catchAsync(async (req: Request, res: Response) => {
  await ordersService.deleteICalSource(req.params['sourceId'] as string, req.params['hotelId'] as string);
  res.status(httpStatus.NO_CONTENT).send();
});

export const syncICalSource = catchAsync(async (req: Request, res: Response) => {
  const result = await ordersService.manualSyncICalSource(req.params['sourceId'] as string, req.params['hotelId'] as string);
  res.send(result);
});

export const syncAllICalSources = catchAsync(async (req: Request, res: Response) => {
  const result = await ordersService.manualSyncAllICalSources(req.params['hotelId'] as string);
  res.send(result);
});

// ─── Discount Codes ───────────────────────────────────────────────────────────

export const getDiscountCodes = catchAsync(async (req: Request, res: Response) => {
  const codes = await ordersService.getDiscountCodes(req.params['hotelId'] as string);
  res.send(codes);
});

export const createDiscountCode = catchAsync(async (req: Request, res: Response) => {
  const code = await ordersService.createDiscountCode(
    req.params['hotelId'] as string,
    String((req as any).user.id),
    req.body
  );
  res.status(httpStatus.CREATED).send(code);
});

export const updateDiscountCode = catchAsync(async (req: Request, res: Response) => {
  const code = await ordersService.updateDiscountCode(
    req.params['codeId'] as string,
    req.params['hotelId'] as string,
    req.body
  );
  res.send(code);
});

export const deleteDiscountCode = catchAsync(async (req: Request, res: Response) => {
  await ordersService.deleteDiscountCode(req.params['codeId'] as string, req.params['hotelId'] as string);
  res.status(httpStatus.NO_CONTENT).send();
});

export const validateDiscount = catchAsync(async (req: Request, res: Response) => {
  const { hotelId, code, items, totalAmount } = req.body;
  const result = await ordersService.validateDiscount({ hotelId, code, items, totalAmount });
  res.send(result);
});
