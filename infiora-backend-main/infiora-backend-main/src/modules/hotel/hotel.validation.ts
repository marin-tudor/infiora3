import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { HOTEL_MAP_MARKER_ICONS, NewCreatedHotel } from './hotel.interfaces';

const mapPointSchema = Joi.object({
  id: Joi.string().allow(null, ''),
  title: Joi.string(),
  description: Joi.string().allow(null, ''),
  image: Joi.any(),
  address: Joi.string().allow(null, ''),
  lat: Joi.number().min(-90).max(90),
  lng: Joi.number().min(-180).max(180),
  color: Joi.string().allow(null, ''),
  icon: Joi.string()
    .valid(...HOTEL_MAP_MARKER_ICONS)
    .allow(null, ''),
  customPresetId: Joi.string().allow(null, ''),
  customIconClass: Joi.string().allow(null, ''),
  customIconImage: Joi.any(),
  isActive: Joi.boolean(),
  sortOrder: Joi.number().integer(),
});

const mapCustomPresetSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().allow(null, ''),
  icon: Joi.string().allow(null, ''),
  color: Joi.string().allow(null, ''),
  text: Joi.string().allow(null, ''),
});

const hotelMapSchema = Joi.object({
  enabled: Joi.boolean(),
  defaultState: Joi.string().valid('collapsed', 'expanded'),
  centerAddress: Joi.string().allow(null, ''),
  centerLat: Joi.number().min(-90).max(90).allow(null),
  centerLng: Joi.number().min(-180).max(180).allow(null),
  zoom: Joi.number().min(1).max(22).allow(null),
  showHotelMarker: Joi.boolean(),
  customPresets: Joi.array().items(mapCustomPresetSchema),
});

const createHotelBody: Record<keyof NewCreatedHotel, any> = {
  user: Joi.custom(objectId),
  manager: Joi.custom(objectId),
  name: Joi.string(),
  description: Joi.string().allow(null, ''),
  note: Joi.string().allow(null, ''),
  activeUntil: Joi.string().allow(null, ''),
  image: Joi.any(),
  cover: Joi.any(),
  socialLinks: Joi.any(),
  orders: Joi.any(),
  bookings: Joi.object({
    emails: Joi.array().items(Joi.string().email()),
  }),
  map: hotelMapSchema,
  mapPoints: Joi.array().items(mapPointSchema),
  settings: Joi.object({
    offlineGuideEnabled: Joi.boolean(),
    translationSourceLanguage: Joi.string().allow(null, ''),
    translationCacheLanguages: Joi.array().items(Joi.string().trim().lowercase()).max(6),
    premium: Joi.object({
      analytics: Joi.boolean(),
      automation: Joi.boolean(),
      upsells: Joi.boolean(),
      multilingualContent: Joi.boolean(),
      auditLogs: Joi.boolean(),
      integrations: Joi.boolean(),
    }),
    security: Joi.object({
      trustedDomains: Joi.array().items(Joi.string().trim()),
      deviceTokenVersion: Joi.number().integer().min(1),
      pinSessionHours: Joi.number().integer().min(1).max(24),
      allowSharedDevices: Joi.boolean(),
      requireStrongPin: Joi.boolean(),
      auditLogRetentionDays: Joi.number().integer().min(7).max(365),
    }),
  }),
  features: Joi.object({
    ordersEnabled: Joi.boolean(),
    maintenanceEnabled: Joi.boolean(),
    housekeepingEnabled: Joi.boolean(),
    staffRbacEnabled: Joi.boolean(),
    smartDispatchingEnabled: Joi.boolean(),
    bookableServicesEnabled: Joi.boolean(),
  }),
  stripeAccountId: Joi.string().allow(null, ''),
  stripeAccountStatus: Joi.string().valid('not_connected', 'pending', 'active', 'restricted'),
  stripePlatformFeePercent: Joi.number().min(0).max(100).allow(null),
};

export const createHotel = {
  body: Joi.object().keys(createHotelBody),
};

export const getHotels = {
  query: Joi.object().keys({
    user: Joi.custom(objectId),
    search: Joi.string(),
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const getHotel = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
  }),
};

export const updateHotel = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    name: Joi.string(),
    manager: Joi.custom(objectId),
    description: Joi.string().allow(null, ''),
    note: Joi.string().allow(null, ''),
    activeUntil: Joi.string().allow(null, ''),
    image: Joi.any(),
    cover: Joi.any(),
    socialLinks: Joi.any(),
    isActive: Joi.boolean(),
    bookings: Joi.object({
      emails: Joi.array().items(Joi.string().email()),
    }),
    map: hotelMapSchema,
    mapPoints: Joi.array().items(mapPointSchema),
    settings: Joi.object({
      offlineGuideEnabled: Joi.boolean(),
      translationSourceLanguage: Joi.string().allow(null, ''),
      translationCacheLanguages: Joi.array().items(Joi.string().trim().lowercase()).max(6),
      premium: Joi.object({
        analytics: Joi.boolean(),
        automation: Joi.boolean(),
        upsells: Joi.boolean(),
        multilingualContent: Joi.boolean(),
        auditLogs: Joi.boolean(),
        integrations: Joi.boolean(),
      }),
      security: Joi.object({
        trustedDomains: Joi.array().items(Joi.string().trim()),
        deviceTokenVersion: Joi.number().integer().min(1),
        pinSessionHours: Joi.number().integer().min(1).max(24),
        allowSharedDevices: Joi.boolean(),
        requireStrongPin: Joi.boolean(),
        auditLogRetentionDays: Joi.number().integer().min(7).max(365),
      }),
    }),
    features: Joi.object({
      ordersEnabled: Joi.boolean(),
      maintenanceEnabled: Joi.boolean(),
      housekeepingEnabled: Joi.boolean(),
      staffRbacEnabled: Joi.boolean(),
      smartDispatchingEnabled: Joi.boolean(),
      bookableServicesEnabled: Joi.boolean(),
    }),
    stripePlatformFeePercent: Joi.number().min(0).max(100).allow(null),
  }),
};

export const deleteHotel = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
  }),
};
