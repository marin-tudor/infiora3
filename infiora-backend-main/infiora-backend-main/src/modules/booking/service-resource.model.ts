import mongoose, { Schema } from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IServiceResourceDoc, IServiceResourceModel } from './booking.interfaces';

const serviceResourceSchema = new Schema<IServiceResourceDoc, IServiceResourceModel>(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['room', 'equipment', 'staff_member', 'vehicle'], required: true },
    capacity: { type: Number, default: 1 },
    identifier: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceResourceSchema.plugin(toJSON);
serviceResourceSchema.plugin(paginate);

export default mongoose.model<IServiceResourceDoc, IServiceResourceModel>('ServiceResource', serviceResourceSchema);
