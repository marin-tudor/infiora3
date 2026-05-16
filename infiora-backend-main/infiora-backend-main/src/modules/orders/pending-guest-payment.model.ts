import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';

const pendingGuestPaymentSchema = new mongoose.Schema(
  {
    checkoutId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    paymentIntentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
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
    amountCents: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    cartHash: {
      type: String,
      required: true,
      index: true,
    },
    discountCode: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'requires_payment_method', 'processing', 'succeeded', 'failed', 'refunded'],
      default: 'pending',
    },
    paidAt: {
      type: Date,
      default: null,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GuestOrder',
      default: null,
    },
    stripeEventId: {
      type: String,
      default: null,
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
  },
  {
    timestamps: true,
  }
);

pendingGuestPaymentSchema.plugin(toJSON);

const PendingGuestPayment = mongoose.model('PendingGuestPayment', pendingGuestPaymentSchema);

export default PendingGuestPayment;
