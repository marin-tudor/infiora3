// src/modules/orders/ical-source.model.ts
import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import { IICalSourceDoc, IICalSourceModel, ICAL_PLATFORMS } from './orders.interfaces';

const icalSourceSchema = new mongoose.Schema<IICalSourceDoc, IICalSourceModel>(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Hotel' },
    platform: {
      type: String,
      enum: [...ICAL_PLATFORMS],
      required: true,
    },
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    lastSyncAt: { type: Date, default: null },
    lastSyncStatus: { type: String, enum: ['success', 'error', null], default: null },
    lastSyncError: { type: String, default: null },
  },
  { timestamps: true }
);

icalSourceSchema.index({ hotelId: 1 });
icalSourceSchema.plugin(toJSON);

const ICalSource = mongoose.model<IICalSourceDoc, IICalSourceModel>('ICalSource', icalSourceSchema);
export default ICalSource;
