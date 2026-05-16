import express, { Router } from 'express';
import { auth } from '../../modules/auth';
import { isHotelOwner } from '../../modules/middleware';
import { validate } from '../../modules/validate';
import { createRateLimiter } from '../../modules/utils';
import * as bookingController from '../../modules/booking/booking.controller';
import * as blackoutController from '../../modules/booking/blackout-date.controller';
import bookingValidation from '../../modules/booking/booking.validation';

const router: Router = express.Router();
const guestBookingLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });
const guestBookingReadLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 60 });

// Guest-facing (public — no auth, like order placement)
router.post(
  '/hotels/:hotelId/bookings/payment-intent',
  guestBookingLimiter,
  validate(bookingValidation.createBookingPaymentIntent),
  bookingController.createBookingPaymentIntent
);

router.post(
  '/hotels/:hotelId/bookings',
  guestBookingLimiter,
  validate(bookingValidation.createBooking),
  bookingController.createBooking
);
router.post(
  '/hotels/:hotelId/bookings/waitlist',
  guestBookingLimiter,
  validate(bookingValidation.addToWaitlist),
  bookingController.joinWaitlist
);
// Guest fetches their own bookings by roomId
router.get('/hotels/:hotelId/rooms/:roomId/bookings', guestBookingReadLimiter, bookingController.getGuestBookings);

// Staff/owner routes
router.get('/hotels/:hotelId/bookings', auth(), isHotelOwner, bookingController.getHotelBookings);
router
  .route('/hotels/:hotelId/bookings/settings')
  .get(auth(), isHotelOwner, bookingController.getBookingSettings)
  .patch(auth(), isHotelOwner, bookingController.updateBookingSettings);
router.patch(
  '/hotels/:hotelId/bookings/:bookingId',
  auth(),
  isHotelOwner,
  validate(bookingValidation.updateBooking),
  bookingController.updateBooking
);
router.patch('/hotels/:hotelId/bookings/:bookingId/cancel', auth(), isHotelOwner, bookingController.cancelBooking);

// Guest cancel (no hotel owner auth — guest can cancel their own)
router.patch('/bookings/:bookingId/cancel', validate(bookingValidation.cancelGuestBooking), bookingController.cancelBooking);
router.patch(
  '/guest/bookings/:bookingId/cancel',
  validate(bookingValidation.cancelGuestBooking),
  bookingController.cancelBooking
);

// Resource management
router
  .route('/hotels/:hotelId/bookings/resources')
  .get(auth(), isHotelOwner, bookingController.listResources)
  .post(auth(), isHotelOwner, bookingController.createResource);

router
  .route('/hotels/:hotelId/bookings/resources/:resourceId')
  .patch(auth(), isHotelOwner, bookingController.updateResource)
  .delete(auth(), isHotelOwner, bookingController.deleteResource);

// Blackout dates
router
  .route('/hotels/:hotelId/bookings/blackout')
  .get(auth(), isHotelOwner, blackoutController.listBlackoutDates)
  .post(auth(), isHotelOwner, blackoutController.createBlackoutDate);

router
  .route('/hotels/:hotelId/bookings/blackout/:blackoutId')
  .delete(auth(), isHotelOwner, blackoutController.deleteBlackoutDate);

// TimeSlot management
router.get('/hotels/:hotelId/bookings/timeslots', guestBookingReadLimiter, bookingController.getTimeSlots);
router.patch(
  '/hotels/:hotelId/bookings/timeslots/:slotId/block',
  auth(),
  isHotelOwner,
  validate(bookingValidation.blockSlot),
  bookingController.blockSlot
);
router.patch('/hotels/:hotelId/bookings/timeslots/:slotId/unblock', auth(), isHotelOwner, bookingController.unblockSlot);

export default router;

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Hotel booking management
 */

