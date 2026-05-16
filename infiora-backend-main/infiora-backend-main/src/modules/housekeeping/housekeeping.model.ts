import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IHousekeepingRequestDoc, IHousekeepingRequestModel } from './housekeeping.interfaces';

const housekeepingSchema = new mongoose.Schema<IHousekeepingRequestDoc, IHousekeepingRequestModel>(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Hotel' },
    room: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Room' },
    roomNumber: { type: String },
    type: {
      type: String,
      required: true,
    },
    typeLabel: { type: String },
    note: { type: String },
    guestRoomNumber: { type: String },
    reservationCode: { type: String },
    reservationCodeStatus: {
      type: String,
      enum: ['not_provided', 'matched', 'unmatched'],
      default: 'not_provided',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'done', 'cancelled'],
      default: 'pending',
    },
    guestStatusTokenHash: {
      type: String,
      default: null,
      select: false,
    },
  },
  { timestamps: true }
);

housekeepingSchema.plugin(toJSON);
housekeepingSchema.plugin(paginate);
housekeepingSchema.index({ hotel: 1, status: 1, createdAt: -1 });
housekeepingSchema.index({ hotel: 1, type: 1, note: 1, guestRoomNumber: 1, createdAt: -1 });

const HousekeepingRequest = mongoose.model<IHousekeepingRequestDoc, IHousekeepingRequestModel>(
  'HousekeepingRequest',
  housekeepingSchema
);

export default HousekeepingRequest;
