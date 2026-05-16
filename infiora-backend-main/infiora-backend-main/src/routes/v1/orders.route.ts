import express, { Router } from 'express';
import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import { isDeviceAuth, isHotelOwner, staffAuth } from '../../modules/middleware';
import config from '../../config/config';
import ApiError from '../../modules/errors/ApiError';
import { ordersController, ordersValidation } from '../../modules/orders';
import { addGroupSSEClient } from '../../modules/orders/sse.service';
import multerUpload from '../../modules/utils/multerUpload';
import { createRateLimiter } from '../../modules/utils';
import NotificationGroup from '../../modules/dispatch/notification-group.model';
import Hotel from '../../modules/hotel/hotel.model';

const router: Router = express.Router();
const guestOrderLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 30 });
const guestTrackingLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 60 });
const guestVisitLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 80 });
const guestStatusLinkLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
const guestDiscountLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES — no authentication required (guest-facing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /v1/orders/rooms/:roomId/catalog
 * Returns categories, items, settings and active promotions for a room.
 * Used by the guest ordering page on load.
 */
router
  .route('/rooms/:roomId/catalog')
  .get(guestTrackingLimiter, validate(ordersValidation.getCatalog), ordersController.getCatalog);

/**
 * POST /v1/orders/rooms/:roomId
 * Place a new order. Validates the reservation code server-side.
 */
router.route('/rooms/:roomId').post(guestOrderLimiter, validate(ordersValidation.placeOrder), ordersController.placeOrder);

router
  .route('/guest/payment-intent')
  .post(guestOrderLimiter, validate(ordersValidation.createGuestPaymentIntent), ordersController.createGuestPaymentIntent);

/**
 * GET  /v1/orders/track/:orderId   — poll order status (guest tracker, token via header)
 * POST /v1/orders/track/:orderId   — submit rating after completion
 */
router
  .route('/track/:orderId')
  .get(guestTrackingLimiter, validate(ordersValidation.trackOrder), ordersController.trackOrder)
  .post(guestTrackingLimiter, validate(ordersValidation.submitRating), ordersController.submitRating);

router
  .route('/rooms/:roomId/status-link')
  .post(guestStatusLinkLimiter, validate(ordersValidation.sendGuestStatusLink), ordersController.sendGuestStatusLink);

router
  .route('/guest-status')
  .get(guestTrackingLimiter, validate(ordersValidation.getGuestStatus), ordersController.getGuestStatus);

router
  .route('/guest-status/exchange')
  .post(guestTrackingLimiter, validate(ordersValidation.getGuestStatusByBody), ordersController.getGuestStatusByBody);

/**
 * POST  /v1/orders/rooms/:roomId/visit         — record a page visit (guest)
 * PATCH /v1/orders/rooms/:roomId/visit/:visitId — mark visit as converted (guest)
 */
router
  .route('/rooms/:roomId/visit')
  .post(guestVisitLimiter, validate(ordersValidation.trackVisit), ordersController.trackVisit);

router
  .route('/rooms/:roomId/visit/:visitId')
  .patch(guestVisitLimiter, validate(ordersValidation.convertVisit), ordersController.convertVisit);

// ─────────────────────────────────────────────────────────────────────────────
// HOTEL-AUTHENTICATED ROUTES — require JWT + hotel ownership
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /v1/orders/hotels/:hotelId/events
 * Server-Sent Events stream — admin dashboard listens here for real-time
 * new-order and order-updated notifications.
 */
router
  .route('/hotels/:hotelId/events')
  .get(auth(), isHotelOwner, validate(ordersValidation.ordersEvents), ordersController.ordersEvents);

router.get('/groups/:groupId/events', (req, res, next) => {
  const headerToken = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  const token = headerToken || (req.query['token'] as string | undefined);

  if (!token) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Device token required'));
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret) as any;
    if (payload.type !== 'device') {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token type'));
    }

    Promise.all([
      NotificationGroup.findOne({ _id: req.params.groupId, hotelId: payload.hotelId }).select('_id'),
      Hotel.findById(payload.hotelId).select('settings.security.deviceTokenVersion'),
    ])
      .then((group) => {
        const targetGroup = group[0];
        const hotel = group[1] as any;
        const currentVersion = Math.max(1, Number(hotel?.settings?.security?.deviceTokenVersion ?? 1));

        if (!targetGroup) {
          return next(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
        }

        if (Number(payload.version ?? 1) !== currentVersion) {
          return next(new ApiError(httpStatus.UNAUTHORIZED, 'Device token has been rotated'));
        }

        req.deviceSession = { hotelId: payload.hotelId };
        addGroupSSEClient(req.params.groupId!, res);
        return undefined;
      })
      .catch(() => next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid device token')));
    return undefined;
  } catch {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid device token'));
  }
});

router
  .route('/groups/:groupId/pending-count')
  .get(isDeviceAuth, validate(ordersValidation.groupPendingCount), ordersController.getGroupPendingCount);

/**
 * GET /v1/orders/hotels/:hotelId
 * List all orders with filters (status, date range, pagination).
 */
router.route('/hotels/:hotelId').get(auth(), isHotelOwner, validate(ordersValidation.getOrders), ordersController.getOrders);

router
  .route('/tablet/hotels/:hotelId')
  .get(staffAuth('orders:view'), validate(ordersValidation.getOrders), ordersController.getOrders);

/**
 * GET  /v1/orders/hotels/:hotelId/analytics
 */
router
  .route('/hotels/:hotelId/analytics')
  .get(auth(), isHotelOwner, validate(ordersValidation.getAnalytics), ordersController.getAnalytics);

router
  .route('/hotels/:hotelId/checkin-usage')
  .post(auth(), isHotelOwner, validate(ordersValidation.trackCheckinUsage), ordersController.trackCheckinUsage);

/**
 * GET /v1/orders/hotels/:hotelId/visit-analytics
 */
router.route('/hotels/:hotelId/visit-analytics').get(auth(), isHotelOwner, ordersController.getVisitAnalytics);

/**
 * GET   /v1/orders/hotels/:hotelId/settings
 * PATCH /v1/orders/hotels/:hotelId/settings
 */
router
  .route('/hotels/:hotelId/settings')
  .get(auth(), isHotelOwner, ordersController.getSettings)
  .patch(auth(), isHotelOwner, validate(ordersValidation.updateSettings), ordersController.updateSettings);

// ─── Categories ───────────────────────────────────────────────────────────────

router
  .route('/hotels/:hotelId/categories')
  .get(auth(), isHotelOwner, ordersController.getCategories)
  .post(auth(), isHotelOwner, validate(ordersValidation.createCategory), ordersController.createCategory);

router
  .route('/hotels/:hotelId/categories/:categoryId')
  .patch(auth(), isHotelOwner, validate(ordersValidation.updateCategory), ordersController.updateCategory)
  .delete(auth(), isHotelOwner, validate(ordersValidation.deleteCategory), ordersController.deleteCategory);

// ─── Catalog Items ────────────────────────────────────────────────────────────

router
  .route('/hotels/:hotelId/items')
  .get(auth(), isHotelOwner, ordersController.getCatalogItems)
  .post(
    auth(),
    isHotelOwner,
    multerUpload.fields([{ name: 'image', maxCount: 1 }]),
    validate(ordersValidation.createCatalogItem),
    ordersController.createCatalogItem
  );

router
  .route('/hotels/:hotelId/items/:itemId')
  .patch(
    auth(),
    isHotelOwner,
    multerUpload.fields([{ name: 'image', maxCount: 1 }]),
    validate(ordersValidation.updateCatalogItem),
    ordersController.updateCatalogItem
  )
  .delete(auth(), isHotelOwner, validate(ordersValidation.deleteCatalogItem), ordersController.deleteCatalogItem);

router
  .route('/hotels/:hotelId/items/:itemId/toggle')
  .patch(auth(), isHotelOwner, validate(ordersValidation.toggleCatalogItem), ordersController.toggleCatalogItem);

// ─── Reservation Codes ────────────────────────────────────────────────────────

router
  .route('/hotels/:hotelId/codes')
  .get(auth(), isHotelOwner, ordersController.getReservationCodes)
  .post(auth(), isHotelOwner, validate(ordersValidation.createReservationCode), ordersController.createReservationCode);

router
  .route('/hotels/:hotelId/codes/:codeId')
  .patch(auth(), isHotelOwner, validate(ordersValidation.updateReservationCode), ordersController.updateReservationCode)
  .delete(auth(), isHotelOwner, validate(ordersValidation.deleteReservationCode), ordersController.deleteReservationCode);

// ─── Promotions ───────────────────────────────────────────────────────────────

router
  .route('/hotels/:hotelId/promotions')
  .get(auth(), isHotelOwner, ordersController.getPromotions)
  .post(auth(), isHotelOwner, validate(ordersValidation.createPromotion), ordersController.createPromotion);

router
  .route('/hotels/:hotelId/promotions/:promoId')
  .patch(auth(), isHotelOwner, validate(ordersValidation.updatePromotion), ordersController.updatePromotion)
  .delete(auth(), isHotelOwner, validate(ordersValidation.deletePromotion), ordersController.deletePromotion);

// ─── iCal Sources ────────────────────────────────────────────────────────────

router
  .route('/hotels/:hotelId/ical-sources')
  .get(auth(), isHotelOwner, ordersController.getICalSources)
  .post(auth(), isHotelOwner, validate(ordersValidation.createICalSource), ordersController.createICalSource);

router
  .route('/hotels/:hotelId/ical-sources/sync-all')
  .post(auth(), isHotelOwner, validate(ordersValidation.syncAllICalSources), ordersController.syncAllICalSources);

router
  .route('/hotels/:hotelId/ical-sources/:sourceId')
  .patch(auth(), isHotelOwner, validate(ordersValidation.updateICalSource), ordersController.updateICalSource)
  .delete(auth(), isHotelOwner, ordersController.deleteICalSource);

router
  .route('/hotels/:hotelId/ical-sources/:sourceId/sync')
  .post(auth(), isHotelOwner, validate(ordersValidation.syncICalSource), ordersController.syncICalSource);

// ─── Discount Codes ───────────────────────────────────────────────────────────

router
  .route('/validate-discount')
  .post(guestDiscountLimiter, validate(ordersValidation.validateDiscount), ordersController.validateDiscount);

router
  .route('/hotels/:hotelId/discount-codes')
  .get(auth(), isHotelOwner, ordersController.getDiscountCodes)
  .post(auth(), isHotelOwner, ordersController.createDiscountCode);

router
  .route('/hotels/:hotelId/discount-codes/:codeId')
  .patch(auth(), isHotelOwner, ordersController.updateDiscountCode)
  .delete(auth(), isHotelOwner, ordersController.deleteDiscountCode);

// ─── Order Actions ────────────────────────────────────────────────────────────

/**
 * POST  /v1/orders/:orderId/accept   — accept + set ETA
 * POST  /v1/orders/:orderId/advance  — advance status (Processing → On the way → Completed)
 * POST  /v1/orders/:orderId/cancel   — cancel
 */
router.route('/:orderId/accept').post(auth(), validate(ordersValidation.acceptOrder), ordersController.acceptOrder);

router.route('/:orderId/advance').post(auth(), validate(ordersValidation.advanceOrder), ordersController.advanceOrder);

router.route('/:orderId/cancel').post(auth(), validate(ordersValidation.cancelOrder), ordersController.cancelOrder);

router.route('/tablet/:orderId/accept').post(staffAuth('orders:accept'), ordersController.acceptOrder);

router.route('/tablet/:orderId/advance').post(staffAuth('orders:complete'), ordersController.advanceOrderStatus);

router.route('/tablet/:orderId/cancel').post(staffAuth('orders:cancel'), ordersController.cancelOrder);

export default router;

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management and guest catalog
 */

/**
 * @swagger
 * /orders/rooms/{roomId}/catalog:
 *   get:
 *     summary: Get room catalog
 *     description: Returns categories, items, settings and active promotions for a room. Used by the guest ordering page on load.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           description: MongoDB ObjectId of the room
 *     responses:
 *       "200":
 *         description: Catalog object with categories, items and settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                 settings:
 *                   type: object
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /orders/rooms/{roomId}:
 *   post:
 *     summary: Place a new order
 *     description: Place a new order for a room. Validates the reservation code server-side.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           description: MongoDB ObjectId of the room
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - payment
 *             properties:
 *               code:
 *                 type: string
 *                 description: Optional reservation code
 *               tablePin:
 *                 type: string
 *                 description: Optional table PIN
 *               guestEmail:
 *                 type: string
 *                 format: email
 *                 description: Optional guest email address
 *               guestRoomNumber:
 *                 type: string
 *                 description: Optional guest room number
 *               language:
 *                 type: string
 *                 description: Optional language preference
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - itemId
 *                     - qty
 *                   properties:
 *                     itemId:
 *                       type: string
 *                       description: MongoDB ObjectId of the catalog item
 *                     qty:
 *                       type: integer
 *                       minimum: 1
 *                     selectedModifiers:
 *                       type: array
 *                       items:
 *                         type: object
 *               payment:
 *                 type: string
 *                 enum: [cash, card, room, online]
 *               note:
 *                 type: string
 *                 maxLength: 500
 *               scheduledFor:
 *                 type: string
 *                 format: date-time
 *               discountCode:
 *                 type: string
 *                 maxLength: 64
 *               idempotencyKey:
 *                 type: string
 *                 format: uuid
 *               stripePaymentIntentId:
 *                 type: string
 *     responses:
 *       "201":
 *         description: Order placed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       "400":
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /orders/guest/payment-intent:
 *   post:
 *     summary: Create a Stripe PaymentIntent for guest checkout
 *     description: Creates a Stripe PaymentIntent for the guest to complete payment online.
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomId
 *               - currency
 *               - items
 *             properties:
 *               roomId:
 *                 type: string
 *                 description: MongoDB ObjectId of the room
 *               currency:
 *                 type: string
 *                 enum: [eur, usd]
 *               discountCode:
 *                 type: string
 *                 description: Optional discount code to apply
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - itemId
 *                     - qty
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     qty:
 *                       type: integer
 *                       minimum: 1
 *                     selectedModifiers:
 *                       type: array
 *                       items:
 *                         type: object
 *     responses:
 *       "200":
 *         description: PaymentIntent created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clientSecret:
 *                   type: string
 *       "400":
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /orders/track/{orderId}:
 *   get:
 *     summary: Poll order status
 *     description: Returns the current status of an order for the guest tracker page.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The order ID
 *       - in: header
 *         name: x-order-tracking-token
 *         required: true
 *         schema:
 *           type: string
 *         description: Guest tracking token
 *     responses:
 *       "200":
 *         description: Order status object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 eta:
 *                   type: string
 *                   format: date-time
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *   post:
 *     summary: Submit order rating
 *     description: Submit a star rating for a completed order.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       "204":
 *         description: Rating submitted
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /orders/rooms/{roomId}/status-link:
 *   post:
 *     summary: Send order status link to guest email
 *     description: Sends a link to the guest's email so they can track their order status.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the room
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       "204":
 *         description: Status link sent
 *       "400":
 *         description: Invalid email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /orders/guest-status:
 *   get:
 *     summary: Get all guest orders and bookings by status token
 *     description: Retrieves all orders, bookings and requests associated with a guest status token passed via header.
 *     tags: [Orders]
 *     responses:
 *       "200":
 *         description: Guest status object with orders and bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *     security:
 *       - GuestStatusToken: []
 */

/**
 * @swagger
 * /orders/guest-status/exchange:
 *   post:
 *     summary: Get guest status by token in request body
 *     description: Same as GET /guest-status but accepts the token in the request body instead of a query parameter.
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       "200":
 *         description: Guest status object with orders and bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /orders/validate-discount:
 *   post:
 *     summary: Validate a discount code before checkout
 *     description: Validates a discount code against a hotel's active codes and returns the discount details.
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hotelId
 *               - code
 *             properties:
 *               hotelId:
 *                 type: string
 *                 description: MongoDB ObjectId of the hotel
 *               code:
 *                 type: string
 *                 maxLength: 64
 *               totalAmount:
 *                 type: number
 *                 description: Optional order total for minimum-spend validation
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     qty:
 *                       type: integer
 *                     categoryId:
 *                       type: string
 *                     price:
 *                       type: number
 *     responses:
 *       "200":
 *         description: Discount validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 discountAmount:
 *                   type: number
 *       "400":
 *         description: Invalid or expired discount code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /orders/hotels/{hotelId}:
 *   get:
 *     summary: List hotel orders
 *     description: Returns a paginated and filtered list of orders for a hotel.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the hotel
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by order status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter orders from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter orders up to this date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of orders per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *     responses:
 *       "200":
 *         description: Paginated list of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalResults:
 *                   type: integer
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /orders/hotels/{hotelId}/analytics:
 *   get:
 *     summary: Get order analytics
 *     description: Returns order analytics and statistics for a hotel.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the hotel
 *     responses:
 *       "200":
 *         description: Order analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /orders/hotels/{hotelId}/settings:
 *   get:
 *     summary: Get order settings
 *     description: Returns the order settings for a hotel.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the hotel
 *     responses:
 *       "200":
 *         description: Order settings object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *   patch:
 *     summary: Update order settings
 *     description: Updates the order settings for a hotel.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the hotel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Partial order settings object to update
 *     responses:
 *       "200":
 *         description: Updated order settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /orders/hotels/{hotelId}/categories:
 *   get:
 *     summary: List order categories
 *     description: Returns all order categories for a hotel's catalog.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the hotel
 *     responses:
 *       "200":
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *   post:
 *     summary: Create order category
 *     description: Creates a new order category for a hotel's catalog.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the hotel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       "201":
 *         description: Category created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /orders/hotels/{hotelId}/items:
 *   get:
 *     summary: List catalog items
 *     description: Returns all catalog items for a hotel.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the hotel
 *     responses:
 *       "200":
 *         description: List of catalog items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *   post:
 *     summary: Create catalog item
 *     description: Creates a new catalog item for a hotel. Supports image upload via multipart/form-data.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the hotel
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - categoryId
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               categoryId:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       "201":
 *         description: Catalog item created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /orders/{orderId}/accept:
 *   post:
 *     summary: Accept order and set ETA
 *     description: Accepts an order and sets the estimated time of arrival.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eta
 *             properties:
 *               eta:
 *                 oneOf:
 *                   - type: string
 *                     format: date-time
 *                     description: ISO date-time for the ETA
 *                   - type: integer
 *                     description: Number of minutes until delivery
 *     responses:
 *       "200":
 *         description: Order accepted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /orders/{orderId}/advance:
 *   post:
 *     summary: Advance order status
 *     description: Advances the order through its status lifecycle (e.g. Processing -> On the way -> Completed).
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The order ID
 *     responses:
 *       "200":
 *         description: Order status advanced
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /orders/{orderId}/cancel:
 *   post:
 *     summary: Cancel order
 *     description: Cancels an order, optionally providing a reason.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The order ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Optional cancellation reason
 *     responses:
 *       "200":
 *         description: Order cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /orders/hotels/{hotelId}/discount-codes:
 *   get:
 *     summary: List discount codes
 *     description: Returns all discount codes for a hotel.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the hotel
 *     responses:
 *       "200":
 *         description: List of discount codes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *   post:
 *     summary: Create discount code
 *     description: Creates a new discount code for a hotel.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the hotel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 maxLength: 64
 *               discountType:
 *                 type: string
 *                 enum: [percentage, fixed]
 *               discountValue:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *               minOrderAmount:
 *                 type: number
 *               maxUses:
 *                 type: integer
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       "201":
 *         description: Discount code created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */
