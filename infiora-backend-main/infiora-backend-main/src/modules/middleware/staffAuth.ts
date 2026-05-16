import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import httpStatus from 'http-status';
import config from '../../config/config';
import { ApiError } from '../errors';
import StaffMember from '../staff/staff-member.model';
import { StaffPermission } from '../staff/staff.interfaces';

declare module 'express-serve-static-core' {
  interface Request {
    staffSession?: {
      staffMemberId: string;
      hotelId: string;
      permissions: StaffPermission[];
      groupIds: string[];
    };
  }
}

export const staffAuth =
  (...required: StaffPermission[]) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Staff session token required'));
    }

    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, config.jwt.secret) as any;
      if (payload.type !== 'staff-session') {
        return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token type'));
      }

      const staffMember = await StaffMember.findOne({
        _id: payload.sub,
        hotelId: payload.hotelId,
        isActive: true,
      }).populate<{ roleId: { permissions: StaffPermission[] } }>('roleId', 'permissions');

      if (!staffMember || !staffMember.roleId) {
        return next(new ApiError(httpStatus.UNAUTHORIZED, 'Staff session is no longer valid'));
      }

      if (req.params['hotelId'] && req.params['hotelId'] !== String(payload.hotelId)) {
        return next(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
      }

      const permissions = ((staffMember.roleId as any)?.permissions ?? []) as StaffPermission[];
      const missing = required.filter((permission) => !permissions.includes(permission));
      if (missing.length > 0) {
        return next(new ApiError(httpStatus.FORBIDDEN, `Missing permissions: ${missing.join(', ')}`));
      }

      req.staffSession = {
        staffMemberId: payload.sub,
        hotelId: payload.hotelId,
        permissions,
        groupIds: staffMember.groupIds.map(String),
      };
      return next();
    } catch {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired staff session'));
    }
  };
