import { Model, Document, ObjectId } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export type MaintenanceIssueType = string;

export type MaintenanceStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';

export interface IMaintenanceIssue {
  hotel: ObjectId;
  room: ObjectId;
  roomNumber?: string;
  type: MaintenanceIssueType;
  typeLabel?: string;
  description: string;
  photo?: string;
  photoHash?: string;
  guestRoomNumber?: string;
  reservationCode?: string;
  reservationCodeStatus?: 'not_provided' | 'matched' | 'unmatched';
  status: MaintenanceStatus;
  guestStatusTokenHash?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IMaintenanceIssueDoc extends IMaintenanceIssue, Document {}

export interface IMaintenanceIssueModel extends Model<IMaintenanceIssueDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type NewMaintenanceIssue = Omit<IMaintenanceIssue, 'status'>;