/**
 * @swagger
 * /hotels/{hotelId}/bookings/payment-intent:
 *   post:
 *     summary: Create a Stripe PaymentIntent for an online booking
 *     description: Server calculates the booking total from the catalog item, party size, and addons. Returns a Stripe client secret for the guest to complete payment. Pass the returned paymentIntentId and checkoutId when calling POST /hotels/{hotelId}/bookings with payment='online'.
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           example: 5ebac534954b54139806c112
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemId
 *               - partySize
 *               - currency
 *             properties:
 *               itemId:
 *                 type: string
 *                 example: 5ebac534954b54139806c112
 *               partySize:
 *                 type: integer
 *                 minimum: 1
 *               currency:
 *                 type: string
 *                 enum: [eur, usd]
 *               discountCode:
 *                 type: string
 *               selectedAddons:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     addonId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *     responses:
 *       "201":
 *         description: PaymentIntent created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clientSecret:
 *                   type: string
 *                 paymentIntentId:
 *                   type: string
 *                 checkoutId:
 *                   type: string
 *       "400":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /hotels/{hotelId}/bookings:
 *   post:
 *     summary: Create a booking
 *     description: Guest creates a booking for a hotel item. Public endpoint, no authentication required.
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel MongoDB ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemId
 *               - startTime
 *               - partySize
 *               - guestEmail
 *               - guestRoomNumber
 *               - roomId
 *               - payment
 *             properties:
 *               itemId:
 *                 type: string
 *                 description: Bookable item MongoDB ObjectId
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 description: ISO 8601 date-time for the booking start
 *               partySize:
 *                 type: integer
 *                 minimum: 1
 *               guestEmail:
 *                 type: string
 *                 format: email
 *               guestRoomNumber:
 *                 type: string
 *               roomId:
 *                 type: string
 *                 description: Guest room MongoDB ObjectId
 *               code:
 *                 type: string
 *                 nullable: true
 *               discountCode:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 64
 *               idempotencyKey:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 maxLength: 64
 *                 description: UUIDv4 for idempotent submissions
 *               note:
 *                 type: string
 *               payment:
 *                 type: string
 *                 enum: [room, cash, card]
 *               selectedAddons:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - addonId
 *                     - name
 *                     - price
 *                   properties:
 *                     addonId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *             example:
 *               itemId: 64a1b2c3d4e5f6a7b8c9d0e1
 *               startTime: "2026-06-01T10:00:00.000Z"
 *               partySize: 2
 *               guestEmail: guest@example.com
 *               guestRoomNumber: "101"
 *               roomId: 64a1b2c3d4e5f6a7b8c9d0e2
 *               payment: room
 *     responses:
 *       "201":
 *         description: Booking created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 status:
 *                   type: string
 *       "400":
 *         $ref: '#/components/responses/NotFound'
 *       "429":
 *         description: Too many requests
 */

/**
 * @swagger
 * /hotels/{hotelId}/bookings/waitlist:
 *   post:
 *     summary: Join the waitlist for a fully-booked slot
 *     description: Guest joins the waitlist for a hotel item slot. Public endpoint, no authentication required.
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel MongoDB ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemId
 *               - slotStartTime
 *               - guestEmail
 *               - guestRoomNumber
 *               - partySize
 *             properties:
 *               itemId:
 *                 type: string
 *                 description: Bookable item MongoDB ObjectId
 *               slotStartTime:
 *                 type: string
 *                 format: date-time
 *                 description: ISO 8601 date-time for the desired slot
 *               guestEmail:
 *                 type: string
 *                 format: email
 *               guestRoomNumber:
 *                 type: string
 *               partySize:
 *                 type: integer
 *                 minimum: 1
 *             example:
 *               itemId: 64a1b2c3d4e5f6a7b8c9d0e1
 *               slotStartTime: "2026-06-01T10:00:00.000Z"
 *               guestEmail: guest@example.com
 *               guestRoomNumber: "101"
 *               partySize: 2
 *     responses:
 *       "201":
 *         description: Added to waitlist
 *       "400":
 *         $ref: '#/components/responses/NotFound'
 *       "429":
 *         description: Too many requests
 */

/**
 * @swagger
 * /hotels/{hotelId}/rooms/{roomId}/bookings:
 *   get:
 *     summary: Get guest's own bookings for a room
 *     description: Guest fetches their own bookings by room. Public endpoint, no authentication required.
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel MongoDB ObjectId
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Room MongoDB ObjectId
 *     responses:
 *       "200":
 *         description: List of bookings for the guest room
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /hotels/{hotelId}/bookings:
 *   get:
 *     summary: List all bookings for a hotel
 *     description: Hotel owner lists all bookings. Requires authentication and hotel owner role.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel MongoDB ObjectId
 *     responses:
 *       "200":
 *         description: List of all hotel bookings
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
 */

