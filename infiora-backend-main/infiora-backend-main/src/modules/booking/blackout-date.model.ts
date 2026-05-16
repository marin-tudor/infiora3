import mongoose, { Schema, Document } from 'mongoose';
import toJSON from '../toJSON/toJSON';

export interface IBlackoutDate {
  hotelId: mongoose.Types.ObjectId;
  itemId?: mongoose.Types.ObjectId | null;
  date: string;
  reason?: string;
  createdBy?: mongoose.Types.ObjectId;
}
export interface IBlackoutDateDoc extends IBlackoutDate, Document {}

const blackoutDateSchema = new Schema<IBlackoutDateDoc>(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CatalogItem', default: null },
    date: { type: String, required: true },
    reason: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

blackoutDateSchema.index({ hotelId: 1, date: 1 });
blackoutDateSchema.plugin(toJSON);

export default mongoose.model<IBlackoutDateDoc>('BlackoutDate', blackoutDateSchema);
