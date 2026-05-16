import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IMaintenanceIssueDoc, IMaintenanceIssueModel } from './maintenance.interfaces';

const maintenanceSchema = new mongoose.Schema<IMaintenanceIssueDoc, IMaintenanceIssueModel>(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Hotel' },
    room: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Room' },
    roomNumber: { type: String },
    type: {
      type: String,
      required: true,
    },
    typeLabel: { type: String },
    description: { type: String, required: true },
    photo: { type: String },
    photoHash: { type: String },
    guestRoomNumber: { type: String },
    reservationCode: { type: String },
    reservationCodeStatus: {
      type: String,
      enum: ['not_provided', 'matched', 'unmatched'],
      default: 'not_provided',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'done', 'cancelled'],
      default: 'pending',
    },
    guestStatusTokenHash: {
      type: String,
      default: null,
      select: false,
    },
  },
  { timestamps: true }
);

maintenanceSchema.plugin(toJSON);
maintenanceSchema.plugin(paginate);
maintenanceSchema.index({ hotel: 1, status: 1, createdAt: -1 });
maintenanceSchema.index({ hotel: 1, type: 1, description: 1, guestRoomNumber: 1, photoHash: 1, createdAt: -1 });

const MaintenanceIssue = mongoose.model<IMaintenanceIssueDoc, IMaintenanceIssueModel>('MaintenanceIssue', maintenanceSchema);

export default MaintenanceIssue;
