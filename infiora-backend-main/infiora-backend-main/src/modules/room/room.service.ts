import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { json2csv } from 'json-2-csv';
import '../hotel/hotel.model';
import '../group/group.model';
import Room from './room.model';
import ApiError from '../errors/ApiError';
import { NewCreatedRoom, UpdateRoomBody, IRoomDoc, roomPopulate, IGuestRoomListItem } from './room.interfaces';
import { IOptions, QueryResult } from '../paginate/paginate';
import { removeNullFields, toPopulateString } from '../utils/miscUtils';
import Link from '../link/link.model';
import { reorderItems } from '../utils/arrayUtils';
import { uploadToS3 } from '../utils/awsS3Utils';
import {
  attachTranslationMetadata,
  getTranslatedRoomPayload,
  invalidateRoomTranslationCache,
  refreshRoomConfiguredTranslationCache,
} from './room.translation';
import { getTranslatedGroupPayload } from '../group/group.translation';
import { IUserDoc } from '../user/user.interfaces';
import Hotel from '../hotel/hotel.model';
import logger from '../logger/logger';

const serializeLinks = (links: any[]) => links.map((link) => (typeof link?.toJSON === 'function' ? link.toJSON() : link));
const isAllowedGuestImage = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' && !value.startsWith('data:');

const sanitizeLinkForGuestPayload = (link: Record<string, any>) => ({
  ...link,
  image: isAllowedGuestImage(link['image']) ? link['image'] : '',
  sections: Array.isArray(link['sections'])
    ? link['sections'].map((section: Record<string, any>) => ({
        ...section,
        mapImage: isAllowedGuestImage(section['mapImage']) ? section['mapImage'] : '',
        images: Array.isArray(section['images']) ? section['images'].filter(isAllowedGuestImage) : [],
      }))
    : [],
});

const sanitizeLinksForGuestPayload = (links: any[]) =>
  serializeLinks(links).map(sanitizeLinkForGuestPayload) as Array<{ position?: number; group?: string }>;

const pruneDefaultBackgroundOverride = (background: unknown) => {
  if (!background || typeof background !== 'object' || Array.isArray(background)) {
    return background;
  }

  const cleanedBackground = removeNullFields(background as Record<string, any>);
  const hasMeaningfulBackgroundOverride = ['type', 'color', 'direction', 'image'].some((key) => {
    const value = cleanedBackground[key];
    return value !== null && value !== undefined && value !== '';
  });

  if (!hasMeaningfulBackgroundOverride) {
    if (cleanedBackground.imageOpacity === 1) delete cleanedBackground.imageOpacity;
    if (cleanedBackground.backgroundFit === 'cover') delete cleanedBackground.backgroundFit;
    if (cleanedBackground.backgroundPosition === 'center center') delete cleanedBackground.backgroundPosition;
    if (cleanedBackground.tileSize === 120) delete cleanedBackground.tileSize;
  }

  return Object.keys(cleanedBackground).length > 0 ? cleanedBackground : undefined;
};

const pruneDefaultServiceOverride = (serviceConfig: unknown) => {
  if (!serviceConfig || typeof serviceConfig !== 'object' || Array.isArray(serviceConfig)) {
    return serviceConfig;
  }

  const cleanedServiceConfig = removeNullFields(serviceConfig as Record<string, any>);
  const hasMeaningfulServiceOverride = ['mainButtonText', 'icon', 'roomNumberLabel', 'reservationCodeLabel'].some((key) => {
    const value = cleanedServiceConfig[key];
    return value !== null && value !== undefined && value !== '';
  });
  const hasConfiguredCollections =
    (Array.isArray(cleanedServiceConfig.emails) && cleanedServiceConfig.emails.length > 0) ||
    (Array.isArray(cleanedServiceConfig.options) && cleanedServiceConfig.options.length > 0);

  if (!hasMeaningfulServiceOverride && !hasConfiguredCollections) {
    if (cleanedServiceConfig.isActive === false) delete cleanedServiceConfig.isActive;
    if (cleanedServiceConfig.askRoomNumber === false) delete cleanedServiceConfig.askRoomNumber;
    if (cleanedServiceConfig.askReservationCode === false) delete cleanedServiceConfig.askReservationCode;
  }

  return Object.keys(cleanedServiceConfig).length > 0 ? cleanedServiceConfig : undefined;
};

