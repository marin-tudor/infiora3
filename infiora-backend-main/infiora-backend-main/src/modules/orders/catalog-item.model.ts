import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { ICatalogItemDoc, ICatalogItemModel } from './orders.interfaces';

const modifierOptionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    priceAdj: { type: Number, default: 0 },
  },
  { _id: false }
);

const modifierGroupSchema = new mongoose.Schema(
  {
    group: { type: String, required: true },
    required: { type: Boolean, default: false },
    options: { type: [modifierOptionSchema], default: [] },
  },
  { _id: false }
);

const scheduleEntrySchema = new mongoose.Schema({ from: { type: String }, to: { type: String } }, { _id: false });

const catalogItemSchema = new mongoose.Schema<ICatalogItemDoc, ICatalogItemModel>(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Hotel',
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'OrderCategory',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 90,
    },
    imageType: {
      type: String,
      enum: ['emoji', 'url', 'upload'],
      default: 'emoji',
    },
    image: {
      type: String,
      default: '🛒',
    },
    tags: {
      type: [String],
      default: [],
    },
    badge: {
      type: String,
      enum: ['', 'new', 'hit', 'sale'],
      default: '',
    },
    available: {
      type: Boolean,
      default: true,
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
    modifiers: {
      type: [modifierGroupSchema],
      default: [],
    },
    type: {
      type: String,
      enum: ['instant', 'bookable'],
      default: 'instant',
    },
    bookingConfig: {
      slotType: { type: String, enum: ['private', 'shared'], default: 'private' },
      maxPersons: { type: Number, default: 1 },
      duration: { type: Number, default: 60 },
      bufferMinutes: { type: Number, default: 0 },
      advanceMinHours: { type: Number, default: 1 },
      advanceMaxDays: { type: Number, default: 60 },
      requiresApproval: { type: Boolean, default: false },
      cancelPolicyHours: { type: Number, default: 24 },
      resourceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceResource' }],
      weeklySchedule: {
        mon: [scheduleEntrySchema],
        tue: [scheduleEntrySchema],
        wed: [scheduleEntrySchema],
        thu: [scheduleEntrySchema],
        fri: [scheduleEntrySchema],
        sat: [scheduleEntrySchema],
        sun: [scheduleEntrySchema],
      },
      bookingModel: {
        type: String,
        enum: ['exclusive', 'shared'],
        default: 'exclusive',
      },
      totalInventory: { type: Number, default: 1 },
      capacityPerUnit: { type: Number, default: 1 },
      minPersons: { type: Number, default: 1 },
      startInterval: { type: Number, default: 60 },
      confirmationType: {
        type: String,
        enum: ['instant', 'request'],
        default: 'instant',
      },
      pricePerPerson: { type: Boolean, default: false },
      cancellationPolicy: {
        type: String,
        enum: ['free_24h', 'free_48h', 'non_refundable', 'custom'],
        default: 'free_24h',
      },
      cancellationPolicyHours: { type: Number, default: 24 },
      bookableCategory: {
        type: String,
        enum: ['transfer', 'tour', 'service', 'rental', 'other'],
        default: 'service',
      },
      addons: {
        type: [
          {
            name: { type: String, required: true },
            price: { type: Number, default: 0 },
            description: { type: String, default: '' },
          },
        ],
        default: [],
      },
      simpleAvailability: {
        enabled: { type: Boolean, default: true },
        from: { type: String, default: '08:00' },
        to: { type: String, default: '22:00' },
      },
    },
  },
  {
    timestamps: true,
  }
);

catalogItemSchema.index({ hotelId: 1, categoryId: 1, available: 1, sortOrder: 1 });
catalogItemSchema.index({ hotelId: 1, available: 1, sortOrder: 1 });

catalogItemSchema.plugin(toJSON);
catalogItemSchema.plugin(paginate);

const CatalogItem = mongoose.model<ICatalogItemDoc, ICatalogItemModel>('CatalogItem', catalogItemSchema);

export default CatalogItem;
