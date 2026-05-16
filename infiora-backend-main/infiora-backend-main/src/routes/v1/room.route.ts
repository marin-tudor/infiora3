import express, { Router } from 'express';
import { validate } from '../../modules/validate';
import { auth, optionalAuth } from '../../modules/auth';
import { roomController, roomValidation } from '../../modules/room';
import { isBodyHotelOwner, isQueryHotelOwner, isRoomOwner } from '../../modules/middleware';
import multerUpload from '../../modules/utils/multerUpload';
import { createRateLimiter } from '../../modules/utils';

const router: Router = express.Router();
const guestRoomActivityLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 120 });
const guestFeedbackLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 15 });

router
  .route('/')
  .post(auth(), validate(roomValidation.createRoom), isBodyHotelOwner, roomController.createRoom)
  .get(optionalAuth, validate(roomValidation.getRooms), roomController.getRooms);

router.route('/export').get(auth(), validate(roomValidation.exportRooms), isQueryHotelOwner, roomController.exportRooms);

router
  .route('/feedback')
  .post(guestFeedbackLimiter, validate(roomValidation.createFeedback), roomController.createFeedback)
  .get(auth(), validate(roomValidation.getFeedbacks), isQueryHotelOwner, roomController.getFeedbacks);

router
  .route('/:roomId')
  .get(optionalAuth, validate(roomValidation.getRoom), roomController.getRoom)
  .patch(
    auth(),
    isRoomOwner,
    multerUpload.fields([
      { name: 'popup[image]', maxCount: 1 },
      { name: 'background[image]', maxCount: 1 },
    ]),
    validate(roomValidation.updateRoom),
    roomController.updateRoom
  )
  .delete(auth(), isRoomOwner, validate(roomValidation.deleteRoom), roomController.deleteRoom);

router
  .route('/:roomId/activity')
  .post(
    guestRoomActivityLimiter,
    validate(roomValidation.createRoomActivity),
    roomController.createRoomActivity
  );

router
  .route('/:roomId/activity/:activityId')
  .post(
    guestRoomActivityLimiter,
    validate(roomValidation.updateRoomActivity),
    roomController.updateRoomActivity
  );

export default router;

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Room management and guest interactions
 */

