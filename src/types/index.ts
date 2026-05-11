export interface GenericResponse {
  status: string
  message: string
}

export interface GenericResultResponse<T> {
  status: string
  results: T[]
  page: number
  limit: number
}

export interface IUser {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}
export interface IBatch {
  id: string
  name?: string
  description?: string
}
export interface ITag {
  id: string
  title?: string
  headline?: string
  image?: string
  type?: string
}

export interface ITicket {
  id: string
  user: string
  category?: string
  subject: string
  message: string
  status?: string
}
export interface IHotel {
  id: string
  user: string
  name?: string
  description?: string
  socialLinks?: string[]
  image: string
  cover?: string
  isActive: boolean
  settings?: {
    offlineGuideEnabled?: boolean
    translationSourceLanguage?: string
    premium?: IHotelPremiumModules
    security?: IHotelSecuritySettings
  }
  features?: {
    ordersEnabled?: boolean
    maintenanceEnabled?: boolean
    housekeepingEnabled?: boolean
    staffRbacEnabled?: boolean
    smartDispatchingEnabled?: boolean
    bookableServicesEnabled?: boolean
  }
  bookings?: {
    emails?: string[]
  }
  map?: IHotelMapSettings
  mapPoints?: IMapPoint[]
}

export interface IHotelPremiumModules {
  analytics?: boolean
  automation?: boolean
  upsells?: boolean
  multilingualContent?: boolean
  auditLogs?: boolean
  integrations?: boolean
}

export interface IHotelSecuritySettings {
  trustedDomains?: string[]
  deviceTokenVersion?: number
  pinSessionHours?: number
  allowSharedDevices?: boolean
  requireStrongPin?: boolean
  auditLogRetentionDays?: number
  recentAuditLogs?: IHotelAuditLog[]
}

export interface IHotelAuditLog {
  id: string
  actorType: 'user' | 'staff' | 'system' | 'guest'
  actorId?: string | null
  action: string
  targetType: string
  targetId?: string | null
  summary: string
  createdAt: string
}

export interface ITranslationCacheReview {
  totals: { scope: string; status: string; count: number }[]
  pendingOldest: { scope: string; language: string; createdAt: string } | null
  recentFailures: { scope: string; language: string; error?: string; updatedAt: string }[]
}

export interface IHotelOperationsOverview {
  summary: {
    activeOrders: number
    upcomingBookings: number
    openMaintenance: number
    openHousekeeping: number
    guestSatisfaction: number | null
  }
  serviceLevels: {
    avgOrderAcceptanceMinutes: number | null
    orderSlaBreaches: number
    maintenanceResolutionMinutes: number | null
    housekeepingResolutionMinutes: number | null
  }
  bookings: {
    confirmedRevenue: number
    activeUpcoming: number
  }
  staffing: {
    totalDispatchRules: number
    activeDispatchRules: number
    avgEscalationSeconds: number | null
  }
  issueBreakdown: {
    maintenance: { label: string; count: number }[]
    housekeeping: { label: string; count: number }[]
  }
  premiumModules: IHotelPremiumModules
  coreFeatures: IHotel['features']
  recentAuditLogs: IHotelAuditLog[]
  translationCacheReview: ITranslationCacheReview
}

export type MapMarkerIcon =
  | 'hotel'
  | 'food'
  | 'drink'
  | 'beach'
  | 'pool'
  | 'spa'
  | 'taxi'
  | 'parking'
  | 'activity'
  | 'shopping'
  | 'info'
  | 'viewpoint'
  | 'transport'
  | 'coffee'
  | 'custom'

export interface IMapCustomPreset {
  id: string
  name: string
  icon: string
  color?: string
  text?: string
}

export interface IMapPoint {
  id?: string
  title: string
  description?: string
  image?: string
  address?: string
  lat: number
  lng: number
  color?: string
  icon?: MapMarkerIcon
  customPresetId?: string
  customIconClass?: string
  customIconImage?: string
  isActive?: boolean
  sortOrder?: number
}

export interface IHotelMapSettings {
  enabled?: boolean
  defaultState?: 'collapsed' | 'expanded'
  centerAddress?: string
  centerLat?: number
  centerLng?: number
  zoom?: number
  showHotelMarker?: boolean
  customPresets?: IMapCustomPreset[]
}
export interface INewsletter {
  message?: string
  successMessage?: string
  buttonText?: string
  mainButtonText?: string
  type?: string
  color?: string
  image?: string
  imageType?: 'none' | 'image' | 'icon' | 'url'
  isActive?: boolean
}

