import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { NewCreatedTicket } from './ticket.interfaces';

const createTicketBody: Record<keyof NewCreatedTicket, any> = {
  category: Joi.string(),
  subject: Joi.string(),
  message: Joi.string(),
};

export const createTicket = {
  body: Joi.object().keys(createTicketBody),
};

export const getTickets = {
  query: Joi.object().keys({
    user: Joi.custom(objectId),
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const getTicket = {
  params: Joi.object().keys({
    ticketId: Joi.required().custom(objectId),
  }),
};

export const updateTicket = {
  params: Joi.object().keys({
    ticketId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    status: Joi.string(),
  }),
};

export const deleteTicket = {
  params: Joi.object().keys({
    ticketId: Joi.required().custom(objectId),
  }),
};
