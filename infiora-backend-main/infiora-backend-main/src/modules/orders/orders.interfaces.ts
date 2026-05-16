import { Model, Document, Types } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

// ─── Order Category ───────────────────────────────────────────────────────────

export interface IOrderCategory {
  hotelId: Types.ObjectId;
  name: string;
  icon: string;
  availableFrom?: string; // 'HH:MM' — empty = 24h
  availableTo?: string;
  sortOrder: number;
  active: boolean;
  parentId?: Types.ObjectId | null;
}

export interface IOrderCategoryDoc extends IOrderCategory, Document {}

export interface IOrderCategoryModel extends Model<IOrderCategoryDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type NewOrderCategory = Omit<IOrderCategory, 'sortOrder'>;
export type UpdateOrderCategory = Partial<IOrderCategory>;

// ─── Catalog Item ─────────────────────────────────────────────────────────────

export interface IBookingConfigScheduleEntry {
  from: string; // 'HH:MM'
  to: string; // 'HH:MM'
}

export interface IAddon {
  name: string;
  price: number;
  description: string;
}

export interface ICatalogItemBookingConfig {
  slotType: 'private' | 'shared';
  maxPersons: number;
  duration: number;
  bufferMinutes: number;
  advanceMinHours: number;
  advanceMaxDays: number;
  requiresApproval: boolean;
  cancelPolicyHours: number;
  resourceIds: Types.ObjectId[];
  weeklySchedule: {
    mon: IBookingConfigScheduleEntry[];
    tue: IBookingConfigScheduleEntry[];
    wed: IBookingConfigScheduleEntry[];
    thu: IBookingConfigScheduleEntry[];
    fri: IBookingConfigScheduleEntry[];
    sat: IBookingConfigScheduleEntry[];
    sun: IBookingConfigScheduleEntry[];
  };
  bookingModel: 'exclusive' | 'shared';
  totalInventory: number;
  capacityPerUnit: number;
  minPersons: number;
  startInterval: number;
  confirmationType: 'instant' | 'request';
  pricePerPerson: boolean;
  cancellationPolicy: 'free_24h' | 'free_48h' | 'non_refundable' | 'custom';
  cancellationPolicyHours: number;
  bookableCategory: 'transfer' | 'tour' | 'service' | 'rental' | 'other';
  addons: IAddon[];
  simpleAvailability: { enabled: boolean; from: string; to: string };
}

export interface IModifierOption {
  label: string;
  priceAdj: number;
}

export interface IModifierGroup {
  group: string;
  required: boolean;
  options: IModifierOption[];
}

export interface ICatalogItem {
  hotelId: Types.ObjectId;
  categoryId: Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  discount: number; // 0–90 %
  imageType: 'emoji' | 'url' | 'upload';
  image: string;
  tags: string[];
  badge: '' | 'new' | 'hit' | 'sale';
  available: boolean;
  availableFrom?: string; // overrides category time
  availableTo?: string;
  sortOrder: number;
  modifiers: IModifierGroup[];
  type: 'instant' | 'bookable';
  bookingConfig?: ICatalogItemBookingConfig;
}

export interface ICatalogItemDoc extends ICatalogItem, Document {}

export interface ICatalogItemModel extends Model<ICatalogItemDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type NewCatalogItem = Omit<ICatalogItem, 'sortOrder'>;
export type UpdateCatalogItem = Partial<ICatalogItem>;

// ─── Guest Order ──────────────────────────────────────────────────────────────

export type OrderStatus = 'Awaiting confirmation' | 'Processing' | 'On the way' | 'Completed' | 'Cancelled';
export type PaymentMethod = 'cash' | 'card' | 'room' | 'online';
export interface IPaymentMethodsSettings {
  cash: boolean;
  card: boolean;
  online: boolean;
}

export interface ISelectedModifier {
  group: string;
  option: string;
  priceAdj: number;
}

export interface IOrderItem {
  itemId: Types.ObjectId;
  name: string;
  qty: number;
  price: number; // final price after discount
  originalPrice: number;
  image: string;
  selectedModifiers: ISelectedModifier[];
}

