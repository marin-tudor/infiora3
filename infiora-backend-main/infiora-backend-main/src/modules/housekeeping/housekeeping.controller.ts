import crypto from 'crypto';
import httpStatus from 'http-status';
import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import * as housekeepingService from './housekeeping.service';
import { pick } from '../utils';
import { IOptions } from '../paginate/paginate';
import { toObjectId } from '../utils/mongoUtils';
import Room from '../room/room.model';
import Hotel from '../hotel/hotel.model';
import { emailService } from '../email';
import HousekeepingRequest from './housekeeping.model';
import {
  checkReservationCodeStatus,
  checkRoomNumberStatus,
  getEffectiveServiceSettings,
  getProofStatus,
} from '../utils/guestRequestVerification';

const uniqueEmails = (emails: Array<string | undefined>) =>
  Array.from(new Set(emails.filter((email): email is string => Boolean(email))));

const generateGuestStatusToken = () => crypto.randomBytes(24).toString('hex');
const hashGuestStatusToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export const createRequest = catchAsync(async (req: Request, res: Response) => {
  const room = await Room.findById(req.body.room).populate('hotel').populate('group');
  if (!room) throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');

  const serviceSettings = getEffectiveServiceSettings(
    room.housekeeping as Record<string, unknown>,
    (room.group as any)?.housekeeping as Record<string, unknown> | undefined
  );
  const reservationCodeStatus = await checkReservationCodeStatus(room.hotel.id, req.body.reservationCode);
  const roomNumberStatus = checkRoomNumberStatus(room.number, req.body.guestRoomNumber);

  if (serviceSettings['askReservationCode'] && reservationCodeStatus === 'not_provided') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Reservation code is required');
  }

  if (serviceSettings['askReservationCode'] && reservationCodeStatus !== 'matched') {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired reservation code');
  }

  const guestStatusToken = generateGuestStatusToken();

  const requestBody: any = {
    hotel: room.hotel.id,
    room: room.id,
    type: req.body.type,
    typeLabel: req.body.typeLabel,
    note: req.body.note,
    guestRoomNumber: req.body.guestRoomNumber,
    reservationCode: req.body.reservationCode?.trim(),
    reservationCodeStatus,
    guestStatusTokenHash: hashGuestStatusToken(guestStatusToken),
  };
  if (room.number) requestBody.roomNumber = room.number;

  const request = await housekeepingService.createHousekeepingRequest(requestBody);
  const notificationEmails = uniqueEmails([
    ...((room.housekeeping?.emails || []) as string[]),
    ...(((room.group as any)?.housekeeping?.emails || []) as string[]),
  ]);

  if (notificationEmails.length > 0 && !(request as any).wasDuplicate) {
    const requestType = req.body.typeLabel || req.body.type;
    await Promise.allSettled(
      notificationEmails.map((email) =>
        emailService.sendHousekeepingRequestEmail(email, {
          hotelName: room.hotel.name,
          roomNumber: room.number,
          roomId: room.id,
          requestType,
          note: req.body.note,
          guestRoomNumber: req.body.guestRoomNumber,
          reservationCode: req.body.reservationCode,
          reservationCodeStatus: request.reservationCodeStatus,
        })
      )
    );
  }

  res.status(httpStatus.CREATED).send({
    ...request.toJSON(),
    roomNumberStatus,
    proofStatus: getProofStatus({
      reservationCodeStatus: request.reservationCodeStatus || 'not_provided',
      roomNumberStatus,
    }),
    guestStatusToken,
  });
});

export const getRequests = catchAsync(async (req: Request, res: Response) => {
  const filter = { ...pick(req.query, ['status', 'room']), hotel: req.params['hotelId'] };
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page']);
  if (!options.sortBy) options.sortBy = 'createdAt:desc';

  const result = await housekeepingService.queryHousekeepingRequests(filter, options);
  res.send(result);
});

export const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const id = req.params['requestId']!;
  const { status } = req.body;
  const request = await HousekeepingRequest.findById(id).select('hotel');

  if (!request) throw new ApiError(httpStatus.NOT_FOUND, 'Request not found');

  const hotel = await Hotel.findById(request.hotel).select('user manager');

  if (!hotel) throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');

  const ownsHotel =
    req.user.role === 'admin' ||
    String(req.user.id) === String((hotel as any).user) ||
    String(req.user.id) === String((hotel as any).manager);

  if (!ownsHotel) throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');

  const updated = await housekeepingService.updateHousekeepingStatus(id, status);
  if (!updated) throw new ApiError(httpStatus.NOT_FOUND, 'Request not found');

  res.send(updated);
});

export const getPendingCount = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId']);
  const count = await housekeepingService.getPendingCount(String(hotelId));
  res.send({ count });
});

export const getGuestRequestStatus = catchAsync(async (req: Request, res: Response) => {
  const token = String(req.get('x-guest-status-token') || '');
  if (!token) throw new ApiError(httpStatus.BAD_REQUEST, 'Status token is required');

  const request = await HousekeepingRequest.findById(req.params['requestId']).select(
    '+guestStatusTokenHash status type typeLabel roomNumber guestRoomNumber reservationCodeStatus createdAt updatedAt'
  );

  if (!request || request.guestStatusTokenHash !== hashGuestStatusToken(token)) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid status token');
  }

  res.send({
    id: request.id,
    type: request.type,
    typeLabel: request.typeLabel,
    status: request.status,
    roomNumber: request.roomNumber,
    guestRoomNumber: request.guestRoomNumber,
    reservationCodeStatus: request.reservationCodeStatus,
    roomNumberStatus: checkRoomNumberStatus(request.roomNumber, request.guestRoomNumber),
    proofStatus: getProofStatus({
      reservationCodeStatus: request.reservationCodeStatus || 'not_provided',
      roomNumberStatus: checkRoomNumberStatus(request.roomNumber, request.guestRoomNumber),
    }),
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  });
});
