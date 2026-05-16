import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import { IDiscountCodeDoc, IDiscountCodeModel } from './orders.interfaces';

const discountCodeSchema = new mongoose.Schema<IDiscountCodeDoc, IDiscountCodeModel>(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Hotel' },
    code: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrderCategory' }],
    validFrom: { type: Date, default: null },
    validTo: { type: Date, default: null },
    maxUses: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    minOrderAmount: { type: Number, default: null },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  },
  { timestamps: true }
);

discountCodeSchema.pre('save', function (next) {
  if (this.code) {
    this.code = this.code.trim().toUpperCase().replace(/\s/g, '');
  }
  next();
});

discountCodeSchema.index({ hotelId: 1, code: 1 }, { unique: true });
discountCodeSchema.index({ hotelId: 1, isActive: 1 });

discountCodeSchema.plugin(toJSON);

const DiscountCode = mongoose.model<IDiscountCodeDoc, IDiscountCodeModel>('DiscountCode', discountCodeSchema);
export default DiscountCode;