const buildRoomOverlayPayload = (roomPayload: Record<string, any>, roomLinks: any[]) => ({
  hotel: roomPayload['hotel'],
  description: roomPayload['description'],
  background: pruneDefaultBackgroundOverride(roomPayload['background']),
  font: roomPayload['font'],
  button: roomPayload['button'],
  popup: roomPayload['popup'],
  newsletter: roomPayload['newsletter'],
  feedback: roomPayload['feedback'],
  survey: roomPayload['survey'],
  housekeeping: pruneDefaultServiceOverride(roomPayload['housekeeping']),
  maintenance: pruneDefaultServiceOverride(roomPayload['maintenance']),
  links: reorderItems(sanitizeLinksForGuestPayload(roomLinks)),
});

const mergeNestedRecord = (baseValue: unknown, overrideValue: unknown) => {
  const baseRecord =
    baseValue && typeof baseValue === 'object' && !Array.isArray(baseValue) ? (baseValue as Record<string, any>) : {};
  const overrideRecord =
    overrideValue && typeof overrideValue === 'object' && !Array.isArray(overrideValue)
      ? removeNullFields(overrideValue as Record<string, any>)
      : {};

  if (Object.keys(overrideRecord).length === 0) {
    return baseValue;
  }

  return {
    ...baseRecord,
    ...overrideRecord,
  };
};

const getRecordValue = (record: Record<string, any>, key: string) => record[key];

const mergeRoomWithGroupPayload = (
  roomPayload: Record<string, any>,
  groupPayload: Record<string, any>,
  roomOverlayPayload: Record<string, any>
) => {
  const cleanedOverlayPayload = removeNullFields(roomOverlayPayload);

  return {
    ...groupPayload,
    ...cleanedOverlayPayload,
    background: mergeNestedRecord(
      getRecordValue(groupPayload, 'background'),
      getRecordValue(cleanedOverlayPayload, 'background')
    ),
    font: mergeNestedRecord(getRecordValue(groupPayload, 'font'), getRecordValue(cleanedOverlayPayload, 'font')),
    button: mergeNestedRecord(getRecordValue(groupPayload, 'button'), getRecordValue(cleanedOverlayPayload, 'button')),
    popup: mergeNestedRecord(getRecordValue(groupPayload, 'popup'), getRecordValue(cleanedOverlayPayload, 'popup')),
    newsletter: mergeNestedRecord(
      getRecordValue(groupPayload, 'newsletter'),
      getRecordValue(cleanedOverlayPayload, 'newsletter')
    ),
    feedback: mergeNestedRecord(getRecordValue(groupPayload, 'feedback'), getRecordValue(cleanedOverlayPayload, 'feedback')),
    survey: mergeNestedRecord(getRecordValue(groupPayload, 'survey'), getRecordValue(cleanedOverlayPayload, 'survey')),
    housekeeping: mergeNestedRecord(
      getRecordValue(groupPayload, 'housekeeping'),
      getRecordValue(cleanedOverlayPayload, 'housekeeping')
    ),
    maintenance: mergeNestedRecord(
      getRecordValue(groupPayload, 'maintenance'),
      getRecordValue(cleanedOverlayPayload, 'maintenance')
    ),
    id: roomPayload['id'],
    number: roomPayload['number'],
    url: roomPayload['url'],
    kioskMode: roomPayload['kioskMode'],
    group: roomPayload['group'],
    hotel: roomPayload['hotel'],
    links: reorderItems([...(groupPayload['links'] || []), ...(roomOverlayPayload['links'] || [])]),
  };
};

