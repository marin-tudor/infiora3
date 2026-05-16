import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import httpStatus from 'http-status';
import config from '../../config/config';
import { ApiError } from '../errors';
import Hotel from '../hotel/hotel.model';

declare module 'express-serve-static-core' {
  interface Request {
    deviceSession?: { hotelId: string };
  }
}

export const isDeviceAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Device token required'));
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret) as any;
    if (payload.type !== 'device') {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token type'));
    }

    const hotel = await Hotel.findById(payload.hotelId).select('settings.security.deviceTokenVersion');
    const currentVersion = Math.max(1, Number((hotel as any)?.settings?.security?.deviceTokenVersion ?? 1));

    if (!hotel || Number(payload.version ?? 1) !== currentVersion) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Device token has been rotated'));
    }

    req.deviceSession = { hotelId: payload.hotelId };
    return next();
  } catch {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired device token'));
  }
};
