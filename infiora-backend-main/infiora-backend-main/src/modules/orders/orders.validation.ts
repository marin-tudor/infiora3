import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { ICreateGuestPaymentIntentBody } from './orders.interfaces';

// ─── Shared ───────────────────────────────────────────────────────────────────

const timePattern = Joi.string()
  .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
  .allow('');

// ─── Public: Catalog ──────────────────────────────────────────────────────────

export const getCatalog = {
  params: Joi.object().keys({
    roomId: Joi.required().custom(objectId),
  }),
};

const selectedModifier = Joi.object({
  group: Joi.string().required(),
  option: Joi.string().required(),
  priceAdj: Joi.number().default(0),
});

export const createGuestPaymentIntent = {
  body: Joi.object<ICreateGuestPaymentIntentBody>().keys({
    roomId: Joi.required().custom(objectId),
    discountCode: Joi.string().allow('', null).max(64),
    items: Joi.array()
      .items(
        Joi.object({
          itemId: Joi.string().required().custom(objectId),
          qty: Joi.number().integer().min(1).required(),
          selectedModifiers: Joi.array().items(selectedModifier).default([]),
        })
      )
      .min(1)
      .required(),
  }),
};

// ─── Public: Place Order ──────────────────────────────────────────────────────

export const placeOrder = {
  params: Joi.object().keys({
    roomId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    code: Joi.string().allow('', null),
    tablePin: Joi.string().allow('', null).max(10),
    guestEmail: Joi.string().email().allow('', null),
    guestRoomNumber: Joi.string().allow('', null).max(20),
    language: Joi.string().allow('', null),
    items: Joi.array()
      .items(
        Joi.object({
          itemId: Joi.string().required().custom(objectId),
          qty: Joi.number().integer().min(1).required(),
          selectedModifiers: Joi.array().items(selectedModifier).default([]),
        })
      )
      .min(1)
      .required(),
    payment: Joi.string().valid('cash', 'card', 'room', 'online').required(),
    note: Joi.string().allow('', null).max(500),
    scheduledFor: Joi.string().isoDate().allow(null),
    discountCode: Joi.string().allow('', null).max(64),
    idempotencyKey: Joi.string()
      .trim()
      .guid({ version: ['uuidv4'] })
      .allow('', null)
      .max(64),
    stripePaymentIntentId: Joi.string().allow('', null).max(255),
    guestCheckoutId: Joi.string().allow('', null).max(255),
  }),
};

// ─── Public: Track Order ──────────────────────────────────────────────────────

export const trackOrder = {
  params: Joi.object().keys({
    orderId: Joi.string().required(),
  }),
  query: Joi.object().keys({}),
};

export const sendGuestStatusLink = {
  params: Joi.object().keys({
    roomId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

export const getGuestStatus = {
  query: Joi.object().keys({}),
};

export const getGuestStatusByBody = {
  body: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

export const validateDiscount = {
  body: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
    code: Joi.string().trim().required().max(64),
    totalAmount: Joi.number().min(0),
    items: Joi.array()
      .items(
        Joi.object({
          itemId: Joi.string().required().custom(objectId),
          qty: Joi.number().integer().min(1).required(),
          categoryId: Joi.string().allow('', null),
          price: Joi.number().min(0),
        })
      )
      .min(1)
      .required(),
  }),
};

// ─── Public: Submit Rating ────────────────────────────────────────────────────

export const submitRating = {
  params: Joi.object().keys({
    orderId: Joi.string().required(),
  }),
  body: Joi.object().keys({
    token: Joi.string().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().allow('', null).max(500),
  }),
};

// ─── Public: Order Page Visit ─────────────────────────────────────────────────

export const trackVisit = {
  params: Joi.object().keys({
    roomId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    visitorId: Joi.string().required().max(64),
    language: Joi.string().allow('', null),
  }),
};

export const convertVisit = {
  params: Joi.object().keys({
    roomId: Joi.required().custom(objectId),
    visitId: Joi.string().required(),
  }),
};

// ─── Admin: Get Orders ────────────────────────────────────────────────────────

export const getOrders = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
  }),
  query: Joi.object().keys({
    status: Joi.string().valid('Awaiting confirmation', 'Processing', 'On the way', 'Completed', 'Cancelled'),
    startDate: Joi.string().isoDate(),
    endDate: Joi.string().isoDate(),
    groupId: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const groupPendingCount = {
  params: Joi.object().keys({
    groupId: Joi.required().custom(objectId),
  }),
};

// ─── Admin: Accept Order ──────────────────────────────────────────────────────

export const acceptOrder = {
  params: Joi.object().keys({
    orderId: Joi.string().required(),
  }),
  body: Joi.object().keys({
    eta: Joi.number().integer().min(1).max(240),
    message: Joi.string().allow('', null).max(500),
  }),
};

// ─── Admin: Cancel Order ──────────────────────────────────────────────────────

export const cancelOrder = {
  params: Joi.object().keys({
    orderId: Joi.string().required(),
  }),
};

export const advanceOrder = {
  params: Joi.object().keys({
    orderId: Joi.string().required(),
  }),
};

// ─── Admin: Categories ────────────────────────────────────────────────────────

export const createCategory = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    name: Joi.string().required().max(80),
    icon: Joi.string().allow('').max(10),
    availableFrom: timePattern,
    availableTo: timePattern,
    active: Joi.boolean(),
    parentId: Joi.custom(objectId).allow(null).optional(),
  }),
};

