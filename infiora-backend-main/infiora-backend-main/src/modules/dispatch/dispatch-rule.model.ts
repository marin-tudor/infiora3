import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IDispatchRuleDoc, IDispatchRuleModel, DISPATCH_EVENT_TYPES } from './dispatch.interfaces';

const conditionsSchema = new mongoose.Schema(
  {
    categoryIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    itemIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    eventTypes: {
      type: [String],
      enum: DISPATCH_EVENT_TYPES,
      default: ['order'],
    },
  },
  { _id: false }
);

const dispatchRuleSchema = new mongoose.Schema<IDispatchRuleDoc, IDispatchRuleModel>(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Hotel' },
    name: { type: String, required: true, trim: true },
    priority: { type: Number, required: true, default: 0 },
    conditions: { type: conditionsSchema, required: true },
    targetGroupId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'NotificationGroup' },
    escalationSeconds: { type: Number, default: 30 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

dispatchRuleSchema.index({ hotelId: 1, priority: 1 });
dispatchRuleSchema.plugin(toJSON);
dispatchRuleSchema.plugin(paginate);

const DispatchRule = mongoose.model<IDispatchRuleDoc, IDispatchRuleModel>('DispatchRule', dispatchRuleSchema);
export default DispatchRule;
