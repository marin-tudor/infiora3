import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { NewCreatedRoom, UpdateRoomBody } from './room.interfaces';
import { NewCreatedFeedback } from '../feedback/feedback.interfaces';

export const createRoom = {
  body: Joi.object<NewCreatedRoom>({
    hotel: Joi.required().custom(objectId),
    quantity: Joi.number().integer().min(1).max(100).required(),
    suffix: Joi.string().allow(null, ''),
    prefix: Joi.string().allow(null, ''),
    start: Joi.number().integer().min(1).allow(null, ''),
  }),
};

export const getRooms = {
  query: Joi.object().keys({
    hotel: Joi.custom(objectId),
    search: Joi.string(),
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer().min(1).max(50),
    page: Joi.number().integer(),
  }),
};

export const getRoom = {
  params: Joi.object().keys({
    roomId: Joi.required().custom(objectId),
  }),
  query: Joi.object().keys({
    lang: Joi.string(),
  }),
};

export const createRoomActivity = {
  params: Joi.object().keys({
    roomId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    action: Joi.string().valid('view', 'tap').required(),
    visitorId: Joi.string().max(128).allow('', null),
    device: Joi.string().max(32).allow('', null),
    language: Joi.string().max(80).allow('', null),
    button: Joi.string().valid('housekeeping', 'maintenance', 'offlineGuide').allow(null, ''),
    buttonTitle: Joi.string().allow(null, '').max(120),
  }),
};

export const updateRoomActivity = {
  params: Joi.object().keys({
    roomId: Joi.required().custom(objectId),
    activityId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      time: Joi.number()
        .min(0)
        .max(24 * 60 * 60),
      engaged: Joi.boolean(),
      language: Joi.string().max(80).allow('', null),
    })
    .min(1),
};

export const updateRoom = {
  params: Joi.object().keys({
    roomId: Joi.required().custom(objectId),
  }),
  body: Joi.object<UpdateRoomBody>({
    number: Joi.string(),
    description: Joi.string().allow(null, ''),
    group: Joi.custom(objectId).allow(null, ''),
    orderedLinks: Joi.array().items(Joi.custom(objectId)),
    background: Joi.object()
      .keys({
        color: Joi.string().allow(null, ''),
        direction: Joi.string().allow(null, ''),
        type: Joi.string().allow(null, ''),
        image: Joi.any(),
        imageOpacity: Joi.number().allow(null),
        backgroundFit: Joi.string().allow(null, ''),
        backgroundPosition: Joi.string().allow(null, ''),
        tileSize: Joi.number().allow(null),
      })
      .allow(null, ''),
    font: Joi.object()
      .keys({
        color: Joi.string().allow(null, ''),
        family: Joi.string().allow(null, ''),
      })
      .allow(null, ''),
    button: Joi.object()
      .keys({
        color: Joi.string().allow(null, ''),
        backgroundColor: Joi.string().allow(null, ''),
        variant: Joi.string().allow(null, ''),
        borderRadius: Joi.string().allow(null, ''),
      })
      .allow(null, ''),
    popup: Joi.any(),
    newsletter: Joi.object()
      .keys({
        message: Joi.string().allow(null, ''),
        successMessage: Joi.string().allow(null, ''),
        buttonText: Joi.string().allow(null, ''),
        mainButtonText: Joi.string().allow(null, ''),
        type: Joi.string().allow(null, ''),
        color: Joi.string().allow(null, ''),
        imageType: Joi.string().valid('none', 'icon', 'image', 'url'),
        image: Joi.any(),
        isActive: Joi.boolean(),
      })
      .allow(null, ''),
    feedback: Joi.any(),
    survey: Joi.object()
      .keys({
        isActive: Joi.boolean(),
        type: Joi.string().valid('popup', 'button').allow(null, ''),
        buttonText: Joi.string().allow(null, ''),
        mainButtonText: Joi.string().allow(null, ''),
        imageType: Joi.string().valid('none', 'icon', 'image', 'url'),
        image: Joi.any(),
        questions: Joi.array().items(
          Joi.object({
            id: Joi.string(),
            type: Joi.string().valid(
              'rating',
              'yes_no',
              'single_choice',
              'multi_choice',
              'open_text',
              'nps',
              'matrix',
              'contact'
            ),
            text: Joi.string().allow(''),
            options: Joi.array().items(Joi.string()),
            matrixRows: Joi.array().items(Joi.string()),
            matrixColumns: Joi.array().items(Joi.string()),
            required: Joi.boolean(),
          })
        ),
      })
      .allow(null, ''),
    isActive: Joi.boolean(),
    kioskMode: Joi.boolean(),
    housekeeping: Joi.object()
      .keys({
        isActive: Joi.boolean(),
        mainButtonText: Joi.string().allow(null, ''),
        icon: Joi.string().allow(null, ''),
        emails: Joi.array().items(Joi.string().email()).max(20),
        askRoomNumber: Joi.boolean(),
        roomNumberLabel: Joi.string().allow(null, ''),
        askReservationCode: Joi.boolean(),
        reservationCodeLabel: Joi.string().allow(null, ''),
        options: Joi.array().items(
          Joi.object().keys({
            key: Joi.string().allow(null, ''),
            label: Joi.string().allow(null, ''),
            icon: Joi.string().allow(null, ''),
          })
        ),
      })
      .allow(null),
    maintenance: Joi.object()
      .keys({
        isActive: Joi.boolean(),
        mainButtonText: Joi.string().allow(null, ''),
        icon: Joi.string().allow(null, ''),
        emails: Joi.array().items(Joi.string().email()).max(20),
        askRoomNumber: Joi.boolean(),
        roomNumberLabel: Joi.string().allow(null, ''),
        askReservationCode: Joi.boolean(),
        reservationCodeLabel: Joi.string().allow(null, ''),
        options: Joi.array().items(
          Joi.object().keys({ key: Joi.string().allow(null, ''), label: Joi.string().allow(null, '') })
        ),
      })
      .allow(null),
  }),
};

export const deleteRoom = {
  params: Joi.object().keys({
    roomId: Joi.required().custom(objectId),
  }),
};

export const createFeedback = {
  body: Joi.object<Partial<NewCreatedFeedback>>({
    room: Joi.required().custom(objectId),
    rating: Joi.number().min(0).max(10),
    email: Joi.string().trim().email().allow(null, ''),
    message: Joi.string().trim().max(2000).allow(null, ''),
    surveyAnswers: Joi.array().items(
      Joi.object({
        questionId: Joi.string().max(120),
        questionText: Joi.string().allow(''),
        questionType: Joi.string().max(64),
        answer: Joi.any(),
      })
    ),
  }),
};

export const getFeedbacks = {
  query: Joi.object().keys({
    room: Joi.custom(objectId),
    hotel: Joi.required().custom(objectId),
    startDate: Joi.string(),
    endDate: Joi.string(),
    search: Joi.string(),
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const exportRooms = {
  query: Joi.object().keys({
    hotel: Joi.custom(objectId),
  }),
};
