import express, { Router } from 'express';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import { ticketController, ticketValidation } from '../../modules/ticket';

const router: Router = express.Router();

router
  .route('/')
  .post(auth(), validate(ticketValidation.createTicket), ticketController.createTicket)
  .get(auth('getTickets'), validate(ticketValidation.getTickets), ticketController.getTickets);

router
  .route('/:ticketId')
  .get(auth('getTickets'), validate(ticketValidation.getTicket), ticketController.getTicket)
  .patch(auth('manageTickets'), validate(ticketValidation.updateTicket), ticketController.updateTicket)
  .delete(auth('manageTickets'), validate(ticketValidation.deleteTicket), ticketController.deleteTicket);

export default router;