const getGuestHotelSummary = (hotel: Record<string, any>) => ({
  id: String(hotel['_id'] ?? hotel['id']),
  name: hotel['name'] || '',
  image: hotel['image'] || '',
  cover: hotel['cover'] || '',
  isActive: Boolean(hotel['isActive']),
  orders: {
    enabled: Boolean(hotel['orders']?.enabled),
    paymentMethods: {
      cash: Boolean(hotel['orders']?.paymentMethods?.cash),
      card: Boolean(hotel['orders']?.paymentMethods?.card),
      online: Boolean(hotel['orders']?.paymentMethods?.online),
    },
  },
  bookings: {
    enabled: Array.isArray(hotel['bookings']?.emails) ? hotel['bookings'].emails.length > 0 : false,
  },
  features: {
    ordersEnabled: Boolean(hotel['features']?.ordersEnabled),
    maintenanceEnabled: Boolean(hotel['features']?.maintenanceEnabled),
    housekeepingEnabled: Boolean(hotel['features']?.housekeepingEnabled),
  },
});

const isUserAllowedForHotel = (user: IUserDoc | undefined, hotel: Record<string, any> | undefined) => {
  if (!user || !hotel) {
    return false;
  }

  return (
    user.role === 'admin' ||
    String(user.id) === String(hotel['user']) ||
    String(user.id) === String(hotel['manager']) ||
    String(user.id) === String(hotel['user']?._id) ||
    String(user.id) === String(hotel['manager']?._id)
  );
};

const toGuestRoomListItem = (room: Record<string, any>): IGuestRoomListItem => ({
  id: String(room['_id'] ?? room['id']),
  url: room['url'],
  number: room['number'],
  description: room['description'],
  kioskMode: Boolean(room['kioskMode']),
  hotel: getGuestHotelSummary(room['hotel'] || {}),
});

const toGuestRoomPayload = (roomPayload: Record<string, any>, guestLinks: any[]) => ({
  ...roomPayload,
  id: String(roomPayload['_id'] ?? roomPayload['id']),
  hotel: getGuestHotelSummary(roomPayload['hotel'] || {}),
  links: reorderItems(sanitizeLinksForGuestPayload(guestLinks)),
});

/**
 * Query for rooms
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryRooms = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  const rooms = await Room.paginate(filter, { ...options, populate: toPopulateString(roomPopulate) });
  return rooms;
};

export const queryPublicRooms = async (
  filter: Record<string, any>,
  options: IOptions
): Promise<{
  results: IGuestRoomListItem[];
  page?: number;
  limit?: number;
  totalPages?: number;
  totalResults?: number;
}> => {
  const boundedOptions: IOptions = {
    ...options,
    limit: Math.min(Number(options.limit) || 20, 50),
    populate: toPopulateString(roomPopulate),
  };
  const publicFilter = { ...filter, isActive: true };
  const rooms = await Room.paginate(publicFilter, boundedOptions);
  const filteredResults = rooms.results
    .map((room) => room.toJSON())
    .filter((room: any) => room.hotel?.isActive)
    .map((room: any) => toGuestRoomListItem(room));

  return {
    ...rooms,
    results: filteredResults,
  };
};

/**
 * Get room by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IRoomDoc | null>}
 */
export const getRoomById = async (id: mongoose.Types.ObjectId): Promise<IRoomDoc | null> =>
  Room.findById(id).populate(roomPopulate);

/**
 * Get room
 * @param {mongoose.Types.ObjectId} id
 * @param {string | undefined} action
 * @returns {Promise<any>}
 */
