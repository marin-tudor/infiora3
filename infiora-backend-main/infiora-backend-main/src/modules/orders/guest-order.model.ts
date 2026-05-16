import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IGuestOrderDoc, IGuestOrderModel } from './orders.interfaces';

const selectedModifierSchema = new mongoose.Schema(
  {
    group: { type: String, required: true },
    option: { type: String, required: true },
    priceAdj: { type: Number, default: 0 },
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CatalogItem',
    },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    originalPrice: { type: Number, required: true },
    image: { type: String, default: '🛒' },
    selectedModifiers: { type: [selectedModifierSchema], default: [] },
  },
  { _id: false }
);

const guestOrderSchema = new mongoose.Schema<IGuestOrderDoc, IGuestOrderModel>(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    trackingToken: {
      type: String,
      required: true,
      select: false,
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Hotel',
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Room',
    },
    roomNumber: {
      type: String,
      default: '',
    },
    guestRoomNumber: {
      type: String,
      default: '',
    },
    guestEmail: {
      type: String,
      default: null,
    },
    items: {
      type: [orderItemSchema],
      required: true,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    note: {
      type: String,
      default: '',
    },
    payment: {
      type: String,
      enum: ['cash', 'card', 'room', 'online'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Awaiting confirmation', 'Processing', 'On the way', 'Completed', 'Cancelled'],
      default: 'Awaiting confirmation',
    },
    acceptedEta: {
      type: Number,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    staffNote: {
      type: String,
      default: '',
    },
    completedAt: {
      type: Date,
      default: null,
    },
    language: {
      type: String,
      default: '',
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    ratingComment: {
      type: String,
      default: '',
    },
    scheduledFor: {
      type: Date,
      default: null,
    },
    reservationCodeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: 'ReservationCode',
    },
    discountCode: { type: String, default: null },
    discountAmount: { type: Number, default: null },
    originalTotal: { type: Number, default: null },
    idempotencyKey: {
      type: String,
      default: null,
      index: true,
      unique: true,
      sparse: true,
    },
    staffMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StaffMember',
      default: null,
    },
    dispatchGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NotificationGroup',
      default: null,
    },
    surfacedAt: {
      type: Date,
      default: null,
    },
    stripePaymentIntentId: {
      type: String,
      default: null,
      index: true,
      unique: true,
      sparse: true,
    },
    guestCheckoutId: {
      type: String,
      default: null,
      index: true,
      unique: true,
      sparse: true,
    },
    stripeStatus: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'refunded'],
      default: undefined,
    },
    platformFeeAmount: {
      type: Number,
      default: null,
    },
    stripeFeeAmount: {
      type: Number,
      default: null,
    },
    netAmountToHotel: {
      type: Number,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

guestOrderSchema.index({ hotelId: 1, createdAt: -1 });
guestOrderSchema.index({ hotelId: 1, status: 1 });
guestOrderSchema.index({ hotelId: 1, status: 1, createdAt: -1 });
guestOrderSchema.index({ hotelId: 1, roomId: 1, createdAt: -1 });
guestOrderSchema.index({ hotelId: 1, scheduledFor: 1, status: 1 });

guestOrderSchema.plugin(toJSON);
guestOrderSchema.plugin(paginate);

const GuestOrder = mongoose.model<IGuestOrderDoc, IGuestOrderModel>('GuestOrder', guestOrderSchema);

export default GuestOrder;
