import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import * as ticketService from './ticket.service';
import { pick } from '../utils';
import { IOptions } from '../paginate/paginate';
import { emailService } from '../email';

export const createTicket = catchAsync(async (req: Request, res: Response) => {
  const ticket = await ticketService.createTicket({ user: req.user.id, ...req.body });
  await emailService.sendTicketEmail(ticket);
  res.status(httpStatus.CREATED).send(ticket);
});

export const getTickets = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['user']);
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const result = await ticketService.queryTickets(filter, options);
  res.send(result);
});

export const getTicket = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['ticketId'] === 'string') {
    const ticket = await ticketService.getTicketById(new mongoose.Types.ObjectId(req.params['ticketId']));
    if (!ticket) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
    }
    res.send(ticket);
  }
});

export const updateTicket = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['ticketId'] === 'string') {
    const ticket = await ticketService.updateTicketById(new mongoose.Types.ObjectId(req.params['ticketId']), req.body);
    res.send(ticket);
  }
});

export const deleteTicket = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['ticketId'] === 'string') {
    await ticketService.deleteTicketById(new mongoose.Types.ObjectId(req.params['ticketId']));
    res.status(httpStatus.NO_CONTENT).send();
  }
});