export interface IFeedback {
  isActive?: boolean
  emailRequirement?: 'none' | 'optional' | 'mandatory'
  textRequirement?: 'none' | 'optional' | 'mandatory'
  emails?: string[]
  googleMapsLink?: string
}

export interface ISurveyQuestion {
  id: string
  type: 'rating' | 'yes_no' | 'single_choice' | 'multi_choice' | 'open_text' | 'nps' | 'matrix' | 'contact'
  text: string
  options?: string[]
  matrixRows?: string[]
  matrixColumns?: string[]
  required?: boolean
}

export interface ISurvey {
  isActive?: boolean
  type?: 'popup' | 'button'
  buttonText?: string
  mainButtonText?: string
  imageType?: 'none' | 'image' | 'icon' | 'url'
  image?: string
  questions?: ISurveyQuestion[]
}

export interface IPopup {
  message?: string
  buttonText?: string
  link?: string
  backgroundColor?: string
  fontColor?: string
  size?: string
  position?: string
  image?: string
  imageType?: 'none' | 'image' | 'icon' | 'url'
  isActive?: boolean
}

export interface IRoom {
  id: string
  hotel: IHotel
  group?: IGroup
  isActive?: boolean
  number: string
  description?: string
  orderedLinks?: string[]
  background?: {
    color?: string
    direction?: string
    type?: string
    image?: string
    imageOpacity?: number
    backgroundFit?: string
    backgroundPosition?: string
    tileSize?: number
  }
  font?: {
    color?: string
    family?: string
  }
  button?: {
    color?: string
    backgroundColor?: string
    variant?: 'outlined' | 'contained'
    borderRadius?: string
  }
  popup?: IPopup
  newsletter?: INewsletter
  feedback?: IFeedback
  survey?: ISurvey
  housekeeping?: {
    isActive?: boolean
    mainButtonText?: string
    icon?: string
    emails?: string[]
    askRoomNumber?: boolean
    roomNumberLabel?: string
    askReservationCode?: boolean
    reservationCodeLabel?: string
    options?: { key?: string; label?: string; icon?: string }[]
  }
  maintenance?: {
    isActive?: boolean
    mainButtonText?: string
    icon?: string
    emails?: string[]
    askRoomNumber?: boolean
    roomNumberLabel?: string
    askReservationCode?: boolean
    reservationCodeLabel?: string
    options?: { key?: string; label?: string }[]
  }
}

export interface IGroup {
  id: string
  title: string
  hotel: string
  description?: string
  background?: {
    color?: string
    direction?: string
    type?: string
    image?: string
    imageOpacity?: number
    backgroundFit?: string
    backgroundPosition?: string
    tileSize?: number
  }
  housekeeping?: {
    isActive?: boolean
    mainButtonText?: string
    icon?: string
    emails?: string[]
    askRoomNumber?: boolean
    roomNumberLabel?: string
    askReservationCode?: boolean
    reservationCodeLabel?: string
    options?: { key?: string; label?: string; icon?: string }[]
  }
  maintenance?: {
    isActive?: boolean
    mainButtonText?: string
    icon?: string
    emails?: string[]
    askRoomNumber?: boolean
    roomNumberLabel?: string
    askReservationCode?: boolean
    reservationCodeLabel?: string
    options?: { key?: string; label?: string }[]
  }
  font?: {
    color?: string
    family?: string
  }
  button?: {
    color?: string
    backgroundColor?: string
    variant?: 'outlined' | 'contained'
    borderRadius?: string
  }
  popup?: IPopup
  newsletter?: INewsletter
  feedback?: IFeedback
  survey?: ISurvey
}

export interface ILink {
  id: string
  position: number
  room?: string
  group?: string
  title?: string
  value: string
  type: string
  items: IItem[]
  sections: ISection[]
  image?: string
  imageType?: 'none' | 'image' | 'icon' | 'url'
  isActive: boolean
  data: any
}

export interface ISubscriber {
  id: string
  user: string
  room: string
  name: string
  email: string
}

