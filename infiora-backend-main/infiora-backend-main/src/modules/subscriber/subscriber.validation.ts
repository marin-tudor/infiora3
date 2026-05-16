import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { NewCreatedSubscriber } from './subscriber.interfaces';

const createSubscriberBody: Record<keyof NewCreatedSubscriber, any> = {
  user: Joi.forbidden(),
  room: Joi.required().custom(objectId),
  email: Joi.string().trim().email().required().max(320),
};

export const createSubscriber = {
  body: Joi.object().keys(createSubscriberBody),
};

export const getSubscribers = {
  query: Joi.object().keys({
    user: Joi.custom(objectId),
    room: Joi.custom(objectId),
    startDate: Joi.string(),
    endDate: Joi.string(),
    search: Joi.string(),
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const getSubscriber = {
  params: Joi.object().keys({
    subscriberId: Joi.required().custom(objectId),
  }),
};

export const updateSubscriber = {
  params: Joi.object().keys({
    subscriberId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    user: Joi.custom(objectId),
    room: Joi.custom(objectId),
    email: Joi.string().trim().email().max(320),
  }),
};

export const deleteSubscriber = {
  params: Joi.object().keys({
    subscriberId: Joi.required().custom(objectId),
  }),
};

export const exportSubscribers = {
  query: Joi.object().keys({
    user: Joi.custom(objectId),
    room: Joi.custom(objectId),
    search: Joi.string(),
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};