export interface IGuestOrder {
  orderId: string; // e.g. '#4521'
  trackingToken?: string;
  hotelId: Types.ObjectId;
  roomId: Types.ObjectId;
  roomNumber?: string;
  guestRoomNumber?: string;
  guestEmail?: string;
  items: IOrderItem[];
  total: number;
  note?: string;
  payment: PaymentMethod;
  status: OrderStatus;
  acceptedEta?: number; // minutes
  acceptedAt?: Date;
  staffNote?: string;
  completedAt?: Date;
  language: string;
  rating?: number; // 1–5
  ratingComment?: string;
  scheduledFor?: Date;
  reservationCodeId?: Types.ObjectId;
  discountCode?: string;
  discountAmount?: number;
  originalTotal?: number;
  idempotencyKey?: string | null;
  staffMemberId?: Types.ObjectId | null;
  dispatchGroupId?: Types.ObjectId | null;
  surfacedAt?: Date | null;
  stripePaymentIntentId?: string | null;
  guestCheckoutId?: string | null;
  stripeStatus?: 'pending' | 'succeeded' | 'failed' | 'refunded' | null;
  platformFeeAmount?: number | null;
  stripeFeeAmount?: number | null;
  netAmountToHotel?: number | null;
  paidAt?: Date | null;
}

export interface IGuestOrderDoc extends IGuestOrder, Document {}

export interface IGuestOrderModel extends Model<IGuestOrderDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

// ─── iCal Platform ────────────────────────────────────────────────────────────

export const ICAL_PLATFORMS = ['booking', 'airbnb', 'vrbo', 'agoda', 'tripadvisor', 'custom'] as const;
export type ICalPlatform = typeof ICAL_PLATFORMS[number];

// ─── Reservation Code ─────────────────────────────────────────────────────────

export interface IReservationCode {
  hotelId: Types.ObjectId;
  roomId?: Types.ObjectId;
  roomNumber?: string;
  code: string;
  guestName?: string;
  checkIn: Date;
  checkOut: Date;
  active: boolean;
  createdBy?: Types.ObjectId;           // optional — null for auto-synced codes
  source?: ICalPlatform | 'manual';     // new
  externalUid?: string;                 // new — iCal UID for dedup
}

export interface IReservationCodeDoc extends IReservationCode, Document {}

export interface IReservationCodeModel extends Model<IReservationCodeDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type NewReservationCode = Omit<IReservationCode, 'active'>;
export type UpdateReservationCode = Partial<Pick<IReservationCode, 'active' | 'guestName' | 'checkIn' | 'checkOut'>>;

// ─── Discount Code ────────────────────────────────────────────────────────────

export type DiscountType = 'percentage' | 'fixed';

export interface IDiscountCode {
  hotelId: Types.ObjectId;
  code: string;           // uppercase, unique per hotel
  description?: string;
  discountType: DiscountType;
  discountValue: number;  // 10 = 10% or 10 = 10€
  applicableCategories: Types.ObjectId[]; // empty = all categories
  validFrom?: Date;
  validTo?: Date;
  maxUses?: number;
  usedCount: number;
  minOrderAmount?: number;
  isActive: boolean;
  createdBy: Types.ObjectId;
}

export interface IDiscountCodeDoc extends IDiscountCode, Document {}
export interface IDiscountCodeModel extends Model<IDiscountCodeDoc> {}

export type NewDiscountCode = Omit<IDiscountCode, 'usedCount' | 'isActive'>;
export type UpdateDiscountCode = Partial<Omit<IDiscountCode, 'hotelId' | 'usedCount'>>;

// ─── iCal Source ──────────────────────────────────────────────────────────────

export interface IICalSource {
  hotelId: Types.ObjectId;
  platform: ICalPlatform;
  label: string;
  url: string;
  enabled: boolean;
  lastSyncAt: Date | null;
  lastSyncStatus: 'success' | 'error' | null;
  lastSyncError: string | null;
}

export interface IICalSourceDoc extends IICalSource, Document {}
export interface IICalSourceModel extends Model<IICalSourceDoc> {}

export type NewICalSource = Pick<IICalSource, 'platform' | 'label' | 'url' | 'enabled'>;

// ─── Order Promotion ──────────────────────────────────────────────────────────

