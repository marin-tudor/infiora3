import httpStatus from 'http-status';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Hotel from './hotel.model';
import config from '../../config/config';
import ApiError from '../errors/ApiError';
import { NewCreatedHotel, UpdateHotelBody, IHotelDoc } from './hotel.interfaces';
import { IOptions, QueryResult } from '../paginate/paginate';
import { uploadToS3 } from '../utils/awsS3Utils';
import { createAuditLog, listAuditLogs } from '../audit-log/audit-log.service';
import { getOperationsOverview, getTranslationCacheReview } from './hotel.operations';
/**
 * Query for hotels
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryHotels = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  const hotels = await Hotel.paginate(filter, options);
  return hotels;
};

/**
 * Get hotel by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IHotelDoc | null>}
 */
export const getHotelById = async (id: mongoose.Types.ObjectId): Promise<IHotelDoc | null> => Hotel.findById(id);

/**
 * Create a hotel
 * @param {NewCreatedHotel} hotelBody
 * @param {Express.Multer.File | undefined} file
 * @returns {Promise<IHotelDoc>}
 */
export const createHotel = async (hotelBody: NewCreatedHotel, files?: any): Promise<IHotelDoc> => {
  const body: any = { ...hotelBody };
  if (files) {
    await Promise.all(
      Object.keys(files).map(async (field) => {
        if (files[field]) body[field] = await uploadToS3(files[field][0], 'hotel');
      })
    );
  }
  return Hotel.create(body);
};

/**
 * Update hotel by id
 * @param {mongoose.Types.ObjectId} hotelId
 * @param {UpdateHotelBody} hotelBody
 * @param {Express.Multer.File | undefined} file
 * @returns {Promise<IHotelDoc | null>}
 */
export const updateHotelById = async (
  hotelId: mongoose.Types.ObjectId,
  hotelBody: UpdateHotelBody,
  files?: any
): Promise<IHotelDoc | null> => {
  const body: any = { ...hotelBody };
  const hotel = await getHotelById(hotelId);
  if (!hotel) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');
  }
  if (files) {
    await Promise.all(
      Object.keys(files).map(async (field) => {
        if (files[field]) body[field] = await uploadToS3(files[field][0], 'hotel');
      })
    );
  }
  Object.assign(hotel, body);
  await hotel.save();
  return hotel;
};

/**
 * Delete hotel by id
 * @param {mongoose.Types.ObjectId} hotelId
 * @returns {Promise<IHotelDoc | null>}
 */
export const deleteHotelById = async (hotelId: mongoose.Types.ObjectId): Promise<IHotelDoc | null> => {
  const hotel = await getHotelById(hotelId);
  if (!hotel) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');
  }
  await hotel.deleteOne();
  return hotel;
};

export const generateDeviceToken = (hotelId: string): string => {
  return jwt.sign({ hotelId, type: 'device', version: 1 }, config.jwt.secret, { expiresIn: '90d' });
};

export const generateVersionedDeviceToken = async (hotelId: string): Promise<string> => {
  const hotel = await Hotel.findById(hotelId).select('settings.security.deviceTokenVersion');
  if (!hotel) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');
  }

  const version = Math.max(1, Number((hotel as any)?.settings?.security?.deviceTokenVersion ?? 1));

  return jwt.sign({ hotelId, type: 'device', version }, config.jwt.secret, { expiresIn: '90d' });
};

export const getHotelSecuritySettings = async (hotelId: string) => {
  const hotel = await Hotel.findById(hotelId).select('settings.security');
  if (!hotel) throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');

  return {
    ...(hotel.toJSON() as any).settings?.security,
    recentAuditLogs: (await listAuditLogs(hotelId, 15)).map((entry: any) => ({
      id: String(entry._id),
      actorType: entry.actorType,
      actorId: entry.actorId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      summary: entry.summary,
      createdAt: entry.createdAt,
    })),
  };
};

