import { Model, Document, ObjectId } from 'mongoose';
import { QueryResult } from '../paginate/paginate';
import { IUser } from '../user/user.interfaces';

export interface ITicket {
  user: ObjectId | IUser;
  category?: string;
  subject: string;
  message: string;
  status?: string;
}

export interface ITicketDoc extends ITicket, Document {}

export interface ITicketModel extends Model<ITicketDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type UpdateTicketBody = Partial<ITicket>;

export type NewCreatedTicket = Omit<ITicket, 'user' | 'status'>;