export interface IItem {
  id: string
  title: string
  value: string
  type: string
  data: any
}
export interface ISection {
  id: string
  clientId?: string
  title: string
  description?: string
  url?: string
  urlButtonText?: string
  links?: { clientId?: string; url: string; urlButtonText: string }[]
  phone?: string
  address?: string
  images?: string[]
  video?: string
  items?: any
  mapEnabled?: boolean
  mapTitle?: string
  mapDescription?: string
  mapImage?: string
  mapLat?: number
  mapLng?: number
  mapColor?: string
  mapIcon?: MapMarkerIcon
  linkedMapPointId?: string
}

export interface IActivity {
  id: string
  user: string
  action: 'tap' | 'view'
  details: {
    visitorId?: string
    image: string
    title: string
    headline: string
    link?: string
    room?: string
    hotel?: string
    time?: number
    device?: string
    engaged?: boolean
    language?: string
    socialLink?: string
  }
  createdAt: string
}

export interface IInsights {
  overTime: Record<
    'taps' | 'views' | 'liveViews' | 'uniqueViews' | 'timeSpent' | 'bounceRate' | 'engagedViews',
    Record<string, number>
  >
  change: Record<'taps' | 'views' | 'liveViews' | 'uniqueViews' | 'timeSpent' | 'bounceRate' | 'engagedViews', number>
  keyMetrics: {
    topPerforming: { room: string; link: string }
    viewsByLanguages: Record<string, number>
    viewsByDevices: Record<string, number>
    views: number
    liveViews: number
    taps: number
    uniqueViews: number
    timeSpent: number
    bounceRate: number
  }
  hotels: (IHotel & { views: number; redirects: number })[]
  rooms: (IRoom & {
    views: number
    taps: number
    topPerformingLink: string
    uniqueViews: number
    timeSpent: number
    bounceRate: string
  })[]
  links: (ILink & {
    taps: number
  })[]
  activities: IActivity[]
  topRoom: IRoom & {
    views: number
    taps: number
    topPerformingLink: string
    uniqueViews: number
    timeSpent: number
    bounceRate: string
  }
  topLink: ILink & {
    taps: number
  }
}

// Orders types
export interface IOrderCategory {
  id: string
  hotelId: string
  name: string
  icon: string
  availableFrom?: string
  availableTo?: string
  sortOrder: number
  active: boolean
  createdAt: string
  parentId?: string | null
}

export interface ICatalogItem {
  id: string
  hotelId: string
  categoryId: string
  name: string
  description?: string
  price: number
  discount?: number
  imageType: 'emoji' | 'url' | 'upload'
  image?: string
  tags?: string[]
  badge?: 'new' | 'hit' | 'sale' | ''
  available: boolean
  sortOrder: number
  createdAt: string
  type?: 'instant' | 'bookable'
  bookingConfig?: {
    bookableCategory?: string
    bookingModel?: string
    totalInventory?: number
    capacityPerUnit?: number
    minPersons?: number
    duration?: number
    bufferMinutes?: number
    startInterval?: number
    advanceMinHours?: number
    advanceMaxDays?: number
    confirmationType?: string
    pricePerPerson?: boolean
    cancellationPolicy?: string
    cancellationPolicyHours?: number
    addons?: { _id: string; name: string; price: number; description: string }[]
    simpleAvailability?: { enabled: boolean; from: string; to: string }
    weeklySchedule?: Record<string, { from: string; to: string }[]>

    // legacy fields
    slotType?: string
    maxPersons?: number
    cancelPolicyHours?: number
    requiresApproval?: boolean
    resourceIds?: string[]
  }
}

export type OrderStatus = 'Awaiting confirmation' | 'Processing' | 'On the way' | 'Completed' | 'Cancelled'

export interface IGuestOrderItem {
  itemId: string
  name: string
  qty: number
  price: number
  originalPrice: number
  image?: string
}

export interface IGuestOrder {
  id: string
  orderId: string
  hotelId: string
  roomId: string
  roomNumber: string
  items: IGuestOrderItem[]
  status: OrderStatus
  note?: string
  guestEmail?: string
  guestRoomNumber?: string
  total?: number
  acceptedEta?: number
  acceptedAt?: string
  completedAt?: string
  rating?: number
  ratingComment?: string
  discountCode?: string
  discountAmount?: number
  originalTotal?: number
  createdAt: string
}

