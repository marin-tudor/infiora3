import crypto from 'crypto';
import fs from 'fs';
import httpStatus from 'http-status';
import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import * as maintenanceService from './maintenance.service';
import { pick } from '../utils';
import { IOptions } from '../paginate/paginate';
import { toObjectId } from '../utils/mongoUtils';
import Room from '../room/room.model';
import Hotel from '../hotel/hotel.model';
import { emailService } from '../email';
import MaintenanceIssue from './maintenance.model';
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

const getFileHash = (file?: Express.Multer.File) => {
  if (!file?.path) return '';
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return crypto.createHash('sha256').update(fs.readFileSync(file.path)).digest('hex');
};

export const createIssue = catchAsync(async (req: Request, res: Response) => {
  const room = await Room.findById(req.body.room).populate('hotel').populate('group');
  if (!room) throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');

  const serviceSettings = getEffectiveServiceSettings(
    room.maintenance as Record<string, unknown>,
    (room.group as any)?.maintenance as Record<string, unknown> | undefined
  );
  const reservationCodeStatus = await checkReservationCodeStatus(room.hotel.id, req.body.reservationCode);
  const roomNumberStatus = checkRoomNumberStatus(room.number, req.body.guestRoomNumber);

  if (serviceSettings['askReservationCode'] && reservationCodeStatus === 'not_provided') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Reservation code is required');
  }

  if (serviceSettings['askReservationCode'] && reservationCodeStatus !== 'matched') {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired reservation code');
  }

  const imageFile = (req.files as any)?.photo?.[0];
  const photoHash = getFileHash(imageFile);
  let photo: string | undefined;
  if (imageFile) {
    if (!imageFile.mimetype?.startsWith('image/')) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Only image files are allowed');
    }
    if (imageFile.size > 5 * 1024 * 1024) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Photo must be 5MB or smaller');
    }
    const { uploadToS3 } = await import('../utils/awsS3Utils');
    photo = await uploadToS3(imageFile, 'maintenance');
  }

  const guestStatusToken = generateGuestStatusToken();

  const issueBody: any = {
    hotel: room.hotel.id,
    room: room.id,
    type: req.body.type,
    typeLabel: req.body.typeLabel,
    description: req.body.description,
    photoHash,
    guestRoomNumber: req.body.guestRoomNumber,
    reservationCode: req.body.reservationCode?.trim(),
    reservationCodeStatus,
    guestStatusTokenHash: hashGuestStatusToken(guestStatusToken),
  };
  if (room.number) issueBody.roomNumber = room.number;
  if (photo) issueBody.photo = photo;

  const issue = await maintenanceService.createMaintenanceIssue(issueBody);
  const notificationEmails = uniqueEmails([
    ...((room.maintenance?.emails || []) as string[]),
    ...(((room.group as any)?.maintenance?.emails || []) as string[]),
  ]);

  if (notificationEmails.length > 0 && !(issue as any).wasDuplicate) {
    const issueType = req.body.typeLabel || req.body.type;
    await Promise.allSettled(
      notificationEmails.map((email) =>
        emailService.sendMaintenanceIssueEmail(email, {
          hotelName: room.hotel.name,
          roomNumber: room.number,
          roomId: room.id,
          issueType,
          description: req.body.description,
          photo,
          guestRoomNumber: req.body.guestRoomNumber,
          reservationCode: req.body.reservationCode,
          reservationCodeStatus: issue.reservationCodeStatus,
        })
      )
    );
  }

  res.status(httpStatus.CREATED).send({
    ...issue.toJSON(),
    roomNumberStatus,
    proofStatus: getProofStatus({
      reservationCodeStatus: issue.reservationCodeStatus || 'not_provided',
      roomNumberStatus,
    }),
    guestStatusToken,
  });
});

export const getIssues = catchAsync(async (req: Request, res: Response) => {
  const filter = { ...pick(req.query, ['status', 'room']), hotel: req.params['hotelId'] };
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page']);
  if (!options.sortBy) options.sortBy = 'createdAt:desc';

  const result = await maintenanceService.queryMaintenanceIssues(filter, options);
  res.send(result);
});

export const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const id = req.params['issueId']!;
  const { status } = req.body;
  const issue = await MaintenanceIssue.findById(id).select('hotel');

  if (!issue) throw new ApiError(httpStatus.NOT_FOUND, 'Issue not found');

  const hotel = await Hotel.findById(issue.hotel).select('user manager');

  if (!hotel) throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');

  const ownsHotel =
    req.user.role === 'admin' ||
    String(req.user.id) === String((hotel as any).user) ||
    String(req.user.id) === String((hotel as any).manager);

  if (!ownsHotel) throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');

  const updated = await maintenanceService.updateMaintenanceStatus(id, status);
  if (!updated) throw new ApiError(httpStatus.NOT_FOUND, 'Issue not found');

  res.send(updated);
});

export const getPendingCount = catchAsync(async (req: Request, res: Response) => {
  const hotelId = toObjectId(req.params['hotelId']);
  const count = await maintenanceService.getPendingCount(String(hotelId));
  res.send({ count });
});

export const getGuestIssueStatus = catchAsync(async (req: Request, res: Response) => {
  const token = String(req.get('x-guest-status-token') || '');
  if (!token) throw new ApiError(httpStatus.BAD_REQUEST, 'Status token is required');

  const issue = await MaintenanceIssue.findById(req.params['issueId']).select(
    '+guestStatusTokenHash status type typeLabel roomNumber guestRoomNumber reservationCodeStatus createdAt updatedAt'
  );

  if (!issue || issue.guestStatusTokenHash !== hashGuestStatusToken(token)) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid status token');
  }

  res.send({
    id: issue.id,
    type: issue.type,
    typeLabel: issue.typeLabel,
    status: issue.status,
    roomNumber: issue.roomNumber,
    guestRoomNumber: issue.guestRoomNumber,
    reservationCodeStatus: issue.reservationCodeStatus,
    roomNumberStatus: checkRoomNumberStatus(issue.roomNumber, issue.guestRoomNumber),
    proofStatus: getProofStatus({
      reservationCodeStatus: issue.reservationCodeStatus || 'not_provided',
      roomNumberStatus: checkRoomNumberStatus(issue.roomNumber, issue.guestRoomNumber),
    }),
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  });
});
