import { Model, Document } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export interface IBatch {
  name?: string;
  description?: string;
}

export interface IBatchDoc extends IBatch, Document {}

export interface IBatchModel extends Model<IBatchDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type UpdateBatchBody = Partial<IBatch>;

export type NewCreatedBatch = IBatch & {
  quantity: number;
};
