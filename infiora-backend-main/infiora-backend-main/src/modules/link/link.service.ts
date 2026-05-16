import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Link from './link.model';
import ApiError from '../errors/ApiError';
import logger from '../logger/logger';
import { NewCreatedLink, UpdateLinkBody, ILinkDoc } from './link.interfaces';
import { IOptions, QueryResult } from '../paginate/paginate';
import { toObjectId } from '../utils/mongoUtils';
import { uploadToS3 } from '../utils/awsS3Utils';
import { refreshGroupConfiguredTranslationCache } from '../group/group.translation';
import Group from '../group/group.model';
import Room from '../room/room.model';
import { refreshRoomConfiguredTranslationCache } from '../room/room.translation';
import Hotel from '../hotel/hotel.model';

const getGroupHotelId = async (groupId?: string | mongoose.Types.ObjectId | null) => {
  if (!groupId) {
    return null;
  }

  const group = await Group.findById(groupId).select('hotel');
  if (!group?.hotel) {
    return null;
  }

  return toObjectId(String(group.hotel));
};

const buildRoomOverlayPayload = async (roomId?: string | mongoose.Types.ObjectId | null) => {
  if (!roomId) {
    return null;
  }

  const room = await Room.findById(roomId).populate('hotel');
  if (!room) {
    return null;
  }

  const roomLinks = await Link.find({ room: room._id, isActive: true });
  const json: any = room.toJSON();

  return {
    roomId: room._id,
    hotelId: toObjectId(String(room.hotel._id)),
    payload: {
      hotel: json.hotel,
      description: json.description,
      background: json.background,
      font: json.font,
      button: json.button,
      popup: json.popup,
      newsletter: json.newsletter,
      feedback: json.feedback,
      survey: json.survey,
      housekeeping: json.housekeeping,
      maintenance: json.maintenance,
      links: roomLinks,
    },
  };
};

/**
 * Handle file uploads for link body
 * @param {any} body - Link body object
 * @param {Express.Multer.File[] | undefined} files - Uploaded files
 * @returns {Promise<void>}
 */
const handleFileUploads = async (body: any, files?: Express.Multer.File[]): Promise<void> => {
  if (!files || files.length === 0) return;

  const linkBody = body;

  // Handle main image
  const mainImageFile = files.find((file) => file.fieldname === 'image');
  if (mainImageFile) {
    linkBody.image = await uploadToS3(mainImageFile, 'link');
  }

  // Handle section images
  const sectionImageFiles = files.filter(
    (file) => file.fieldname.startsWith('sections[') && file.fieldname.includes('[images][')
  );

  if (sectionImageFiles.length > 0 && linkBody.sections) {
    // Parse sections if they come as strings
    if (typeof linkBody.sections === 'string') {
      linkBody.sections = JSON.parse(linkBody.sections);
    }

    // Process each section image file
    await Promise.all(
      sectionImageFiles.map(async (file) => {
        const match = file.fieldname.match(/sections\[(\d+)\]\[images\]\[(\d+)\]/);
        if (match && match[1] && match[2]) {
          const sectionIndex = parseInt(match[1], 10);
          const imageIndex = parseInt(match[2], 10);

          if (linkBody.sections && linkBody.sections[sectionIndex]) {
            const section = linkBody.sections[sectionIndex];
            if (section && !section.images) {
              section.images = [];
            }

            const uploadedImageUrl = await uploadToS3(file, 'link/sections');
            if (section && section.images) {
              section.images[imageIndex] = uploadedImageUrl;
            }
          }
        }
      })
    );
  }
};

/**
 * Query for links
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryLinks = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  const links = await Link.paginate(filter, options);
  return links;
};

/**
 * Get link by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<ILinkDoc | null>}
 */
export const getLinkById = async (id: mongoose.Types.ObjectId): Promise<ILinkDoc | null> => Link.findById(id);

export const getPublicLinkById = async (id: mongoose.Types.ObjectId): Promise<ILinkDoc | null> => {
  const link = await Link.findOne({ _id: id, isActive: true });
  if (!link) {
    return null;
  }

  if (link.room) {
    const room = await Room.findById(link.room).populate('hotel').select('isActive hotel');
    const hotel = (room as any)?.hotel;
    if (!room || !room.isActive || !hotel?.isActive) {
      return null;
    }
  }

  if (link.group) {
    const group = await Group.findById(link.group).select('isActive hotel');
    if (!group?.isActive) {
      return null;
    }

    const hotel = await Hotel.findById(group.hotel).select('isActive');
    if (!hotel?.isActive) {
      return null;
    }
  }

  return link;
};

/**
 * Create a link
 * @param {NewCreatedLink} linkBody
 * @param {Express.Multer.File[] | undefined} files
 * @returns {Promise<ILinkDoc>}
 */
