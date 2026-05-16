import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IOrderPromotionDoc, IOrderPromotionModel } from './orders.interfaces';

const orderPromotionSchema = new mongoose.Schema<IOrderPromotionDoc, IOrderPromotionModel>(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Hotel',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['percent', 'fixed'],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    appliesTo: {
      type: String,
      enum: ['all', 'category', 'items'],
      default: 'all',
    },
    categoryIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
      ref: 'OrderCategory',
    },
    itemIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
      ref: 'CatalogItem',
    },
    availableFrom: {
      type: String,
      default: '',
    },
    availableTo: {
      type: String,
      default: '',
    },
    validFrom: {
      type: Date,
      default: null,
    },
    validTo: {
      type: Date,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

orderPromotionSchema.plugin(toJSON);
orderPromotionSchema.plugin(paginate);

const OrderPromotion = mongoose.model<IOrderPromotionDoc, IOrderPromotionModel>('OrderPromotion', orderPromotionSchema);

export default OrderPromotion;
