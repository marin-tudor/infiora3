import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IReservationCodeDoc, IReservationCodeModel, ICAL_PLATFORMS } from './orders.interfaces';

const reservationCodeSchema = new mongoose.Schema<IReservationCodeDoc, IReservationCodeModel>(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Hotel' },
    roomId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Room' },
    roomNumber: { type: String, default: '' },
    code: { type: String, required: true, trim: true },
    guestName: { type: String, default: '' },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'User', default: null },
    source: {
      type: String,
      enum: ['manual', ...ICAL_PLATFORMS],
      default: 'manual',
    },
    externalUid: { type: String, default: null },
  },
  { timestamps: true }
);

reservationCodeSchema.pre('save', function (next) {
  if (this.code) {
    this.code = this.code.trim().toUpperCase().replace(/\s/g, '');
  }
  next();
});

reservationCodeSchema.index({ hotelId: 1, roomId: 1 });
reservationCodeSchema.index({ hotelId: 1, code: 1 });
reservationCodeSchema.index(
  { hotelId: 1, roomId: 1, code: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);
// Dedup index for iCal sync — unique per (hotelId, externalUid) when externalUid is set
reservationCodeSchema.index(
  { hotelId: 1, externalUid: 1 },
  { unique: true, partialFilterExpression: { externalUid: { $type: 'string' } } }
);

reservationCodeSchema.plugin(toJSON);
reservationCodeSchema.plugin(paginate);

const ReservationCode = mongoose.model<IReservationCodeDoc, IReservationCodeModel>('ReservationCode', reservationCodeSchema);
export default ReservationCode;
