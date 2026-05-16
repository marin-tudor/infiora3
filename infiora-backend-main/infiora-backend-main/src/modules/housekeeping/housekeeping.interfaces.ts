import { Model, Document, ObjectId } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export type HousekeepingRequestType = string;

export type HousekeepingStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';

export interface IHousekeepingRequest {
  hotel: ObjectId;
  room: ObjectId;
  roomNumber?: string;
  type: HousekeepingRequestType;
  typeLabel?: string;
  note?: string;
  guestRoomNumber?: string;
  reservationCode?: string;
  reservationCodeStatus?: 'not_provided' | 'matched' | 'unmatched';
  status: HousekeepingStatus;
  guestStatusTokenHash?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IHousekeepingRequestDoc extends IHousekeepingRequest, Document {}

export interface IHousekeepingRequestModel extends Model<IHousekeepingRequestDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type NewHousekeepingRequest = Omit<IHousekeepingRequest, 'status'>;
