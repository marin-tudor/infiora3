import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IOrderCategoryDoc, IOrderCategoryModel } from './orders.interfaces';

const orderCategorySchema = new mongoose.Schema<IOrderCategoryDoc, IOrderCategoryModel>(
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
    icon: {
      type: String,
      default: '🛒',
    },
    availableFrom: {
      type: String,
      default: '',
    },
    availableTo: {
      type: String,
      default: '',
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrderCategory',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

orderCategorySchema.plugin(toJSON);
orderCategorySchema.plugin(paginate);

const OrderCategory = mongoose.model<IOrderCategoryDoc, IOrderCategoryModel>('OrderCategory', orderCategorySchema);

export default OrderCategory;