export const updateHotelSecuritySettings = async (
  hotelId: string,
  body: Record<string, any>,
  actor?: { actorType: 'user' | 'staff' | 'system' | 'guest'; actorId?: string | null }
) => {
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');

  const currentSecurity = ((hotel as any).settings?.security ?? {}) as Record<string, any>;
  const nextSecurity: Record<string, any> = {
    ...currentSecurity,
    ...(body['trustedDomains']
      ? { trustedDomains: body['trustedDomains'].map((domain: string) => domain.trim()).filter(Boolean) }
      : {}),
    ...(body['pinSessionHours'] != null ? { pinSessionHours: Number(body['pinSessionHours']) } : {}),
    ...(body['allowSharedDevices'] != null ? { allowSharedDevices: Boolean(body['allowSharedDevices']) } : {}),
    ...(body['requireStrongPin'] != null ? { requireStrongPin: Boolean(body['requireStrongPin']) } : {}),
    ...(body['auditLogRetentionDays'] != null
      ? { auditLogRetentionDays: Number(body['auditLogRetentionDays']) }
      : {}),
  };

  if (body['rotateDeviceToken'] === true) {
    nextSecurity['deviceTokenVersion'] = Math.max(1, Number(currentSecurity['deviceTokenVersion'] ?? 1)) + 1;
  }

  (hotel as any).set('settings.security', nextSecurity);
  await hotel.save();

  await createAuditLog({
    hotelId,
    actorType: actor?.actorType ?? 'system',
    actorId: actor?.actorId ?? null,
    action: body['rotateDeviceToken'] === true ? 'security.device-token-rotated' : 'security.settings-updated',
    targetType: 'hotel',
    targetId: hotelId,
    summary:
      body['rotateDeviceToken'] === true
        ? 'Rotated device token version for hotel tablets.'
        : 'Updated hotel security settings.',
    details: {
      trustedDomains: nextSecurity['trustedDomains'],
      pinSessionHours: nextSecurity['pinSessionHours'],
      allowSharedDevices: nextSecurity['allowSharedDevices'],
      requireStrongPin: nextSecurity['requireStrongPin'],
      auditLogRetentionDays: nextSecurity['auditLogRetentionDays'],
      deviceTokenVersion: nextSecurity['deviceTokenVersion'],
    },
  });

  return nextSecurity;
};

export const getHotelPremiumModules = async (hotelId: string) => {
  const hotel = await Hotel.findById(hotelId).select('settings.premium');
  if (!hotel) throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');
  return ((hotel.toJSON() as any).settings?.premium ?? {}) as Record<string, boolean>;
};

export const updateHotelPremiumModules = async (
  hotelId: string,
  body: Record<string, any>,
  actor?: { actorType: 'user' | 'staff' | 'system' | 'guest'; actorId?: string | null }
) => {
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');

  const premium = {
    ...((hotel as any).settings?.premium ?? {}),
    ...(body['analytics'] != null ? { analytics: Boolean(body['analytics']) } : {}),
    ...(body['automation'] != null ? { automation: Boolean(body['automation']) } : {}),
    ...(body['upsells'] != null ? { upsells: Boolean(body['upsells']) } : {}),
    ...(body['multilingualContent'] != null ? { multilingualContent: Boolean(body['multilingualContent']) } : {}),
    ...(body['auditLogs'] != null ? { auditLogs: Boolean(body['auditLogs']) } : {}),
    ...(body['integrations'] != null ? { integrations: Boolean(body['integrations']) } : {}),
  };

  (hotel as any).set('settings.premium', premium);
  await hotel.save();

  await createAuditLog({
    hotelId,
    actorType: actor?.actorType ?? 'system',
    actorId: actor?.actorId ?? null,
    action: 'premium.modules-updated',
    targetType: 'hotel',
    targetId: hotelId,
    summary: 'Updated premium modules for hotel.',
    details: premium,
  });

  return premium;
};

export const getHotelOperationsDashboard = async (hotelId: string) => {
  return getOperationsOverview(hotelId);
};

export const getHotelTranslationCacheReview = async (hotelId: string) => {
  return getTranslationCacheReview(hotelId);
};
