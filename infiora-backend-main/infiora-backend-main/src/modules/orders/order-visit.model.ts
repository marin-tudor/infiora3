import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';

const orderVisitSchema = new mongoose.Schema(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Hotel' },
    roomId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Room' },
    visitorId: { type: String, required: true },
    language: { type: String, default: '' },
    converted: { type: Boolean, default: false },
    convertedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

orderVisitSchema.index({ hotelId: 1, createdAt: -1 });
orderVisitSchema.index({ hotelId: 1, visitorId: 1 });
orderVisitSchema.index({ hotelId: 1, roomId: 1, createdAt: -1 });
orderVisitSchema.index({ hotelId: 1, createdAt: -1, converted: 1 });

orderVisitSchema.plugin(toJSON);

const OrderVisit = mongoose.model('OrderVisit', orderVisitSchema);
export default OrderVisit;