export const getRoom = async (id: mongoose.Types.ObjectId, requestedLanguage?: string): Promise<any> => {
  const room = await getRoomById(id);
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
  }

  const json: any = room.toJSON();
  const roomLinks = await Link.find({ room: room._id, isActive: true });
  const roomOverlayPayload = buildRoomOverlayPayload(json, roomLinks);

  if (!room.group?._id) {
    const payload = {
      ...json,
      ...removeNullFields(json.group),
      id: json.id,
      links: reorderItems(sanitizeLinksForGuestPayload(roomLinks)),
    };

    if (!requestedLanguage) {
      return attachTranslationMetadata(payload);
    }

    return getTranslatedRoomPayload(payload, room._id, room.hotel._id, requestedLanguage);
  }

  const groupPayload = requestedLanguage
    ? await getTranslatedGroupPayload(room.group._id, room.hotel._id, requestedLanguage)
    : await getTranslatedGroupPayload(room.group._id, room.hotel._id);

  if (!groupPayload) {
    const payload = {
      ...json,
      ...removeNullFields(json.group),
      id: json.id,
      links: reorderItems(sanitizeLinksForGuestPayload(roomLinks)),
    };

    return requestedLanguage
      ? getTranslatedRoomPayload(payload, room._id, room.hotel._id, requestedLanguage)
      : attachTranslationMetadata(payload);
  }

  const translatedRoomOverlay = requestedLanguage
    ? await getTranslatedRoomPayload(roomOverlayPayload, room._id, room.hotel._id, requestedLanguage)
    : attachTranslationMetadata(roomOverlayPayload);

  const responsePayload = mergeRoomWithGroupPayload(json, groupPayload, translatedRoomOverlay);

  if (!requestedLanguage) {
    return responsePayload;
  }

  return responsePayload;
};

export const getPublicRoom = async (id: mongoose.Types.ObjectId, requestedLanguage?: string): Promise<any> => {
  const room = await getRoomById(id);
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
  }

  const json: any = room.toJSON();
  if (!json.isActive || !json.hotel?.isActive) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
  }

  const roomLinks = await Link.find({ room: room._id, isActive: true });
  const roomOverlayPayload = buildRoomOverlayPayload(json, roomLinks);

  if (!room.group?._id) {
    const payload = toGuestRoomPayload(
      {
        ...json,
        ...removeNullFields(json.group),
      },
      roomLinks
    );

    if (!requestedLanguage) {
      return attachTranslationMetadata(payload);
    }

    return getTranslatedRoomPayload(payload, room._id, room.hotel._id, requestedLanguage);
  }

  const groupPayload = requestedLanguage
    ? await getTranslatedGroupPayload(room.group._id, room.hotel._id, requestedLanguage)
    : await getTranslatedGroupPayload(room.group._id, room.hotel._id);

  if (!groupPayload) {
    const payload = toGuestRoomPayload(
      {
        ...json,
        ...removeNullFields(json.group),
      },
      roomLinks
    );

    return requestedLanguage
      ? getTranslatedRoomPayload(payload, room._id, room.hotel._id, requestedLanguage)
      : attachTranslationMetadata(payload);
  }

  const translatedRoomOverlay = requestedLanguage
    ? await getTranslatedRoomPayload(roomOverlayPayload, room._id, room.hotel._id, requestedLanguage)
    : attachTranslationMetadata(roomOverlayPayload);

  return {
    ...mergeRoomWithGroupPayload(json, groupPayload, translatedRoomOverlay),
    hotel: getGuestHotelSummary(json.hotel || {}),
  };
};

export const canUserAccessRoomInternals = async (
  roomId: mongoose.Types.ObjectId,
  user?: IUserDoc
): Promise<boolean> => {
  if (!user) {
    return false;
  }

  const room = await Room.findById(roomId).populate({
    path: 'hotel',
    select: 'user manager',
  });

  if (!room) {
    return false;
  }

  return isUserAllowedForHotel(user, (room as any).hotel?.toJSON ? (room as any).hotel.toJSON() : (room as any).hotel);
};