/**
 * @swagger
 * /hotels/{hotelId}/bookings/settings:
 *   get:
 *     summary: Get booking settings for a hotel
 *     description: Retrieve the booking configuration for a hotel. Requires authentication.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel MongoDB ObjectId
 *     responses:
 *       "200":
 *         description: Booking settings object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *   patch:
 *     summary: Update booking settings for a hotel
 *     description: Update the booking configuration for a hotel. Requires authentication and hotel owner role.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel MongoDB ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Partial booking settings to update
 *     responses:
 *       "200":
 *         description: Updated booking settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /hotels/{hotelId}/bookings/{bookingId}:
 *   patch:
 *     summary: Update a booking's status or staff notes
 *     description: Staff or hotel owner updates a booking. Requires authentication and hotel owner role.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel MongoDB ObjectId
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking MongoDB ObjectId
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, cancelled, completed, no_show]
 *               staffNote:
 *                 type: string
 *               staffMemberId:
 *                 type: string
 *               cancelledBy:
 *                 type: string
 *                 enum: [guest, staff]
 *             example:
 *               status: confirmed
 *               staffNote: Table by the window confirmed
 *               staffMemberId: 64a1b2c3d4e5f6a7b8c9d0e3
 *     responses:
 *       "200":
 *         description: Updated booking
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /hotels/{hotelId}/bookings/{bookingId}/cancel:
 *   patch:
 *     summary: Hotel cancels a booking
 *     description: Hotel owner cancels a specific booking. Requires authentication and hotel owner role.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel MongoDB ObjectId
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking MongoDB ObjectId
 *     responses:
 *       "200":
 *         description: Booking cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /bookings/{bookingId}/cancel:
 *   patch:
 *     summary: Guest cancels their own booking
 *     description: Guest cancels a booking using a secure token. Public endpoint, no authentication required.
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking MongoDB ObjectId
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
 *                 minLength: 20
 *                 description: Secure cancellation token sent to the guest
 *             example:
 *               token: abc123def456ghi789jkl012
 *     responses:
 *       "200":
 *         description: Booking cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       "400":
 *         $ref: '#/components/responses/NotFound'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /guest/bookings/{bookingId}/cancel:
 *   patch:
 *     summary: Guest cancels their own booking (alternate path)
 *     description: Alternate path for guest booking cancellation using a secure token. Public endpoint, no authentication required.
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking MongoDB ObjectId
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
 *                 minLength: 20
 *                 description: Secure cancellation token sent to the guest
 *             example:
 *               token: abc123def456ghi789jkl012
 *     responses:
 *       "200":
 *         description: Booking cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       "400":
 *         $ref: '#/components/responses/NotFound'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /hotels/{hotelId}/bookings/resources:
 *   get:
 *     summary: List bookable resources for a hotel
 *     description: Returns all bookable resources configured for the hotel. Requires authentication and hotel owner role.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel MongoDB ObjectId
 *     responses:
 *       "200":
 *         description: List of bookable resources
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
 *     summary: Create a bookable resource
 *     description: Creates a new bookable resource for the hotel. Requires authentication and hotel owner role.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel MongoDB ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Resource definition (name, capacity, etc.)
 *     responses:
 *       "201":
 *         description: Resource created
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
 * /hotels/{hotelId}/bookings/resources/{resourceId}:
 *   patch:
 *     summary: Update a bookable resource
 *     description: Updates an existing bookable resource. Requires authentication and hotel owner role.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel MongoDB ObjectId
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Resource MongoDB ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Partial resource fields to update
 *     responses:
 *       "200":
 *         description: Updated resource
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     summary: Delete a bookable resource
 *     description: Permanently deletes a bookable resource. Requires authentication and hotel owner role.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel MongoDB ObjectId
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Resource MongoDB ObjectId
 *     responses:
 *       "204":
 *         description: Resource deleted
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /hotels/{hotelId}/bookings/blackout:
 *   get:
 *     summary: List blackout dates for a hotel
 *     description: Returns all blackout dates during which bookings are disabled. Requires authentication and hotel owner role.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel MongoDB ObjectId
 *     responses:
 *       "200":
 *         description: List of blackout dates
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
 *     summary: Create a blackout date
 *     description: Adds a blackout date range during which no bookings can be made. Requires authentication and hotel owner role.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel MongoDB ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Blackout date definition (startDate, endDate, reason, etc.)
 *     responses:
 *       "201":
 *         description: Blackout date created
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
 * /hotels/{hotelId}/bookings/blackout/{blackoutId}:
 *   delete:
 *     summary: Delete a blackout date
 *     description: Removes a blackout date entry. Requires authentication and hotel owner role.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel MongoDB ObjectId
 *       - in: path
 *         name: blackoutId
 *         required: true
 *         schema:
 *           type: string
 *         description: Blackout date MongoDB ObjectId
 *     responses:
 *       "204":
 *         description: Blackout date deleted
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /hotels/{hotelId}/bookings/timeslots:
 *   get:
 *     summary: Get available timeslots
 *     description: Returns available booking timeslots for a hotel item. Public endpoint, no authentication required.
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel MongoDB ObjectId
 *       - in: query
 *         name: itemId
 *         required: false
 *         schema:
 *           type: string
 *         description: Bookable item MongoDB ObjectId to filter timeslots
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to retrieve timeslots for (YYYY-MM-DD)
 *     responses:
 *       "200":
 *         description: Available timeslots
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /hotels/{hotelId}/bookings/timeslots/{slotId}/block:
 *   patch:
 *     summary: Block a timeslot
 *     description: Marks a specific timeslot as blocked, preventing new bookings. Requires authentication and hotel owner role.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel MongoDB ObjectId
 *       - in: path
 *         name: slotId
 *         required: true
 *         schema:
 *           type: string
 *         description: Timeslot MongoDB ObjectId
 *     responses:
 *       "200":
 *         description: Timeslot blocked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /hotels/{hotelId}/bookings/timeslots/{slotId}/unblock:
 *   patch:
 *     summary: Unblock a timeslot
 *     description: Removes the block from a timeslot, allowing new bookings. Requires authentication and hotel owner role.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel MongoDB ObjectId
 *       - in: path
 *         name: slotId
 *         required: true
 *         schema:
 *           type: string
 *         description: Timeslot MongoDB ObjectId
 *     responses:
 *       "200":
 *         description: Timeslot unblocked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
