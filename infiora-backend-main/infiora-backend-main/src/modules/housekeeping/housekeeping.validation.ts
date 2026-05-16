import Joi from 'joi';
import { objectId } from '../validate/custom.validation';

export const createRequest = {
  body: Joi.object().keys({
    room: Joi.required().custom(objectId),
    type: Joi.string().trim().max(80).required(),
    typeLabel: Joi.string().trim().max(120).allow('', null),
    note: Joi.string().trim().max(2000).allow('', null),
    guestRoomNumber: Joi.string().trim().max(20).allow('', null),
    reservationCode: Joi.string().trim().max(64).allow('', null),
  }),
};

export const getRequests = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
  }),
  query: Joi.object().keys({
    status: Joi.string().valid('pending', 'in_progress', 'done', 'cancelled'),
    room: Joi.custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1).max(100),
    page: Joi.number().integer().min(1),
  }),
};

export const updateStatus = {
  params: Joi.object().keys({
    requestId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    status: Joi.string().valid('pending', 'in_progress', 'done', 'cancelled').required(),
  }),
};

export const getPendingCount = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
  }),
};

export const getGuestRequestStatus = {
  params: Joi.object().keys({
    requestId: Joi.required().custom(objectId),
  }),
};
