import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IStaffMemberDoc, IStaffMemberModel } from './staff.interfaces';

const staffMemberSchema = new mongoose.Schema<IStaffMemberDoc, IStaffMemberModel>(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Hotel' },
    name: { type: String, required: true, trim: true },
    pin: { type: String, required: true, private: true },
    roleId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'StaffRole' },
    groupIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'NotificationGroup', default: [] },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  },
  { timestamps: true }
);

staffMemberSchema.index({ hotelId: 1, isActive: 1 });

staffMemberSchema.method('isPinMatch', async function (pin: string): Promise<boolean> {
  return bcrypt.compare(pin, this.pin);
});

staffMemberSchema.pre('save', async function (next) {
  if (this.isModified('pin')) {
    this.pin = await bcrypt.hash(this.pin, 8);
  }
  next();
});

staffMemberSchema.plugin(toJSON);
staffMemberSchema.plugin(paginate);

const StaffMember = mongoose.model<IStaffMemberDoc, IStaffMemberModel>('StaffMember', staffMemberSchema);
export default StaffMember;
