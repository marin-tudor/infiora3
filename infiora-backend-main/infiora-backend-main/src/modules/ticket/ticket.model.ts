import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { ITicketDoc, ITicketModel } from './ticket.interfaces';

const ticketSchema = new mongoose.Schema<ITicketDoc, ITicketModel>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    category: {
      type: String,
      enum: ['general', 'feature'],
      default: 'general',
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['opened', 'closed', 'resolved'],
      default: 'opened',
    },
  },
  {
    timestamps: true,
  }
);

// Add plugins to the schema
ticketSchema.plugin(toJSON);
ticketSchema.plugin(paginate);

// Create the model
const Ticket = mongoose.model<ITicketDoc, ITicketModel>('Ticket', ticketSchema);

export default Ticket;
