import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Ticket from './ticket.model';
import ApiError from '../errors/ApiError';
import { NewCreatedTicket, UpdateTicketBody, ITicketDoc } from './ticket.interfaces';
import { IOptions, QueryResult } from '../paginate/paginate';

const populate = [
  {
    path: 'user',
  },
];

/**
 * Create a ticket
 * @param {NewCreatedTicket} ticketBody
 * @returns {Promise<ITicketDoc>}
 */
export const createTicket = async (ticketBody: NewCreatedTicket): Promise<ITicketDoc> => {
  return Ticket.create(ticketBody).then((t) => t.populate(populate));
};

/**
 * Query for tickets
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryTickets = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  const tickets = await Ticket.paginate(filter, { ...options, populate: 'user' });
  return tickets;
};

/**
 * Get ticket by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<ITicketDoc | null>}
 */
export const getTicketById = async (id: mongoose.Types.ObjectId): Promise<ITicketDoc | null> =>
  Ticket.findById(id).populate(populate);

/**
 * Update ticket by id
 * @param {mongoose.Types.ObjectId} ticketId
 * @param {UpdateTicketBody} updateBody
 * @returns {Promise<ITicketDoc | null>}
 */
export const updateTicketById = async (
  ticketId: mongoose.Types.ObjectId,
  updateBody: UpdateTicketBody
): Promise<ITicketDoc | null> => {
  const ticket = await getTicketById(ticketId);
  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  }

  Object.assign(ticket, updateBody);
  await ticket.save().then((t) => t.populate(populate));
  return ticket;
};

/**
 * Delete ticket by id
 * @param {mongoose.Types.ObjectId} ticketId
 * @returns {Promise<ITicketDoc | null>}
 */
export const deleteTicketById = async (ticketId: mongoose.Types.ObjectId): Promise<ITicketDoc | null> => {
  const ticket = await getTicketById(ticketId);
  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  }
  await ticket.deleteOne();
  return ticket;
};
