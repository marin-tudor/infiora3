import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { ISubscriberDoc, ISubscriberModel } from './subscriber.interfaces';

const subscriberSchema = new mongoose.Schema<ISubscriberDoc, ISubscriberModel>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Room',
    },
    email: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

subscriberSchema.index({ user: 1, room: 1, email: 1 }, { unique: true });

// Add plugins to the schema
subscriberSchema.plugin(toJSON);
subscriberSchema.plugin(paginate);

// Create the model
const Subscriber = mongoose.model<ISubscriberDoc, ISubscriberModel>('Subscriber', subscriberSchema);

export default Subscriber;