/**
 * @swagger
 * /rooms:
 *   get:
 *     summary: List rooms
 *     description: Returns a paginated list of rooms. Authentication is optional — authenticated hotel owners see their own rooms; unauthenticated callers need to supply a hotel ID.
 *     tags: [Rooms]
 *     parameters:
 *       - in: query
 *         name: hotel
 *         schema:
 *           type: string
 *           example: 5ebac534954b54139806c112
 *         description: Filter rooms by hotel ObjectId
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Full-text search term applied to room name/suffix/prefix
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           example: createdAt:desc
 *         description: "Sort field and order, format: field:asc|desc"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Maximum number of rooms to return per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: 5ebac534954b54139806c112
 *                       hotel:
 *                         type: string
 *                         example: 5ebac534954b54139806c112
 *                       name:
 *                         type: string
 *                         example: Room 101
 *                       suffix:
 *                         type: string
 *                         example: A
 *                       prefix:
 *                         type: string
 *                         example: Suite
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 3
 *                 totalResults:
 *                   type: integer
 *                   example: 25
 *       "400":
 *         description: Bad request — invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 400
 *               message: "\"limit\" must be a number"
 *   post:
 *     summary: Create rooms
 *     description: Bulk-creates one or more rooms for a hotel. The authenticated user must own the hotel.
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hotel
 *               - quantity
 *               - start
 *             properties:
 *               hotel:
 *                 type: string
 *                 description: Hotel ObjectId
 *                 example: 5ebac534954b54139806c112
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 description: Number of rooms to create
 *                 example: 5
 *               suffix:
 *                 type: string
 *                 description: Optional suffix appended to each room label
 *                 example: A
 *               prefix:
 *                 type: string
 *                 description: Optional prefix prepended to each room label
 *                 example: Suite
 *               start:
 *                 type: integer
 *                 description: Starting number for the room sequence
 *                 example: 101
 *             example:
 *               hotel: 5ebac534954b54139806c112
 *               quantity: 5
 *               prefix: Suite
 *               start: 101
 *     responses:
 *       "201":
 *         description: Rooms created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: 5ebac534954b54139806c112
 *                   hotel:
 *                     type: string
 *                     example: 5ebac534954b54139806c112
 *                   name:
 *                     type: string
 *                     example: Suite 101
 *       "400":
 *         description: Bad request — validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 400
 *               message: "\"quantity\" must be less than or equal to 100"
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /rooms/export:
 *   get:
 *     summary: Export rooms as CSV
 *     description: Returns a CSV file containing all rooms for the specified hotel. The authenticated user must own the hotel.
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hotel
 *         required: true
 *         schema:
 *           type: string
 *           example: 5ebac534954b54139806c112
 *         description: Hotel ObjectId whose rooms to export
 *     responses:
 *       "200":
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       "400":
 *         description: Bad request — hotel query param missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 400
 *               message: "\"hotel\" is required"
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /rooms/feedback:
 *   post:
 *     summary: Submit guest feedback
 *     description: Public endpoint (rate-limited to 15 requests per 15 minutes per IP) that allows guests to submit a satisfaction rating and optional message for a room.
 *     tags: [Rooms]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - room
 *               - rating
 *             properties:
 *               room:
 *                 type: string
 *                 description: Room ObjectId
 *                 example: 5ebac534954b54139806c112
 *               rating:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 10
 *                 description: Guest satisfaction rating from 0 to 10
 *                 example: 8
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Optional guest email address
 *                 example: guest@example.com
 *               message:
 *                 type: string
 *                 description: Optional free-text feedback message
 *                 example: Great stay, very clean room!
 *               surveyAnswers:
 *                 type: object
 *                 description: Optional key-value map of survey question IDs to answers
 *                 additionalProperties: true
 *                 example:
 *                   cleanliness: 9
 *                   service: 8
 *             example:
 *               room: 5ebac534954b54139806c112
 *               rating: 8
 *               email: guest@example.com
 *               message: Great stay, very clean room!
 *     responses:
 *       "201":
 *         description: Feedback submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: 5ebac534954b54139806c112
 *                 room:
 *                   type: string
 *                   example: 5ebac534954b54139806c112
 *                 rating:
 *                   type: number
 *                   example: 8
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       "400":
 *         description: Bad request — validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 400
 *               message: "\"rating\" must be less than or equal to 10"
 *       "429":
 *         description: Too many requests — rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 429
 *               message: Too many requests, please try again later
 *   get:
 *     summary: Get guest feedbacks
 *     description: Returns a paginated list of guest feedback entries. The authenticated user must own the hotel.
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hotel
 *         required: true
 *         schema:
 *           type: string
 *           example: 5ebac534954b54139806c112
 *         description: Hotel ObjectId to filter feedback by
 *       - in: query
 *         name: room
 *         schema:
 *           type: string
 *           example: 5ebac534954b54139806c112
 *         description: Optional room ObjectId to narrow results to a single room
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-01-01"
 *         description: Filter feedback submitted on or after this date (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-12-31"
 *         description: Filter feedback submitted on or before this date (ISO 8601)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term applied to feedback message or email
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Maximum number of feedback entries per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: 5ebac534954b54139806c112
 *                       room:
 *                         type: string
 *                         example: 5ebac534954b54139806c112
 *                       hotel:
 *                         type: string
 *                         example: 5ebac534954b54139806c112
 *                       rating:
 *                         type: number
 *                         example: 8
 *                       email:
 *                         type: string
 *                         format: email
 *                         example: guest@example.com
 *                       message:
 *                         type: string
 *                         example: Great stay, very clean room!
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 2
 *                 totalResults:
 *                   type: integer
 *                   example: 18
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /rooms/{roomId}:
 *   get:
 *     summary: Get room details
 *     description: Returns the full details of a single room. Authentication is optional. An optional lang query parameter can be used to request translated content.
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           example: 5ebac534954b54139806c112
 *         description: Room ObjectId
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           example: de
 *         description: BCP-47 language code for translated room content (e.g. de, hr, fr)
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: 5ebac534954b54139806c112
 *                 hotel:
 *                   type: string
 *                   example: 5ebac534954b54139806c112
 *                 name:
 *                   type: string
 *                   example: Suite 101
 *                 suffix:
 *                   type: string
 *                   example: A
 *                 prefix:
 *                   type: string
 *                   example: Suite
 *                 background:
 *                   type: object
 *                   properties:
 *                     image:
 *                       type: string
 *                       format: uri
 *                       example: https://cdn.example.com/rooms/bg.jpg
 *                 popup:
 *                   type: object
 *                   properties:
 *                     image:
 *                       type: string
 *                       format: uri
 *                       example: https://cdn.example.com/rooms/popup.jpg
 *       "400":
 *         description: Bad request — invalid roomId
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 400
 *               message: "\"roomId\" must be a valid ObjectId"
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *   patch:
 *     summary: Update room
 *     description: Updates room settings and optionally replaces the popup or background image. The authenticated user must be the room owner. Request body is multipart/form-data to support image uploads.
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           example: 5ebac534954b54139806c112
 *         description: Room ObjectId
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               popup[image]:
 *                 type: string
 *                 format: binary
 *                 description: Replacement image for the room popup (max 1 file)
 *               background[image]:
 *                 type: string
 *                 format: binary
 *                 description: Replacement image for the room background (max 1 file)
 *               name:
 *                 type: string
 *                 description: Updated room display name
 *                 example: Suite 101
 *               suffix:
 *                 type: string
 *                 description: Updated room suffix
 *                 example: A
 *               prefix:
 *                 type: string
 *                 description: Updated room prefix
 *                 example: Suite
 *     responses:
 *       "200":
 *         description: Room updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: 5ebac534954b54139806c112
 *                 name:
 *                   type: string
 *                   example: Suite 101
 *                 background:
 *                   type: object
 *                   properties:
 *                     image:
 *                       type: string
 *                       format: uri
 *                       example: https://cdn.example.com/rooms/bg.jpg
 *                 popup:
 *                   type: object
 *                   properties:
 *                     image:
 *                       type: string
 *                       format: uri
 *                       example: https://cdn.example.com/rooms/popup.jpg
 *       "400":
 *         description: Bad request — validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 400
 *               message: "\"roomId\" must be a valid ObjectId"
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     summary: Delete room
 *     description: Permanently deletes a room and all its associated data. The authenticated user must be the room owner.
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           example: 5ebac534954b54139806c112
 *         description: Room ObjectId
 *     responses:
 *       "204":
 *         description: Room deleted successfully — no content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /rooms/{roomId}/activity:
 *   post:
 *     summary: Create room activity event
 *     description: Public, rate-limited endpoint (120 requests per 15 minutes per IP) used by the guest app to record a view or tap interaction on a room. Returns an activityId that can be used to update the session later.
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           example: 5ebac534954b54139806c112
 *         description: Room ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - visitorId
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [view, tap]
 *                 description: Type of interaction recorded
 *                 example: view
 *               visitorId:
 *                 type: string
 *                 description: Unique anonymous identifier for the guest session (UUID)
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *               device:
 *                 type: string
 *                 description: Guest device type
 *                 example: iOS
 *               language:
 *                 type: string
 *                 description: Guest browser/app language (BCP-47 code or full name)
 *                 example: en
 *               button:
 *                 type: string
 *                 description: Identifier of the button that was tapped (for tap actions)
 *                 example: link-5ebac534954b54139806c112
 *               buttonTitle:
 *                 type: string
 *                 description: Human-readable label of the tapped button
 *                 example: Room Service
 *             example:
 *               action: view
 *               visitorId: 550e8400-e29b-41d4-a716-446655440000
 *               device: iOS
 *               language: en
 *     responses:
 *       "201":
 *         description: Activity event recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activityId:
 *                   type: string
 *                   description: ObjectId of the created activity, used for subsequent time-spent updates
 *                   example: 5ebac534954b54139806c112
 *       "400":
 *         description: Bad request — validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 400
 *               message: "\"action\" must be one of [view, tap]"
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "429":
 *         description: Too many requests — rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 429
 *               message: Too many requests, please try again later
 */

