import { Model, Document, ObjectId } from 'mongoose';
import { QueryResult } from '../paginate/paginate';
import { IHotelOrdersSettings } from '../orders/orders.interfaces';
import { IHotelBookingSettings } from '../booking/booking.interfaces';

export const HOTEL_MAP_MARKER_ICONS = [
  'hotel',
  'food',
  'drink',
  'beach',
  'pool',
  'spa',
  'taxi',
  'parking',
  'activity',
  'shopping',
  'info',
  'viewpoint',
  'transport',
  'coffee',
  'custom',
] as const;

export type HotelMapMarkerIcon = typeof HOTEL_MAP_MARKER_ICONS[number];

export interface IHotelMapCustomPreset {
  id: string;
  name: string;
  icon: string;
  color?: string;
  text?: string;
}

export interface IHotelMapPoint {
  id?: string;
  title: string;
  description?: string;
  image?: string;
  address?: string;
  lat: number;
  lng: number;
  color?: string;
  icon?: HotelMapMarkerIcon;
  customPresetId?: string;
  customIconClass?: string;
  customIconImage?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface IHotelMapSettings {
  enabled?: boolean;
  defaultState?: 'collapsed' | 'expanded';
  centerAddress?: string;
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  showHotelMarker?: boolean;
  customPresets?: IHotelMapCustomPreset[];
}

export interface IHotelSettings {
  offlineGuideEnabled?: boolean;
  translationSourceLanguage?: string;
  translationCacheLanguages?: string[];
  premium?: IHotelPremiumModules;
  security?: IHotelSecuritySettings;
}

export interface IHotelFeatures {
  ordersEnabled?: boolean;
  maintenanceEnabled?: boolean;
  housekeepingEnabled?: boolean;
  staffRbacEnabled?: boolean;
  smartDispatchingEnabled?: boolean;
  bookableServicesEnabled?: boolean;
}

export interface IHotelPremiumModules {
  analytics?: boolean;
  automation?: boolean;
  upsells?: boolean;
  multilingualContent?: boolean;
  auditLogs?: boolean;
  integrations?: boolean;
}

export interface IHotelSecuritySettings {
  trustedDomains?: string[];
  deviceTokenVersion?: number;
  pinSessionHours?: number;
  allowSharedDevices?: boolean;
  requireStrongPin?: boolean;
  auditLogRetentionDays?: number;
}

export interface IHotel {
  manager?: ObjectId;
  user: ObjectId;
  name?: string;
  description?: string;
  note?: string;
  activeUntil?: string;
  image?: string;
  cover?: string;
  socialLinks?: string[];
  isActive?: boolean;
  orders?: IHotelOrdersSettings;
  bookings?: IHotelBookingSettings;
  map?: IHotelMapSettings;
  mapPoints?: IHotelMapPoint[];
  settings?: IHotelSettings;
  features?: IHotelFeatures;
  stripeAccountId?: string | null;
  stripeAccountStatus?: 'not_connected' | 'pending' | 'active' | 'restricted';
  stripePlatformFeePercent?: number | null;
}

export interface IHotelDoc extends IHotel, Document {}

export interface IHotelModel extends Model<IHotelDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type UpdateHotelBody = Partial<IHotel>;

export type NewCreatedHotel = Omit<IHotel, 'isActive'>;
