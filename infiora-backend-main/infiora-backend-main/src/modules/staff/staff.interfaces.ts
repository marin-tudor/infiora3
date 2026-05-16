import mongoose, { Document, Model } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export type StaffPermission =
  | 'orders:view'
  | 'orders:accept'
  | 'orders:complete'
  | 'orders:cancel'
  | 'bookings:view'
  | 'bookings:confirm'
  | 'bookings:cancel'
  | 'housekeeping:view'
  | 'housekeeping:manage'
  | 'maintenance:view'
  | 'maintenance:manage'
  | 'catalog:view'
  | 'catalog:manage'
  | 'staff:view'
  | 'staff:manage'
  | 'analytics:view'
  | 'settings:manage';

export const ALL_PERMISSIONS: StaffPermission[] = [
  'orders:view',
  'orders:accept',
  'orders:complete',
  'orders:cancel',
  'bookings:view',
  'bookings:confirm',
  'bookings:cancel',
  'housekeeping:view',
  'housekeeping:manage',
  'maintenance:view',
  'maintenance:manage',
  'catalog:view',
  'catalog:manage',
  'staff:view',
  'staff:manage',
  'analytics:view',
  'settings:manage',
];

export interface IStaffRole {
  hotelId: mongoose.Types.ObjectId | null;
  name: string;
  permissions: StaffPermission[];
  visibleModules: string[];
  isTemplate: boolean;
}

export interface IStaffRoleDoc extends IStaffRole, Document {}

export interface IStaffRoleModel extends Model<IStaffRoleDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export interface IStaffMember {
  hotelId: mongoose.Types.ObjectId;
  name: string;
  pin: string;
  roleId: mongoose.Types.ObjectId;
  groupIds: mongoose.Types.ObjectId[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
}

export interface IStaffMemberDoc extends IStaffMember, Document {
  isPinMatch(pin: string): Promise<boolean>;
}

export interface IStaffMemberModel extends Model<IStaffMemberDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type NewStaffRole = Pick<IStaffRole, 'name' | 'permissions' | 'visibleModules'>;
export type UpdateStaffRole = Partial<NewStaffRole>;
export type NewStaffMember = Pick<IStaffMember, 'name' | 'pin' | 'roleId' | 'groupIds'> & {
  isActive?: boolean;
};
export type UpdateStaffMember = Partial<Pick<IStaffMember, 'name' | 'roleId' | 'groupIds' | 'isActive'>> & { pin?: string };

export interface IStaffSessionPayload {
  staffMemberId: string;
  name: string;
  permissions: StaffPermission[];
  groupIds: string[];
  visibleModules: string[];
  token: string; // short-lived JWT stored in tablet memory
}
