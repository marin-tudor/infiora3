import mongoose, { Document, Model } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export interface IServiceResource {
  hotelId: mongoose.Types.ObjectId;
  name: string;
  type: 'room' | 'equipment' | 'staff_member' | 'vehicle';
  capacity: number;
  identifier?: string;
  isActive: boolean;
}
export interface IServiceResourceDoc extends IServiceResource, Document {}
export interface IServiceResourceModel extends Model<IServiceResourceDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export interface ITimeSlot {
  itemId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date;
  maxPersons: number;
  bookedPersons: number;
  isBlocked: boolean;
}
export interface ITimeSlotDoc extends ITimeSlot, Document {}
export interface ITimeSlotModel extends Model<ITimeSlotDoc> {}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type BookingPaymentMethod = 'room' | 'cash' | 'card' | 'online';

export interface IBooking {
  bookingRef: string;
  hotelId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  guestEmail: string;
  guestRoomNumber: string;
  itemId: mongoose.Types.ObjectId;
  resourceIds: mongoose.Types.ObjectId[];
  startTime: Date;
  endTime: Date;
  partySize: number;
  status: BookingStatus;
  payment: BookingPaymentMethod;
  total: number;
  discountCode?: string | null;
  discountAmount?: number | null;
  originalTotal?: number | null;
  idempotencyKey?: string | null;
  note?: string;
  staffNote?: string;
  staffMemberId?: mongoose.Types.ObjectId | null;
  language?: string;
  rating?: number | null;
  ratingComment?: string | null;
  guestCancelTokenHash?: string | null;
  cancelledAt?: Date | null;
  cancelledBy?: 'guest' | 'staff' | null;
  assignedResourceId?: mongoose.Types.ObjectId | null;
  selectedAddons: { addonId: string; name: string; price: number }[];
  stripePaymentIntentId?: string | null;
  guestCheckoutId?: string | null;
  stripeStatus?: 'pending' | 'succeeded' | 'failed' | null;
  paidAt?: Date | null;
}
export interface IBookingDoc extends IBooking, Document {}
export interface IBookingModel extends Model<IBookingDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export interface IBookingWaitlist {
  itemId: mongoose.Types.ObjectId;
  slotStartTime: Date;
  hotelId: mongoose.Types.ObjectId;
  guestEmail: string;
  guestRoomNumber: string;
  partySize: number;
  notifiedAt?: Date | null;
}
export interface IBookingWaitlistDoc extends IBookingWaitlist, Document {}
export interface IBookingWaitlistModel extends Model<IBookingWaitlistDoc> {}

export interface IHotelBookingSettings {
  emails: string[];
}