export const createLink = async (linkBody: NewCreatedLink, files?: Express.Multer.File[]): Promise<ILinkDoc> => {
  const body = { ...linkBody };

  await handleFileUploads(body, files);

  const link = await Link.create(body);
  if (link.group) {
    const hotelId = await getGroupHotelId(link.group);
    if (hotelId) {
      void refreshGroupConfiguredTranslationCache(toObjectId(String(link.group)), hotelId).catch((error) => {
        logger.error('Failed to refresh configured translation cache after group link creation', error);
      });
    }
  }
  if (link.room) {
    const roomOverlay = await buildRoomOverlayPayload(link.room);
    if (roomOverlay) {
      void refreshRoomConfiguredTranslationCache(roomOverlay.payload, roomOverlay.roomId, roomOverlay.hotelId).catch((error) => {
        logger.error('Failed to refresh configured translation cache after room link creation', error);
      });
    }
  }
  return link;
};

/**
 * Update link by id
 * @param {mongoose.Types.ObjectId} linkId
 * @param {UpdateLinkBody} linkBody
 * @param {Express.Multer.File[] | undefined} files
 * @returns {Promise<ILinkDoc | null>}
 */
export const updateLinkById = async (
  linkId: mongoose.Types.ObjectId,
  linkBody: UpdateLinkBody,
  files?: Express.Multer.File[]
): Promise<ILinkDoc | null> => {
  const body = { ...linkBody };
  const link = await getLinkById(linkId);
  if (!link) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Link not found');
  }

  await handleFileUploads(body, files);

  const previousGroupId = link.group ? String(link.group) : undefined;
  const previousRoomId = link.room ? String(link.room) : undefined;
  Object.assign(link, body);
  await link.save();

  const groupIds = new Set(
    [previousGroupId, link.group ? String(link.group) : undefined].filter((value): value is string => Boolean(value))
  );

  await Promise.all(
    Array.from(groupIds, async (groupId) => {
      const hotelId = await getGroupHotelId(groupId);
      if (hotelId) {
        void refreshGroupConfiguredTranslationCache(toObjectId(groupId), hotelId).catch((error) => {
          logger.error('Failed to refresh configured translation cache after group link update', error);
        });
      }
    })
  );

  const roomIds = new Set(
    [previousRoomId, link.room ? String(link.room) : undefined].filter((value): value is string => Boolean(value))
  );
  await Promise.all(
    Array.from(roomIds, async (roomId) => {
      const roomOverlay = await buildRoomOverlayPayload(roomId);
      if (roomOverlay) {
        void refreshRoomConfiguredTranslationCache(roomOverlay.payload, roomOverlay.roomId, roomOverlay.hotelId).catch((error) => {
          logger.error('Failed to refresh configured translation cache after room link update', error);
        });
      }
    })
  );

  return link;
};

/**
 * Delete link by id
 * @param {mongoose.Types.ObjectId} linkId
 * @returns {Promise<ILinkDoc | null>}
 */
export const deleteLinkById = async (linkId: mongoose.Types.ObjectId): Promise<ILinkDoc | null> => {
  const link = await getLinkById(linkId);
  if (!link) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Link not found');
  }
  const groupId = link.group ? toObjectId(String(link.group)) : null;
  const hotelId = await getGroupHotelId(groupId);
  await link.deleteOne();
  if (groupId && hotelId) {
    void refreshGroupConfiguredTranslationCache(groupId, hotelId).catch((error) => {
      logger.error('Failed to refresh configured translation cache after group link deletion', error);
    });
  }
  if (link.room) {
    const roomOverlay = await buildRoomOverlayPayload(link.room);
    if (roomOverlay) {
      void refreshRoomConfiguredTranslationCache(roomOverlay.payload, roomOverlay.roomId, roomOverlay.hotelId).catch((error) => {
        logger.error('Failed to refresh configured translation cache after room link deletion', error);
      });
    }
  }
  return link;
};

/**
 * Reorder room's links
 * @param {mongoose.Types.ObjectId} id
 * @param {UpdateProfileBody} body
 * @returns {Promise<void>}
 */
export const reorderLinks = async (id: mongoose.Types.ObjectId, body: any): Promise<void> => {
  let touchedGroupLink = false;
  let touchedRoomLink = false;

  await Promise.all(
    Array.from(body.orderedLinks, async (linkId: string, i) => {
      const link = await getLinkById(toObjectId(linkId));
      if (link && (link.room?.toString() === id.toString() || link.group?.toString() === id.toString())) {
        link.position = i;
        await link.save();
        if (link.group?.toString() === id.toString()) {
          touchedGroupLink = true;
        }
        if (link.room?.toString() === id.toString()) {
          touchedRoomLink = true;
        }
      }
    })
  );

  if (touchedGroupLink) {
    const hotelId = await getGroupHotelId(id);
    if (!hotelId) {
      return;
    }
    void refreshGroupConfiguredTranslationCache(id, hotelId).catch((error) => {
      logger.error('Failed to refresh configured translation cache after group link reorder', error);
    });
  }
  if (touchedRoomLink) {
    const roomOverlay = await buildRoomOverlayPayload(id);
    if (roomOverlay) {
      void refreshRoomConfiguredTranslationCache(roomOverlay.payload, roomOverlay.roomId, roomOverlay.hotelId).catch((error) => {
        logger.error('Failed to refresh configured translation cache after room link reorder', error);
      });
    }
  }
};
