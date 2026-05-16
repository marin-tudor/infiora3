import mongoose, { Schema } from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IBookingDoc, IBookingModel } from './booking.interfaces';

const bookingSchema = new Schema<IBookingDoc, IBookingModel>(
  {
    bookingRef: { type: String, unique: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    guestEmail: { type: String, required: true },
    guestRoomNumber: { type: String, required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CatalogItem', required: true },
    resourceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceResource' }],
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    partySize: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
      default: 'pending',
    },
    payment: { type: String, enum: ['room', 'cash', 'card', 'online'], required: true },
    total: { type: Number, default: 0 },
    discountCode: { type: String, default: null },
    discountAmount: { type: Number, default: null },
    originalTotal: { type: Number, default: null },
    idempotencyKey: { type: String, default: null },
    stripePaymentIntentId: { type: String, default: null, index: true, sparse: true },
    guestCheckoutId: { type: String, default: null, index: true, sparse: true },
    stripeStatus: { type: String, enum: ['pending', 'succeeded', 'failed', null], default: null },
    paidAt: { type: Date, default: null },
    note: { type: String, default: '' },
    staffNote: { type: String, default: '' },
    staffMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'StaffMember', default: null },
    language: { type: String, default: 'en' },
    rating: { type: Number, min: 1, max: 5, default: null },
    ratingComment: { type: String, default: null },
    guestCancelTokenHash: { type: String, default: null, select: false },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: String, enum: ['guest', 'staff', null], default: null },
    assignedResourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceResource',
      default: null,
    },
    selectedAddons: {
      type: [
        {
          addonId: { type: String },
          name: { type: String },
          price: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

bookingSchema.index({ hotelId: 1, roomId: 1, startTime: 1 });
bookingSchema.index({ hotelId: 1, itemId: 1, startTime: 1 });
bookingSchema.index({ hotelId: 1, status: 1, startTime: 1 });
bookingSchema.index({ hotelId: 1, createdAt: -1 });
bookingSchema.index({ hotelId: 1, status: 1, createdAt: -1 });
bookingSchema.index({ hotelId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });

bookingSchema.plugin(toJSON);
bookingSchema.plugin(paginate);

export default mongoose.model<IBookingDoc, IBookingModel>('Booking', bookingSchema);
