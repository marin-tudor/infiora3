import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { json2csv } from 'json-2-csv';
import Tag from './tag.model';
import ApiError from '../errors/ApiError';
import { NewCreatedTag, UpdateTagBody, ITagDoc } from './tag.interfaces';
import { IOptions, QueryResult } from '../paginate/paginate';

/**
 * Query for tags
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryTags = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  const tags = await Tag.paginate(filter, options);
  return tags;
};

/**
 * Get tag by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<ITagDoc | null>}
 */
export const getTagById = async (id: mongoose.Types.ObjectId): Promise<ITagDoc | null> => Tag.findById(id);

/**
 * Create a tag
 * @param {NewCreatedTag} tagBody
 * @returns {Promise<ITagDoc>}
 */
export const createTag = async (tagBody: NewCreatedTag): Promise<ITagDoc> => {
  return Tag.create(tagBody);
};

/**
 * Update tag by id
 * @param {mongoose.Types.ObjectId} tagId
 * @param {UpdateTagBody} updateBody
 * @returns {Promise<ITagDoc | null>}
 */
export const updateTagById = async (tagId: mongoose.Types.ObjectId, updateBody: UpdateTagBody): Promise<ITagDoc | null> => {
  const tag = await getTagById(tagId);
  if (!tag) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tag not found');
  }
  Object.assign(tag, updateBody);
  await tag.save();
  return tag;
};

/**
 * Delete tag by id
 * @param {mongoose.Types.ObjectId} tagId
 * @returns {Promise<ITagDoc | null>}
 */
export const deleteTagById = async (tagId: mongoose.Types.ObjectId): Promise<ITagDoc | null> => {
  const tag = await getTagById(tagId);
  if (!tag) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tag not found');
  }
  await tag.deleteOne();
  return tag;
};

/**
 * Link tag by id
 * @param {mongoose.Types.ObjectId} tagId
 * @param {any} body
 * @returns {Promise<ITagDoc | null>}
 */
export const linkTagById = async (tagId: mongoose.Types.ObjectId, body: any): Promise<ITagDoc | null> => {
  const tag = await getTagById(tagId);
  if (!tag) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tag not found');
  }
  if (tag.room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'This device is already activated.');
  }
  if (!tag.isActive) {
    throw new ApiError(httpStatus.NOT_FOUND, 'This device is not enabled.');
  }
  Object.assign(tag, body);
  await tag.save();
  return tag;
};

/**
 * Unlink tag by id
 * @param {mongoose.Types.ObjectId} tagId
 * @returns {Promise<ITagDoc | null>}
 */
export const unlinkTagById = async (tagId: mongoose.Types.ObjectId): Promise<ITagDoc | null> => {
  return Tag.findByIdAndUpdate(tagId, { $unset: { user: 1 } });
};

/**
 * Export tags in csv
 * @param {Object} filter - Mongo filter
 * @returns {Promise<string | null>}
 */
export const exportTags = async (filter: Record<string, any>): Promise<any> => {
  const tags = await Tag.find(filter, { url: 1 });
  const tagsWithUrls = tags.map((tag) => ({ url: tag.toObject({ virtuals: true }).url }));
  const csvData = json2csv(tagsWithUrls);

  return csvData;
};
