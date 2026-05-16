import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { ALL_PERMISSIONS, IStaffRoleDoc, IStaffRoleModel } from './staff.interfaces';

const staffRoleSchema = new mongoose.Schema<IStaffRoleDoc, IStaffRoleModel>(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      default: null,
    },
    name: { type: String, required: true, trim: true },
    permissions: { type: [String], enum: ALL_PERMISSIONS, default: [] },
    visibleModules: { type: [String], default: [] },
    isTemplate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

staffRoleSchema.plugin(toJSON);
staffRoleSchema.plugin(paginate);

const StaffRole = mongoose.model<IStaffRoleDoc, IStaffRoleModel>('StaffRole', staffRoleSchema);
export default StaffRole;
