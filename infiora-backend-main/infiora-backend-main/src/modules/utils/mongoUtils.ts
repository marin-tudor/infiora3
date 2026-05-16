import mongoose from 'mongoose';
import httpStatus from 'http-status';
import ApiError from '../errors/ApiError';

// eslint-disable-next-line import/prefer-default-export
export const toObjectId = (id?: string): mongoose.Types.ObjectId => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid ID format');
  }
  return new mongoose.Types.ObjectId(id);
};