export type StaffPermission =
  | 'orders:view'
  | 'orders:accept'
  | 'orders:complete'
  | 'orders:cancel'
  | 'bookings:view'
  | 'bookings:confirm'
  | 'bookings:cancel'
  | 'housekeeping:view'
  | 'housekeeping:manage'
  | 'maintenance:view'
  | 'maintenance:manage'
  | 'catalog:view'
  | 'catalog:manage'
  | 'staff:view'
  | 'staff:manage'
  | 'analytics:view'
  | 'settings:manage'

export interface IStaffRole {
  id: string
  hotelId?: string | null
  name: string
  permissions: StaffPermission[]
  visibleModules: string[]
  isTemplate?: boolean
}

export interface INotificationGroup {
  id: string
  hotelId?: string
  name: string
  emailAddresses: string[]
  sseEnabled: boolean
}

export interface IStaffMember {
  id: string
  hotelId?: string
  name: string
  roleId: string | IStaffRole
  groupIds: string[] | INotificationGroup[]
  isActive: boolean
}

export interface IDispatchRuleConditions {
  categoryIds: string[]
  itemIds: string[]
  eventTypes: ('order' | 'booking' | 'housekeeping' | 'maintenance')[]
}

export interface IDispatchRule {
  id: string
  hotelId?: string
  name: string
  priority: number
  conditions: IDispatchRuleConditions
  targetGroupId: string | INotificationGroup
  escalationSeconds: number
  active: boolean
}

export interface IOrderAnalytics {
  totalOrders: number
  totalRevenue: number
  avgOrderValue: number
  completedOrders: number
  cancelledOrders: number
  pendingOrders: number
  avgFulfillTime: number | null
  avgFulfillmentTime: number | null
  avgRating: number | null
  byStatus: Record<string, number>
  byPayment: Record<string, number>
  topItems: { itemId: string; name: string; count: number; revenue: number }[]
  topRooms: { roomId: string; roomNumber: string; count: number; revenue: number }[]
  overTime: { date: string; orders: number; revenue: number }[]
}

export interface IReservationCode {
  id: string
  hotelId: string
  roomId?: string
  roomNumber?: string
  code: string
  guestName?: string
  checkIn: string
  checkOut: string
  active: boolean
  source?: 'manual' | 'booking' | 'airbnb' | 'vrbo' | 'agoda' | 'tripadvisor' | 'custom'
  externalUid?: string
  createdAt: string
}

export type ICalPlatform = 'booking' | 'airbnb' | 'vrbo' | 'agoda' | 'tripadvisor' | 'custom'

export type DiscountType = 'percentage' | 'fixed'

export interface IDiscountCode {
  id: string
  hotelId: string
  code: string
  description?: string
  discountType: DiscountType
  discountValue: number
  applicableCategories: string[]
  validFrom?: string
  validTo?: string
  maxUses?: number
  usedCount: number
  minOrderAmount?: number
  isActive: boolean
  createdAt: string
}

export interface IICalSource {
  id: string
  hotelId: string
  platform: ICalPlatform
  label: string
  url: string
  enabled: boolean
  lastSyncAt: string | null
  lastSyncStatus: 'success' | 'error' | null
  lastSyncError: string | null
  createdAt: string
}

export interface IOrderSettings {
  enabled: boolean
  availableFrom: string
  availableTo: string
  currencySymbol: string
  processingLabel: string
  onTheWayLabel: string
  completedLabel: string
  emails?: string[]
  paymentMethods?: {
    cash: boolean
    card: boolean
    online: boolean
  }

  // Venue mode
  venueType?: 'hotel' | 'restaurant'
  requireCode?: boolean
  requireLocation?: boolean
  locationLabel?: string
  tablePin?: string
  kioskMode?: boolean
}

export interface IBookingSettings {
  emails?: string[]
}

export interface ISurveyAnswerItem {
  questionId?: string
  questionText: string
  questionType?: string
  answer: any
}

export interface IFeedbackSubmission {
  id: string
  room: { id: string; number: string } | string
  hotel: string
  rating?: number
  email?: string
  message?: string
  surveyAnswers?: ISurveyAnswerItem[]
  createdAt: string
}
