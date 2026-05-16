import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { ApiError } from '../errors';
import { Hotel } from '../hotel';
import { Room } from '../room';
import { Link } from '../link';
import { Group } from '../group';
import User from '../user/user.model';

const isAdmin = (reqUser: any): boolean => {
  return reqUser.role === 'admin';
};

const isManager = (reqUser: any): boolean => {
  return reqUser.role === 'manager';
};

const isSelf = (reqUser: any, userId?: any): boolean => {
  return String(reqUser.id) === String(userId);
};

const isUserAllowedForHotel = (reqUser: any, hotel: any): boolean => {
  if (!reqUser || !hotel) {
    return false;
  }

  return (
    isAdmin(reqUser) ||
    isSelf(reqUser, hotel?.user) ||
    isSelf(reqUser, hotel?.manager)
  );
};

export const isOwner = (req: Request, _res: Response, next: NextFunction): void => {
  const { user } = req;

  if (isAdmin(user) || isSelf(user, req.params['userId']) || isSelf(user, req.query['user'] as string)) {
    return next();
  }

  return next(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
};

export const isAccessibleUser = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const targetUserId = req.params['userId'];
    if (!targetUserId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'User ID is required');
    }

    if (isAdmin(req.user) || isSelf(req.user, targetUserId)) {
      return next();
    }

    if (!isManager(req.user)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
    }

    const targetUser = await User.findById(targetUserId).select('managers');
    if (!targetUser) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    const managerIds = ((targetUser as any).managers ?? []).map((managerId: any) => String(managerId));
    if (!managerIds.includes(String(req.user.id))) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

export const isHotelOwner = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotel: any = await Hotel.findById(req.params['hotelId']);

    if (!isUserAllowedForHotel(req.user, hotel)) {
      if (!hotel) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');
      }
      throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

export const isRoomOwner = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const roomId = req.params['roomId'] || req.query['roomId'];
    const room: any = await Room.findById(roomId).populate('hotel');

    if (!room) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
    }

    if (!room.hotel) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');
    }

    if (!isUserAllowedForHotel(req.user, room.hotel)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

export const isRoomOrGroupOwner = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const room: any = await Room.findById(req.params['id']).populate('hotel');
    const group: any = await Group.findById(req.params['id']).populate('hotel');
    const hotel = room?.hotel || group?.hotel;
    if (!hotel) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Resource not found');
    }
    if (!isUserAllowedForHotel(req.user, hotel)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

export const isLinkOwner = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const link: any = await Link.findById(req.params['linkId']).populate([
      {
        path: 'room',
        populate: 'hotel',
      },
      {
        path: 'group',
        populate: 'hotel',
      },
    ]);

    const hotel = link?.room?.hotel || link?.group?.hotel;
    if (!hotel) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Link not found');
    }
    if (!isUserAllowedForHotel(req.user, hotel)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

export const isGroupOwner = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const group: any = await Group.findById(req.params['groupId']).populate('hotel');
    if (!group) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Group not found');
    }
    if (!group.hotel) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');
    }
    if (!isUserAllowedForHotel(req.user, group.hotel)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

export const isBodyHotelOwner = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotelId = req.body?.hotel;
    if (!hotelId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'hotel is required');
    }
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');
    }
    if (!isUserAllowedForHotel(req.user, hotel)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

export const isQueryHotelOwner = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotelId = req.query['hotel'];
    if (!hotelId || isAdmin(req.user)) {
      return next();
    }

    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');
    }
    if (!isUserAllowedForHotel(req.user, hotel)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

export const isBodyRoomOrGroupOwner = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const roomId = req.body?.room;
    const groupId = req.body?.group;

    if (!roomId && !groupId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'room or group is required');
    }

    const room: any = roomId ? await Room.findById(roomId).populate('hotel') : null;
    const group: any = groupId ? await Group.findById(groupId).populate('hotel') : null;
    const hotel = room?.hotel || group?.hotel;

    if (!hotel) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Parent resource not found');
    }
    if (!isUserAllowedForHotel(req.user, hotel)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

export const isQueryRoomOrGroupOwner = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const roomId = req.query['room'];
    const groupId = req.query['group'];

    if ((!roomId && !groupId) || isAdmin(req.user)) {
      return next();
    }

    const room: any = roomId ? await Room.findById(roomId).populate('hotel') : null;
    const group: any = groupId ? await Group.findById(groupId).populate('hotel') : null;
    const hotel = room?.hotel || group?.hotel;

    if (!hotel) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Parent resource not found');
    }
    if (!isUserAllowedForHotel(req.user, hotel)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
    }
    return next();
  } catch (error) {
    return next(error);
  }
};
