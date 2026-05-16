import mongoose, { Schema } from 'mongoose';

interface IBookingCounter {
  key: string;
  seq: number;
}

type IBookingCounterDoc = IBookingCounter & mongoose.Document;

const bookingCounterSchema = new Schema<IBookingCounterDoc>(
  {
    key: { type: String, required: true, unique: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IBookingCounterDoc>('BookingCounter', bookingCounterSchema);
