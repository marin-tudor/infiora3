import httpStatus from 'http-status';
import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import * as hotelService from './hotel.service';
import { pick, match } from '../utils';
import { IOptions } from '../paginate/paginate';
import { toObjectId } from '../utils/mongoUtils';
import { Activity } from '../activity';
import * as insightService from '../insight/insight.service';
import { roomService } from '../room';
import { emailService } from '../email';
import { createAuditLog } from '../audit-log/audit-log.service';

import { generateSlotsForHotel } from '../scheduler/slotGeneration';

export const getHotels = catchAsync(async (req: Request, res: Response) => {
  let filter = {
    ...pick(req.query, ['user']),
    ...match(req.query, ['name', '_id']),
  };
  filter = {
    ...filter,
    ...(req.user.role === 'manager' && !filter.user ? { manager: req.user.id } : {}),
  };
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const result = await hotelService.queryHotels(filter, options);
  res.send(result);
});

export const getHotel = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId']);
  const hotel = await hotelService.getHotelById(hotelId);
  if (!hotel) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');
  }
  res.send(hotel);
});

export const createHotel = catchAsync(async (req: Request, res: Response) => {
  const hotel = await hotelService.createHotel({ ...req.body, isActive: req.user.role === 'admin' }, req.files);
  await emailService.sendHotelEmail(req.user, hotel);
  res.status(httpStatus.CREATED).send(hotel);
});

export const updateHotel = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId']);
  const hotel = await hotelService.updateHotelById(hotelId, req.body, req.files);
  res.send(hotel);
});

export const deleteHotel = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId']);
  await hotelService.deleteHotelById(hotelId);
  res.status(httpStatus.NO_CONTENT).send();
});

export const socialLinkTap = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId']);
  const hotel = await hotelService.getHotelById(hotelId);
  if (!hotel) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');
  }
  const room = await roomService.getRoomById(req.body.room);
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
  }
  const { link, ...body } = req.body;

  const headline =
    body.popup || body.logo
      ? `Room ${room.number || ''}'s ${body.popup ? 'popup' : 'logo'} was tapped.`
      : `${hotel.name} ${link} was tapped.`;

  await Activity.create({
    user: hotel.user,
    hotel: hotelId,
    action: 'tap',
    details: {
      image: hotel.image,
      title: hotel.name,
      headline,
      socialLink: req.body.link,
      ...body,
    },
  });
  res.status(httpStatus.NO_CONTENT).send();
});

export const getInsights = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId']);
  const { startDate, endDate, language, device } = pick(req.query, ['startDate', 'endDate', 'language', 'device']);
  const hotel = await hotelService.getHotelById(hotelId);
  if (!hotel) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');
  }
  const insights = await insightService.getHotelInsights({ hotel, startDate, endDate, language, device });
  res.send(insights);
});

export const generateDeviceToken = catchAsync(async (req: Request, res: Response) => {
  const token = await hotelService.generateVersionedDeviceToken(req.params['hotelId']!);
  await createAuditLog({
    hotelId: req.params['hotelId']!,
    actorType: 'user',
    actorId: req.user.id,
    action: 'security.device-token-issued',
    targetType: 'hotel',
    targetId: req.params['hotelId']!,
    summary: 'Issued a new device token for hotel tablet access.',
  });
  res.json({ token });
});

export const triggerSlotGeneration = catchAsync(async (req: Request, res: Response) => {
  await generateSlotsForHotel(req.params['hotelId']!);
  res.status(200).json({ message: 'Slot generation complete' });
});

export const getOperationsOverview = catchAsync(async (req: Request, res: Response) => {
  res.json(await hotelService.getHotelOperationsDashboard(req.params['hotelId']!));
});

export const getSecuritySettings = catchAsync(async (req: Request, res: Response) => {
  res.json(await hotelService.getHotelSecuritySettings(req.params['hotelId']!));
});

export const updateSecuritySettings = catchAsync(async (req: Request, res: Response) => {
  res.json(
    await hotelService.updateHotelSecuritySettings(req.params['hotelId']!, req.body, {
      actorType: 'user',
      actorId: req.user.id,
    })
  );
});

export const getPremiumModules = catchAsync(async (req: Request, res: Response) => {
  res.json(await hotelService.getHotelPremiumModules(req.params['hotelId']!));
});

export const updatePremiumModules = catchAsync(async (req: Request, res: Response) => {
  res.json(
    await hotelService.updateHotelPremiumModules(req.params['hotelId']!, req.body, {
      actorType: 'user',
      actorId: req.user.id,
    })
  );
});

export const getTranslationCacheReview = catchAsync(async (req: Request, res: Response) => {
  res.json(await hotelService.getHotelTranslationCacheReview(req.params['hotelId']!));
});
