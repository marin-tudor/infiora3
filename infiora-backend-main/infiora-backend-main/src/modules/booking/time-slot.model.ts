import mongoose, { Schema } from 'mongoose';
import toJSON from '../toJSON/toJSON';
import { ITimeSlotDoc, ITimeSlotModel } from './booking.interfaces';

const timeSlotSchema = new Schema<ITimeSlotDoc, ITimeSlotModel>(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CatalogItem', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    maxPersons: { type: Number, required: true },
    bookedPersons: { type: Number, default: 0 },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound unique index — nightly upsert ($setOnInsert) is idempotent
timeSlotSchema.index({ itemId: 1, startTime: 1 }, { unique: true });

timeSlotSchema.plugin(toJSON);

export default mongoose.model<ITimeSlotDoc, ITimeSlotModel>('TimeSlot', timeSlotSchema);
