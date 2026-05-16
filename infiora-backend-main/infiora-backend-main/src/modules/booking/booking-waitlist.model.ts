import mongoose, { Schema } from 'mongoose';
import toJSON from '../toJSON/toJSON';
import { IBookingWaitlistDoc, IBookingWaitlistModel } from './booking.interfaces';

const bookingWaitlistSchema = new Schema<IBookingWaitlistDoc, IBookingWaitlistModel>(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CatalogItem', required: true },
    slotStartTime: { type: Date, required: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    guestEmail: { type: String, required: true },
    guestRoomNumber: { type: String, required: true },
    partySize: { type: Number, required: true, min: 1 },
    notifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

bookingWaitlistSchema.index({ hotelId: 1, itemId: 1, slotStartTime: 1, notifiedAt: 1 });

bookingWaitlistSchema.plugin(toJSON);

export default mongoose.model<IBookingWaitlistDoc, IBookingWaitlistModel>('BookingWaitlist', bookingWaitlistSchema);
