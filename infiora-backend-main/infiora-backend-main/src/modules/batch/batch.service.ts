import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Batch from './batch.model';
import ApiError from '../errors/ApiError';
import { NewCreatedBatch, UpdateBatchBody, IBatchDoc } from './batch.interfaces';
import { IOptions, QueryResult } from '../paginate/paginate';
import Tag from '../tag/tag.model';

/**
 * Query for batches
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryBatches = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  const batches = await Batch.paginate(filter, options);
  return batches;
};

/**
 * Get batch by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IBatchDoc | null>}
 */
export const getBatchById = async (id: mongoose.Types.ObjectId): Promise<IBatchDoc | null> => Batch.findById(id);

/**
 * Create a batch
 * @param {NewCreatedBatch} batchBody
 * @returns {Promise<IBatchDoc>}
 */
export const createBatch = async (batchBody: NewCreatedBatch): Promise<IBatchDoc> => {
  const batch = await Batch.create(batchBody);
  const arr = [];
  for (let i = 0; i < batchBody.quantity; i += 1) {
    arr.push({ batch });
  }
  if (arr.length > 0) {
    await Tag.insertMany(arr);
  }
  return batch;
};

/**
 * Update batch by id
 * @param {mongoose.Types.ObjectId} batchId
 * @param {UpdateBatchBody} updateBody
 * @returns {Promise<IBatchDoc | null>}
 */
export const updateBatchById = async (
  batchId: mongoose.Types.ObjectId,
  updateBody: UpdateBatchBody
): Promise<IBatchDoc | null> => {
  const batch = await getBatchById(batchId);
  if (!batch) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Batch not found');
  }

  Object.assign(batch, updateBody);
  await batch.save();
  return batch;
};

/**
 * Delete batch by id
 * @param {mongoose.Types.ObjectId} batchId
 * @returns {Promise<IBatchDoc | null>}
 */
export const deleteBatchById = async (batchId: mongoose.Types.ObjectId): Promise<IBatchDoc | null> => {
  const batch = await getBatchById(batchId);
  if (!batch) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Batch not found');
  }
  await batch.deleteOne();
  return batch;
};