export interface IOrderPromotion {
  hotelId: Types.ObjectId;
  name: string;
  type: 'percent' | 'fixed';
  value: number;
  appliesTo: 'all' | 'category' | 'items';
  categoryIds: Types.ObjectId[];
  itemIds: Types.ObjectId[];
  availableFrom?: string; // 'HH:MM'
  availableTo?: string;
  validFrom?: Date;
  validTo?: Date;
  active: boolean;
}

export interface IOrderPromotionDoc extends IOrderPromotion, Document {}

export interface IOrderPromotionModel extends Model<IOrderPromotionDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type NewOrderPromotion = Omit<IOrderPromotion, 'active'>;
export type UpdateOrderPromotion = Partial<IOrderPromotion>;

// ─── Hotel Orders Settings ────────────────────────────────────────────────────

export interface IHotelOrdersSettings {
  enabled: boolean;
  availableFrom: string; // 'HH:MM' — '00:00' = 24h
  availableTo: string;
  currencySymbol: string;
  processingLabel: string; // e.g. 'Processing' or 'Preparing'
  onTheWayLabel: string; // e.g. 'On the way' or 'Ready for pickup'
  completedLabel: string; // e.g. 'Completed' or 'Delivered'
  paymentMethods?: IPaymentMethodsSettings;
  // Venue mode
  venueType: 'hotel' | 'restaurant';
  requireCode: boolean; // hotel: reservation code; restaurant: table PIN
  requireLocation: boolean; // hotel: room number; restaurant: table number
  locationLabel: string; // e.g. 'Room number' or 'Table number'
  tablePin: string; // restaurant mode PIN (never sent to guest app)
  kioskMode?: boolean; // hides back button on guest app
}

export type IGuestOrdersSettings = Omit<IHotelOrdersSettings, 'tablePin'>;

// ─── SSE Payload Types ────────────────────────────────────────────────────────

export interface ISSENewOrderPayload {
  id?: string;
  _id?: string;
  orderId: string;
  roomNumber?: string | undefined;
  items?: { name: string; qty: number }[];
  itemCount: number;
  total: number;
  note?: string | undefined;
  payment: PaymentMethod;
  status?: OrderStatus;
  scheduledFor?: Date | undefined;
  createdAt: Date;
}

export interface ISSEOrderUpdatedPayload {
  orderId: string;
  status: OrderStatus;
  acceptedEta?: number;
  staffNote?: string;
}

// ─── Place Order Body ─────────────────────────────────────────────────────────

export interface IPlaceOrderBody {
  code?: string; // hotel mode: reservation code (when requireCode=true)
  tablePin?: string; // restaurant mode: table PIN (when requireCode=true)
  guestEmail?: string;
  guestRoomNumber?: string;
  language?: string;
  items: { itemId: string; qty: number; selectedModifiers?: ISelectedModifier[] }[];
  payment: PaymentMethod;
  note?: string;
  scheduledFor?: string;
  discountCode?: string;
  idempotencyKey?: string;
  stripePaymentIntentId?: string;
  guestCheckoutId?: string;
}

export interface ICreateGuestPaymentIntentBody {
  roomId: string;
  items: Array<{
    itemId: string;
    qty: number;
    selectedModifiers?: Array<{
      group: string;
      option: string;
      priceAdj: number;
    }>;
  }>;
  discountCode?: string | null;
}

// ─── Order Visit ──────────────────────────────────────────────────────────────

export interface IOrderVisitAnalytics {
  totalVisits: number;
  converted: number;
  notConverted: number;
  conversionRate: number; // %
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface IOrderAnalytics {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  avgAcceptTime: number; // minutes
  avgFulfillTime: number | null; // minutes
  avgFulfillmentTime: number | null; // alias for dashboard
  cancellationRate: number; // %
  avgRating: number | null;
  completedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  byStatus: Record<string, number>;
  byPayment: Record<string, number>;
  byLanguage: Record<string, number>;
  byCategory: { categoryId: string; name: string; count: number; revenue: number }[];
  topItems: { itemId: string; name: string; count: number; revenue: number }[];
  topRooms: { roomId: string; roomNumber: string; count: number; revenue: number }[];
  overTime: { date: string; orders: number; revenue: number }[];
}