/**
 * @swagger
 * /rooms/{roomId}/activity/{activityId}:
 *   post:
 *     summary: Update room activity session
 *     description: Public endpoint used by the guest app to update an existing activity record with time-spent and engagement data once the guest leaves or the session ends.
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           example: 5ebac534954b54139806c112
 *         description: Room ObjectId
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema:
 *           type: string
 *           example: 5ebac534954b54139806c113
 *         description: Activity ObjectId returned from the create activity endpoint
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               time:
 *                 type: number
 *                 description: Total time the guest spent on the room page, in seconds
 *                 example: 120
 *               engaged:
 *                 type: boolean
 *                 description: Whether the guest was considered engaged (scrolled, tapped, etc.)
 *                 example: true
 *               language:
 *                 type: string
 *                 description: Guest browser/app language at session end (BCP-47 code or full name)
 *                 example: en
 *             example:
 *               time: 120
 *               engaged: true
 *               language: en
 *     responses:
 *       "200":
 *         description: Activity session updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: 5ebac534954b54139806c113
 *                 time:
 *                   type: number
 *                   example: 120
 *                 engaged:
 *                   type: boolean
 *                   example: true
 *       "400":
 *         description: Bad request — validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 400
 *               message: "\"time\" must be a number"
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "429":
 *         description: Too many requests — rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 429
 *               message: Too many requests, please try again later
 */