export const updateCategory = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
    categoryId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    name: Joi.string().max(80),
    icon: Joi.string().allow('').max(10),
    availableFrom: timePattern,
    availableTo: timePattern,
    sortOrder: Joi.number().integer().min(0),
    active: Joi.boolean(),
    parentId: Joi.custom(objectId).allow(null).optional(),
  }),
};

export const deleteCategory = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
    categoryId: Joi.required().custom(objectId),
  }),
};

// ─── Admin: Catalog Items ─────────────────────────────────────────────────────

const modifierOption = Joi.object({
  label: Joi.string().required(),
  priceAdj: Joi.number().default(0),
});

const modifierGroup = Joi.object({
  group: Joi.string().required(),
  required: Joi.boolean().default(false),
  options: Joi.array().items(modifierOption).min(1).required(),
});

const scheduleEntry = Joi.object({ from: Joi.string().allow(''), to: Joi.string().allow('') });

const weeklySchedule = Joi.object({
  mon: Joi.array().items(scheduleEntry).default([]),
  tue: Joi.array().items(scheduleEntry).default([]),
  wed: Joi.array().items(scheduleEntry).default([]),
  thu: Joi.array().items(scheduleEntry).default([]),
  fri: Joi.array().items(scheduleEntry).default([]),
  sat: Joi.array().items(scheduleEntry).default([]),
  sun: Joi.array().items(scheduleEntry).default([]),
});

const bookingConfigSchema = Joi.object({
  slotType: Joi.string().valid('private', 'shared'),
  maxPersons: Joi.number().integer().min(1),
  duration: Joi.number().integer().min(1),
  bufferMinutes: Joi.number().integer().min(0),
  advanceMinHours: Joi.number().min(0),
  advanceMaxDays: Joi.number().integer().min(1),
  requiresApproval: Joi.boolean(),
  cancelPolicyHours: Joi.number().integer().min(0),
  resourceIds: Joi.array().items(Joi.custom(objectId)),
  weeklySchedule,
  bookingModel: Joi.string().valid('exclusive', 'shared'),
  totalInventory: Joi.number().integer().min(1),
  capacityPerUnit: Joi.number().integer().min(1),
  minPersons: Joi.number().integer().min(1),
  startInterval: Joi.number().integer().min(1),
  confirmationType: Joi.string().valid('instant', 'request'),
  pricePerPerson: Joi.boolean(),
  cancellationPolicy: Joi.string().valid('free_24h', 'free_48h', 'non_refundable', 'custom'),
  cancellationPolicyHours: Joi.number().integer().min(0),
  bookableCategory: Joi.string().valid('transfer', 'tour', 'service', 'rental', 'other'),
  addons: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      price: Joi.number().default(0),
      description: Joi.string().allow('').default(''),
    })
  ),
  simpleAvailability: Joi.object({
    enabled: Joi.boolean(),
    from: Joi.string().allow(''),
    to: Joi.string().allow(''),
  }),
});

export const createCatalogItem = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    categoryId: Joi.required().custom(objectId),
    name: Joi.string().required().max(120),
    description: Joi.string().allow('', null).max(500),
    price: Joi.number().min(0).required(),
    discount: Joi.number().integer().min(0).max(90).default(0),
    imageType: Joi.string().valid('emoji', 'url', 'upload').default('emoji'),
    image: Joi.string().allow('', null),
    tags: Joi.array().items(Joi.string()).default([]),
    badge: Joi.string().valid('', 'new', 'hit', 'sale').default(''),
    available: Joi.boolean().default(true),
    availableFrom: timePattern,
    availableTo: timePattern,
    modifiers: Joi.array().items(modifierGroup).default([]),
    type: Joi.string().valid('instant', 'bookable').default('instant'),
    bookingConfig: bookingConfigSchema,
  }),
};

export const updateCatalogItem = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
    itemId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    categoryId: Joi.custom(objectId),
    name: Joi.string().max(120),
    description: Joi.string().allow('', null).max(500),
    price: Joi.number().min(0),
    discount: Joi.number().integer().min(0).max(90),
    imageType: Joi.string().valid('emoji', 'url', 'upload'),
    image: Joi.string().allow('', null),
    tags: Joi.array().items(Joi.string()),
    badge: Joi.string().valid('', 'new', 'hit', 'sale'),
    available: Joi.boolean(),
    availableFrom: timePattern,
    availableTo: timePattern,
    sortOrder: Joi.number().integer().min(0),
    modifiers: Joi.array().items(modifierGroup),
    type: Joi.string().valid('instant', 'bookable'),
    bookingConfig: bookingConfigSchema,
  }),
};

