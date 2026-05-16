import { Model, Document, ObjectId } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export interface ISubscriber {
  room: ObjectId;
  user: ObjectId;
  email: string;
}

export interface ISubscriberDoc extends ISubscriber, Document {}

export interface ISubscriberModel extends Model<ISubscriberDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type UpdateSubscriberBody = Partial<ISubscriber>;

export type NewCreatedSubscriber = ISubscriber;
