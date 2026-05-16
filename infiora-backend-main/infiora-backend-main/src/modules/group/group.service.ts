import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Group from './group.model';
import ApiError from '../errors/ApiError';
import { NewCreatedGroup, UpdateGroupBody, IGroupDoc, groupPopulate } from './group.interfaces';
import { IOptions, QueryResult } from '../paginate/paginate';
import { toPopulateString } from '../utils/miscUtils';
import { Link } from '../link';
import { uploadToS3 } from '../utils/awsS3Utils';
import { invalidateGroupTranslationCache, refreshGroupConfiguredTranslationCache } from './group.translation';
import { toObjectId } from '../utils/mongoUtils';
import logger from '../logger/logger';

/**
 * Query for groups
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryGroups = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  const groups = await Group.paginate(filter, { ...options, populate: toPopulateString(groupPopulate) });
  return groups;
};

/**
 * Get group by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IGroupDoc | null>}
 */
export const getGroupById = async (id: mongoose.Types.ObjectId): Promise<IGroupDoc | null> =>
  Group.findById(id).populate(groupPopulate);

/**
 * Create a group
 * @param {NewCreatedGroup} groupBody
 * @returns {Promise<IGroupDoc>}
 */
export const createGroup = async (groupBody: NewCreatedGroup): Promise<IGroupDoc> => {
  const group = await Group.create(groupBody).then((t) => t.populate(groupPopulate));
  void refreshGroupConfiguredTranslationCache(group._id, toObjectId(String(group.hotel._id))).catch((error) => {
    logger.error('Failed to preload configured translation cache for created group', error);
  });
  return group;
};

/**
 * Update group by id
 * @param {mongoose.Types.ObjectId} groupId
 * @param {UpdateGroupBody} updateBody
 * @param {Express.Multer.File[]} files
 * @returns {Promise<IGroupDoc | null>}
 */
export const updateGroupById = async (
  groupId: mongoose.Types.ObjectId,
  groupBody: UpdateGroupBody,
  files?: any
): Promise<IGroupDoc | null> => {
  const body: any = { ...groupBody };
  const group = await getGroupById(groupId);
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found');
  }

  if (files?.['popup[image]']?.[0]) {
    if (!body.popup) body.popup = {};
    body.popup.image = await uploadToS3(files['popup[image]'][0], 'group/popup');
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
    body.background.image = await uploadToS3(files['background[image]'][0], 'group/background');
    body.background.type = 'image';
    delete body['background[type]'];
  }

  Object.assign(group, body);
  await group.save().then((t) => t.populate(groupPopulate));
  void refreshGroupConfiguredTranslationCache(group._id, toObjectId(String(group.hotel._id))).catch((error) => {
    logger.error('Failed to refresh configured translation cache for updated group', error);
  });
  return group;
};

/**
 * Delete group by id
 * @param {mongoose.Types.ObjectId} groupId
 * @returns {Promise<IGroupDoc | null>}
 */
export const deleteGroupById = async (groupId: mongoose.Types.ObjectId): Promise<IGroupDoc | null> => {
  const group = await getGroupById(groupId);
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found');
  }
  await invalidateGroupTranslationCache(groupId);
  await group.deleteOne();
  return group;
};

/**
 * Duplicate group
 * @param {mongoose.Types.ObjectId} groupId
 * @returns {Promise<any | null>}
 */
export const duplicateGroup = async (groupId: mongoose.Types.ObjectId, hotel?: mongoose.Types.ObjectId) => {
  const group = await Group.findById(groupId).select('-createdAt -updatedAt');
  if (!group) throw new ApiError(httpStatus.NOT_FOUND, 'Group not found');

  const groupData = group.toObject();
  delete groupData._id;

  const newGroup = await Group.create({ ...groupData, hotel });
  const links = await Link.find({ group: groupId });

  const newLinks = links.map((link) => {
    const linkData = link.toObject();
    delete linkData._id;
    linkData.group = newGroup._id;
    return linkData;
  });

  await Link.insertMany(newLinks);
  void refreshGroupConfiguredTranslationCache(newGroup._id, toObjectId(String(newGroup.hotel))).catch((error) => {
    logger.error('Failed to preload configured translation cache for duplicated group', error);
  });
  return newGroup.populate(groupPopulate);
};