export const deleteCatalogItem = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
    itemId: Joi.required().custom(objectId),
  }),
};

export const toggleCatalogItem = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
    itemId: Joi.required().custom(objectId),
  }),
};

const icalSourceBody = {
  platform: Joi.string().valid('booking', 'airbnb', 'vrbo', 'agoda', 'tripadvisor', 'custom').required(),
  label: Joi.string().trim().max(120).allow('', null),
  url: Joi.string()
    .uri({ scheme: ['https'] })
    .required(),
  enabled: Joi.boolean(),
};

export const createICalSource = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys(icalSourceBody),
};

export const updateICalSource = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
    sourceId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    platform: Joi.string().valid('booking', 'airbnb', 'vrbo', 'agoda', 'tripadvisor', 'custom'),
    label: Joi.string().trim().max(120).allow('', null),
    url: Joi.string().uri({ scheme: ['https'] }),
    enabled: Joi.boolean(),
  }),
};

export const syncICalSource = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
    sourceId: Joi.required().custom(objectId),
  }),
};

export const syncAllICalSources = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
  }),
};

// ─── Admin: Reservation Codes ─────────────────────────────────────────────────

export const createReservationCode = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    roomId: Joi.string().optional().allow('', null),
    roomNumber: Joi.string().allow('', null).max(20),
    code: Joi.string().required().min(4).max(64),
    guestName: Joi.string().allow('', null).max(120),
    checkIn: Joi.string().isoDate().required(),
    checkOut: Joi.string().isoDate().required(),
  }),
};

export const updateReservationCode = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
    codeId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    active: Joi.boolean(),
    guestName: Joi.string().allow('', null).max(120),
    checkIn: Joi.string().isoDate(),
    checkOut: Joi.string().isoDate(),
  }),
};

export const deleteReservationCode = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
    codeId: Joi.required().custom(objectId),
  }),
};

// ─── Admin: Promotions ────────────────────────────────────────────────────────

export const createPromotion = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    name: Joi.string().required().max(80),
    type: Joi.string().valid('percent', 'fixed').required(),
    value: Joi.number().min(0).required(),
    appliesTo: Joi.string().valid('all', 'category', 'items').default('all'),
    categoryIds: Joi.array().items(Joi.custom(objectId)).default([]),
    itemIds: Joi.array().items(Joi.custom(objectId)).default([]),
    availableFrom: timePattern,
    availableTo: timePattern,
    validFrom: Joi.string().isoDate().allow(null),
    validTo: Joi.string().isoDate().allow(null),
  }),
};

export const updatePromotion = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
    promoId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    name: Joi.string().max(80),
    type: Joi.string().valid('percent', 'fixed'),
    value: Joi.number().min(0),
    appliesTo: Joi.string().valid('all', 'category', 'items'),
    categoryIds: Joi.array().items(Joi.custom(objectId)),
    itemIds: Joi.array().items(Joi.custom(objectId)),
    availableFrom: timePattern,
    availableTo: timePattern,
    validFrom: Joi.string().isoDate().allow(null),
    validTo: Joi.string().isoDate().allow(null),
    active: Joi.boolean(),
  }),
};

export const deletePromotion = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
    promoId: Joi.required().custom(objectId),
  }),
};

// ─── Admin: Settings ──────────────────────────────────────────────────────────

export const updateSettings = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    enabled: Joi.boolean(),
    availableFrom: timePattern,
    availableTo: timePattern,
    currencySymbol: Joi.string().max(4),
    processingLabel: Joi.string().max(40),
    onTheWayLabel: Joi.string().max(40),
    completedLabel: Joi.string().max(40),
    emails: Joi.array().items(Joi.string().email()).max(20),
    paymentMethods: Joi.object().keys({
      cash: Joi.boolean(),
      card: Joi.boolean(),
      online: Joi.boolean(),
    }),
    venueType: Joi.string().valid('hotel', 'restaurant'),
    requireCode: Joi.boolean(),
    requireLocation: Joi.boolean(),
    locationLabel: Joi.string().max(40).allow('', null),
    tablePin: Joi.string().max(10).allow('', null),
    kioskMode: Joi.boolean(),
  }),
};

// ─── Admin: Analytics ────────────────────────────────────────────────────────

export const getAnalytics = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
  }),
  query: Joi.object().keys({
    startDate: Joi.string().isoDate(),
    endDate: Joi.string().isoDate(),
  }),
};

// ─── Admin: SSE Stream ────────────────────────────────────────────────────────

export const trackCheckinUsage = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
  }),
};

export const ordersEvents = {
  params: Joi.object().keys({
    hotelId: Joi.required().custom(objectId),
  }),
};
