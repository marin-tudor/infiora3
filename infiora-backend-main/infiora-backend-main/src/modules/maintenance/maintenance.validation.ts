import Joi from 'joi';
import { objectId } from '../validate/custom.validation';

export const createIssue = {
  body: Joi.object().keys({
    room: Joi.required().custom(objectId),
    type: Joi.string().trim().max(80).required(),
    typeLabel: Joi.string().trim().max(120).allow('', null),
    description: Joi.string().trim().max(2000).required(),
    guestRoomNumber: Joi.string().trim().max(20).allow('', null),
    reservationCode: Joi.string().trim().max(64).allow('', null),
  }),
};

export const getIssues = {
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
    issueId: Joi.required().custom(objectId),
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

export const getGuestIssueStatus = {
  params: Joi.object().keys({
    issueId: Joi.required().custom(objectId),
  }),
};
