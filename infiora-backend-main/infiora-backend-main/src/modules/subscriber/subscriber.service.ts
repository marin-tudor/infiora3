import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Subscriber from './subscriber.model';
import ApiError from '../errors/ApiError';
import { NewCreatedSubscriber, UpdateSubscriberBody, ISubscriberDoc } from './subscriber.interfaces';
import { IOptions, QueryResult } from '../paginate/paginate';
import Room from '../room/room.model';

/**
 * Query for subscribers
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const querySubscribers = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  const subscribers = await Subscriber.paginate(filter, options);
  return subscribers;
};

/**
 * Get subscriber by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<ISubscriberDoc | null>}
 */
export const getSubscriberById = async (id: mongoose.Types.ObjectId): Promise<ISubscriberDoc | null> =>
  Subscriber.findById(id);

/**
 * Create a subscriber
 * @param {NewCreatedSubscriber} subscriberBody
 * @returns {Promise<ISubscriberDoc>}
 */
export const createSubscriber = async (subscriberBody: NewCreatedSubscriber): Promise<ISubscriberDoc> => {
  const room = await Room.findById(subscriberBody.room).populate('hotel').select('hotel');
  const hotel = (room as any)?.hotel;

  if (!room || !hotel?.user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
  }

  const normalizedEmail = subscriberBody.email.trim().toLowerCase();
  const existing = await Subscriber.findOne({
    room: room._id,
    user: hotel.user,
    email: normalizedEmail,
  });

  if (existing) {
    return existing;
  }

  try {
    return await Subscriber.create({
      room: room._id,
      user: hotel.user,
      email: normalizedEmail,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      const concurrentExisting = await Subscriber.findOne({
        room: room._id,
        user: hotel.user,
        email: normalizedEmail,
      });

      if (concurrentExisting) {
        return concurrentExisting;
      }
    }

    throw error;
  }
};

/**
 * Update subscriber by id
 * @param {mongoose.Types.ObjectId} subscriberId
 * @param {UpdateSubscriberBody} subscriberBody
 * @param {Express.Multer.File | undefined} file
 * @returns {Promise<ISubscriberDoc | null>}
 */
export const updateSubscriberById = async (
  subscriberId: mongoose.Types.ObjectId,
  subscriberBody: UpdateSubscriberBody
): Promise<ISubscriberDoc | null> => {
  const body = { ...subscriberBody };
  const subscriber = await getSubscriberById(subscriberId);
  if (!subscriber) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Subscriber not found');
  }
  Object.assign(subscriber, body);
  await subscriber.save();
  return subscriber;
};

/**
 * Delete subscriber by id
 * @param {mongoose.Types.ObjectId} subscriberId
 * @returns {Promise<ISubscriberDoc | null>}
 */
export const deleteSubscriberById = async (subscriberId: mongoose.Types.ObjectId): Promise<ISubscriberDoc | null> => {
  const subscriber = await getSubscriberById(subscriberId);
  if (!subscriber) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Subscriber not found');
  }
  await subscriber.deleteOne();
  return subscriber;
};
