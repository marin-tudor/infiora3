import Joi from 'joi';

const createBooking = {
  body: Joi.object().keys({
    itemId: Joi.string().required(),
    startTime: Joi.date().iso().required(),
    partySize: Joi.number().integer().min(1).required(),
    guestEmail: Joi.string().email().required(),
    guestRoomNumber: Joi.string().required(),
    roomId: Joi.string().required(),
    code: Joi.string().allow('', null),
    discountCode: Joi.string().allow('', null).max(64),
    idempotencyKey: Joi.string().trim().guid({ version: ['uuidv4'] }).allow('', null).max(64),
    note: Joi.string().allow('').optional(),
    payment: Joi.string().valid('room', 'cash', 'card', 'online').required(),
    stripePaymentIntentId: Joi.string().allow('', null).max(255),
    guestCheckoutId: Joi.string().allow('', null).max(128),
    selectedAddons: Joi.array()
      .items(
        Joi.object().keys({
          addonId: Joi.string().required(),
          name: Joi.string().required(),
          price: Joi.number().required(),
        })
      )
      .optional(),
  }),
};

const createBookingPaymentIntent = {
  params: Joi.object().keys({
    hotelId: Joi.string().required(),
  }),
  body: Joi.object().keys({
    itemId: Joi.string().required(),
    partySize: Joi.number().integer().min(1).required(),
    discountCode: Joi.string().allow('', null).max(64),
    selectedAddons: Joi.array()
      .items(
        Joi.object().keys({
          addonId: Joi.string().required(),
          name: Joi.string().required(),
          price: Joi.number().required(),
        })
      )
      .optional(),
  }),
};

const updateBooking = {
  body: Joi.object().keys({
    status: Joi.string().valid('confirmed', 'cancelled', 'completed', 'no_show').optional(),
    staffNote: Joi.string().allow('').optional(),
    staffMemberId: Joi.string().optional(),
    cancelledBy: Joi.string().valid('guest', 'staff').optional(),
  }),
};

const addToWaitlist = {
  body: Joi.object().keys({
    itemId: Joi.string().required(),
    slotStartTime: Joi.date().iso().required(),
    guestEmail: Joi.string().email().required(),
    guestRoomNumber: Joi.string().required(),
    partySize: Joi.number().integer().min(1).required(),
  }),
};

const blockSlot = {
  params: Joi.object().keys({
    slotId: Joi.string().required(),
  }),
};

const cancelGuestBooking = {
  params: Joi.object().keys({
    bookingId: Joi.string().required(),
  }),
  body: Joi.object().keys({
    token: Joi.string().min(20).required(),
  }),
};

export default { createBooking, createBookingPaymentIntent, updateBooking, addToWaitlist, blockSlot, cancelGuestBooking };
