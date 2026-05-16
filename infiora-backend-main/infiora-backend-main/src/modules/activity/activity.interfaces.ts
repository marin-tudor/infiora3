import { Model, Document, ObjectId } from 'mongoose';
import { QueryResult } from '../paginate/paginate';
import { IUser } from '../user/user.interfaces';

export interface IActivity {
  user: ObjectId | IUser;
  hotel: any;
  action: 'view' | 'tap';
  details?: any;
  createdAt: string;
  updatedAt: string;
}

export interface IActivityDoc extends IActivity, Document {}

export interface IActivityModel extends Model<IActivityDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type UpdateActivityBody = Partial<IActivity>;

export type NewCreatedActivity = Omit<IActivity, 'user' | 'createdAt'>;
