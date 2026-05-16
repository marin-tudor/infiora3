import httpStatus from 'http-status';
import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import * as roomService from './room.service';
import * as feedbackService from '../feedback/feedback.service';
import { pick, match } from '../utils';
import { IOptions } from '../paginate/paginate';
import { toObjectId } from '../utils/mongoUtils';
import { Activity } from '../activity';
import { toDate } from '../utils/miscUtils';
import { emailService } from '../email';
import { isBotUserAgent } from '../utils/requestUtils';

export const getRooms = catchAsync(async (req: Request, res: Response) => {
  const filter = { ...pick(req.query, ['hotel']), ...match(req.query, ['name', 'number', '_id']) };
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const canViewInternals =
    req.user && typeof filter.hotel === 'string'
      ? await roomService.canUserAccessHotelInternals(toObjectId(filter.hotel), req.user)
      : false;

  if (!canViewInternals && !filter.hotel) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'hotel is required for public room listings');
  }

  const result = canViewInternals ? await roomService.queryRooms(filter, options) : await roomService.queryPublicRooms(filter, options);
  res.send(result);
});

export const getRoom = catchAsync(async (req: Request, res: Response) => {
  const roomId = toObjectId(req.params['roomId']);
  const { lang } = pick(req.query, ['lang']);
  const canViewInternals = await roomService.canUserAccessRoomInternals(roomId, req.user);
  const room = canViewInternals
    ? await roomService.getRoom(roomId, typeof lang === 'string' ? lang : undefined)
    : await roomService.getPublicRoom(roomId, typeof lang === 'string' ? lang : undefined);
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
  }
  res.send(room);
});

export const createRoomActivity = catchAsync(async (req: Request, res: Response) => {
  const roomId = toObjectId(req.params['roomId']);
  const room = await roomService.getRoom(roomId);

  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
  }

  if (isBotUserAgent(req.get('user-agent'))) {
    res.status(httpStatus.ACCEPTED).send({ activityId: null });
    return;
  }

  const { action, button, buttonTitle, ...details } = req.body;
  const resolvedButtonTitle = buttonTitle || button;

  const activity = await Activity.create({
    user: room.hotel.user,
    hotel: room.hotel.id,
    action,
    details: {
      image: room.hotel.image,
      title: room.hotel.name,
      headline:
        action === 'tap' && button
          ? `Room ${room.number || ''}'s ${resolvedButtonTitle} was tapped`
          : `Room ${room.number || ''} was viewed.`,
      room: room.id,
      ...(button ? { button } : {}),
      ...(resolvedButtonTitle ? { buttonTitle: resolvedButtonTitle } : {}),
      ...details,
    },
  });

  res.status(httpStatus.CREATED).send({ activityId: activity.id });
});

export const updateRoomActivity = catchAsync(async (req: Request, res: Response) => {
  const roomId = toObjectId(req.params['roomId']);
  const activityId = toObjectId(req.params['activityId']);
  const detailsUpdate = {
    ...(req.body.engaged !== undefined ? { 'details.engaged': req.body.engaged } : {}),
    ...(req.body.language !== undefined ? { 'details.language': req.body.language } : {}),
    ...(req.body.time !== undefined ? { 'details.time': req.body.time } : {}),
  };

  const activity = await Activity.findOneAndUpdate(
    {
      _id: activityId,
      'details.room': roomId,
    },
    { $set: detailsUpdate },
    { new: true }
  ).select('_id');

  if (!activity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Activity not found');
  }

  res.send({ activityId: String(activity._id) });
});

export const createRoom = catchAsync(async (req: Request, res: Response) => {
  const room = await roomService.createRoom({ ...req.body, isActive: req.user.role === 'admin' });
  res.status(httpStatus.CREATED).send(room);
});

export const updateRoom = catchAsync(async (req: Request, res: Response) => {
  const roomId = toObjectId(req.params['roomId']);
  const room = await roomService.updateRoomById(roomId, req.body, req.files);
  res.send(room);
});

export const deleteRoom = catchAsync(async (req: Request, res: Response) => {
  const roomId = toObjectId(req.params['roomId']);
  await roomService.deleteRoomById(roomId);
  res.status(httpStatus.NO_CONTENT).send();
});

export const getFeedbacks = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate } = pick(req.query, ['startDate', 'endDate']);
  const { start, end } = toDate({ startDate, endDate });
  const filter = {
    ...pick(req.query, ['room', 'hotel']),
    createdAt: { $gte: start, $lte: end },
  };

  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  // Default: exclude guest email from list responses to protect PII
  if (!options.projectBy) {
    options.projectBy = '-email';
  }
  const result = await feedbackService.queryFeedbacks(filter, options);
  res.send(result);
});

export const createFeedback = catchAsync(async (req: Request, res: Response) => {
  const roomId = toObjectId(req.body.room);
  const room = await roomService.getRoom(roomId);

  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
  }
  const feedback = await feedbackService.createFeedback({
    ...req.body,
    hotel: room.hotel.id,
    room: room.id,
    email: req.body.email?.trim() || undefined,
    message: req.body.message?.trim() || undefined,
  });

  const emailPromises = [];

  // Send feedback notification emails to configured recipients
  if (room.feedback?.emails && room.feedback.emails.length > 0) {
    const feedbackData = {
      roomNumber: room.number,
      roomId: room.id,
      hotelName: room.hotel.name,
      rating: feedback.rating,
      email: feedback.email,
      message: feedback.message,
    };

    const notificationPromises = room.feedback.emails.map((email: string) =>
      emailService.sendFeedbackEmail(email, feedbackData)
    );
    emailPromises.push(...notificationPromises);
  }

  // Send thank you email to the customer who submitted feedback
  if (feedback.email && room.feedback?.emails && room.feedback.emails.length > 0) {
    const fromEmail = room.feedback.emails[0];
    const thankYouPromise = emailService.sendFeedbackThankYouEmail(feedback.email, room.hotel.name, fromEmail);
    emailPromises.push(thankYouPromise);
  }

  // Urgent alert for low ratings (1–2 stars)
  if (feedback.rating != null && feedback.rating <= 2 && room.feedback?.emails?.length > 0) {
    const urgentAlerts = room.feedback.emails.map((email: string) =>
      emailService.sendUrgentFeedbackAlert(email, {
        hotelName: room.hotel.name,
        roomNumber: room.number || 'N/A',
        rating: feedback.rating,
        message: feedback.message,
      })
    );
    emailPromises.push(...urgentAlerts);
  }

  await Promise.allSettled(emailPromises);

  res.status(httpStatus.CREATED).send(feedback);
});

export const exportRooms = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['hotel']);
  const rooms = await roomService.exportRooms(filter);
  res.set('Content-Type', `text/csv; name="rooms.csv"`);
  res.set('Content-Disposition', `inline; filename="rooms.csv"`);
  res.send(rooms);
});
