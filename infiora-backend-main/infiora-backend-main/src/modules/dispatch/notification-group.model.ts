import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { INotificationGroupDoc, INotificationGroupModel } from './dispatch.interfaces';

const notificationGroupSchema = new mongoose.Schema<INotificationGroupDoc, INotificationGroupModel>(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Hotel' },
    name: { type: String, required: true, trim: true },
    emailAddresses: { type: [String], default: [] },
    sseEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

notificationGroupSchema.index({ hotelId: 1 });
notificationGroupSchema.plugin(toJSON);
notificationGroupSchema.plugin(paginate);

const NotificationGroup = mongoose.model<INotificationGroupDoc, INotificationGroupModel>(
  'NotificationGroup',
  notificationGroupSchema
);
export default NotificationGroup;