export const canUserAccessHotelInternals = async (
  hotelId: mongoose.Types.ObjectId,
  user?: IUserDoc
): Promise<boolean> => {
  if (!user) {
    return false;
  }

  const hotel = await Hotel.findById(hotelId).select('user manager');
  if (!hotel) {
    return false;
  }

  return isUserAllowedForHotel(user, hotel.toJSON());
};

/**
 * Create a room
 * @param {NewCreatedRoom} roomBody
 * @returns {Promise<IRoomDoc>}
 */
export const createRoom = async (roomBody: NewCreatedRoom): Promise<IRoomDoc> => {
  const { quantity, suffix, prefix, start, ...room } = roomBody;
  const roomCount = (await Room.countDocuments({ hotel: room.hotel })) + 1;

  const delay = (ms: number) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  const base = typeof start === 'number' ? start : roomCount;
  const createdRooms = await Promise.all(
    Array.from({ length: quantity }, async (_, index) => {
      const newRoom = { ...room, number: `${prefix}${base + index}${suffix}` };

      await delay(100);

      return Room.create(newRoom).then((r) => r.populate(roomPopulate));
    })
  );

  return createdRooms[0]!;
};

/**
 * Update room by id
 * @param {mongoose.Types.ObjectId} roomId
 * @param {UpdateRoomBody} updateBody
 * @param {Express.Multer.File[]} files
 * @returns {Promise<IRoomDoc | null>}
 */
export const updateRoomById = async (
  roomId: mongoose.Types.ObjectId,
  roomBody: UpdateRoomBody,
  files?: any
): Promise<IRoomDoc | null> => {
  const body: any = { ...roomBody };
  const room = await getRoomById(roomId);
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
  }

  if (files?.['popup[image]']?.[0]) {
    if (!body.popup) body.popup = {};
    body.popup.image = await uploadToS3(files['popup[image]'][0], 'room/popup');
  }

  ['type', 'color', 'direction', 'imageOpacity', 'backgroundFit', 'backgroundPosition', 'tileSize'].forEach((key) => {
    const formKey = `background[${key}]`;
    if (body[formKey] !== undefined) {
      if (!body.background) body.background = {};
      body.background[key] =
        key === 'imageOpacity'
          ? parseFloat(body[formKey])
          : key === 'tileSize'
          ? parseInt(body[formKey], 10)
          : body[formKey];
      delete body[formKey];
    }
  });

  if (files?.['background[image]']?.[0]) {
    if (!body.background) body.background = {};
    body.background.image = await uploadToS3(files['background[image]'][0], 'room/background');
    body.background.type = 'image';
    delete body['background[type]'];
  }

  Object.assign(room, body);
  await room.save().then((t) => t.populate(roomPopulate));
  const updatedJson: any = room.toJSON();
  const updatedRoomLinks = await Link.find({ room: room._id, isActive: true });
  const roomOverlayPayload = buildRoomOverlayPayload(updatedJson, updatedRoomLinks);
  void refreshRoomConfiguredTranslationCache(roomOverlayPayload, room._id, room.hotel._id).catch((error) => {
    logger.error('Failed to refresh configured translation cache for updated room', error);
  });
  return room;
};

/**
 * Delete room by id
 * @param {mongoose.Types.ObjectId} roomId
 * @returns {Promise<IRoomDoc | null>}
 */
export const deleteRoomById = async (roomId: mongoose.Types.ObjectId): Promise<IRoomDoc | null> => {
  const room = await getRoomById(roomId);
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
  }
  await invalidateRoomTranslationCache(roomId);
  await room.deleteOne();
  return room;
};

/**
 * Export rooms in csv
 * @param {Object} filter - Mongo filter
 * @returns {Promise<string | null>}
 */
export const exportRooms = async (filter: Record<string, any>): Promise<any> => {
  const rooms = await Room.find(filter, { url: 1, number: 1 });
  const roomsWithUrls = rooms.map((room) => ({ number: room.number, url: room.toObject({ virtuals: true }).url }));
  const csvData = json2csv(roomsWithUrls);

  return csvData;
};
