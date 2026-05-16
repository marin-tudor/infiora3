import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IActivityDoc, IActivityModel } from './activity.interfaces';

const activitySchema = new mongoose.Schema<IActivityDoc, IActivityModel>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Hotel',
    },
    action: {
      type: String,
      required: true,
      enum: ['view', 'tap'],
    },
    details: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

// Add plugins to the schema
activitySchema.plugin(toJSON);
activitySchema.plugin(paginate);

// GDPR storage limitation — auto-delete after 2 years
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });
// Compound indexes for insight query performance
activitySchema.index({ hotel: 1, createdAt: -1 });
activitySchema.index({ user: 1, hotel: 1, createdAt: -1 });

// Create the model
const Activity = mongoose.model<IActivityDoc, IActivityModel>('Activity', activitySchema);

export default Activity;
