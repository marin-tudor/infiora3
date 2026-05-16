import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { HOTEL_MAP_MARKER_ICONS, IHotelDoc, IHotelModel } from './hotel.interfaces';
import { Room } from '../room';

const mapPointSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    image: String,
    address: String,
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
    color: String,
    icon: {
      type: String,
      enum: HOTEL_MAP_MARKER_ICONS,
      default: 'info',
    },
    customPresetId: String,
    customIconClass: String,
    customIconImage: String,
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true }
);

const mapCustomPresetSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    icon: { type: String, required: true },
    color: String,
    text: String,
  },
  { _id: false }
);

const hotelSchema = new mongoose.Schema<IHotelDoc, IHotelModel>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    note: {
      type: String,
    },
    activeUntil: {
      type: Date,
    },
    image: {
      type: String,
    },
    cover: {
      type: String,
    },
    socialLinks: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    orders: {
      enabled: { type: Boolean, default: false },
      availableFrom: { type: String, default: '00:00' },
      availableTo: { type: String, default: '00:00' },
      currencySymbol: { type: String, default: '€' },
      processingLabel: { type: String, default: 'Processing' },
      onTheWayLabel: { type: String, default: 'On the way' },
      completedLabel: { type: String, default: 'Completed' },
      emails: { type: [String], default: [] },
      paymentMethods: {
        cash: { type: Boolean, default: true },
        card: { type: Boolean, default: true },
        online: { type: Boolean, default: false },
      },
      // Venue mode
      venueType: { type: String, enum: ['hotel', 'restaurant'], default: 'hotel' },
      requireCode: { type: Boolean, default: true },
      requireLocation: { type: Boolean, default: true },
      locationLabel: { type: String, default: 'Room number' },
      tablePin: { type: String, default: '' },
    },
    bookings: {
      emails: { type: [String], default: [] },
      onlinePaymentEnabled: { type: Boolean, default: false },
    },
    map: {
      enabled: { type: Boolean, default: false },
      defaultState: { type: String, enum: ['collapsed', 'expanded'], default: 'collapsed' },
      centerAddress: { type: String },
      centerLat: { type: Number, min: -90, max: 90 },
      centerLng: { type: Number, min: -180, max: 180 },
      zoom: { type: Number, min: 1, max: 22, default: 14 },
      showHotelMarker: { type: Boolean, default: true },
      customPresets: {
        type: [mapCustomPresetSchema],
        default: [],
      },
    },
    mapPoints: {
      type: [mapPointSchema],
      default: [],
    },
    settings: {
      offlineGuideEnabled: { type: Boolean, default: true },
      translationSourceLanguage: { type: String, default: 'hr' },
      translationCacheLanguages: { type: [String], default: ['en'] },
      premium: {
        analytics: { type: Boolean, default: false },
        automation: { type: Boolean, default: false },
        upsells: { type: Boolean, default: false },
        multilingualContent: { type: Boolean, default: false },
        auditLogs: { type: Boolean, default: false },
        integrations: { type: Boolean, default: false },
      },
      security: {
        trustedDomains: { type: [String], default: [] },
        deviceTokenVersion: { type: Number, default: 1 },
        pinSessionHours: { type: Number, default: 8 },
        allowSharedDevices: { type: Boolean, default: true },
        requireStrongPin: { type: Boolean, default: true },
        auditLogRetentionDays: { type: Number, default: 90 },
      },
    },
    features: {
      ordersEnabled: { type: Boolean, default: true },
      maintenanceEnabled: { type: Boolean, default: true },
      housekeepingEnabled: { type: Boolean, default: true },
      staffRbacEnabled: { type: Boolean, default: false },
      smartDispatchingEnabled: { type: Boolean, default: false },
      bookableServicesEnabled: { type: Boolean, default: false },
    },
    stripeAccountId: {
      type: String,
      default: null,
    },
    stripeAccountStatus: {
      type: String,
      enum: ['not_connected', 'pending', 'active', 'restricted'],
      default: 'not_connected',
    },
    stripePlatformFeePercent: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Add plugins to the schema
hotelSchema.plugin(toJSON);
hotelSchema.plugin(paginate);

hotelSchema.pre('deleteOne', { document: true, query: false }, async function () {
  const hotel = this;
  const rooms = await Room.find({ hotel: hotel._id });
  await Promise.all(rooms.map((r) => r.deleteOne()));
});

// Create the model
const Hotel = mongoose.model<IHotelDoc, IHotelModel>('Hotel', hotelSchema);

export default Hotel;
