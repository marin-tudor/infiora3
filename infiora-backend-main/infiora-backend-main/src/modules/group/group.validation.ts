import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { NewCreatedGroup } from './group.interfaces';

const createGroupBody: Record<keyof NewCreatedGroup, any> = {
  hotel: Joi.custom(objectId),
  title: Joi.string().allow(null, ''),
  description: Joi.string().allow(null, ''),
  background: Joi.object().keys({
    color: Joi.string().allow(null, ''),
    direction: Joi.string().allow(null, ''),
    type: Joi.string().allow(null, ''),
    image: Joi.any(),
    imageOpacity: Joi.number().allow(null),
    backgroundFit: Joi.string().allow(null, ''),
    backgroundPosition: Joi.string().allow(null, ''),
    tileSize: Joi.number().allow(null),
  }),
  font: Joi.object().keys({
    color: Joi.string().allow(null, ''),
    family: Joi.string().allow(null, ''),
  }),
  button: Joi.object().keys({
    color: Joi.string().allow(null, ''),
    backgroundColor: Joi.string().allow(null, ''),
    variant: Joi.string().allow(null, ''),
    borderRadius: Joi.string().allow(null, ''),
  }),
  popup: Joi.any(),
  newsletter: Joi.object()
    .keys({
      message: Joi.string().allow(null, ''),
      successMessage: Joi.string().allow(null, ''),
      buttonText: Joi.string().allow(null, ''),
      mainButtonText: Joi.string().allow(null, ''),
      type: Joi.string().allow(null, ''),
      color: Joi.string().allow(null, ''),
      imageType: Joi.string().valid('none', 'icon', 'image', 'url').allow(null, ''),
      image: Joi.any(),
      isActive: Joi.boolean(),
    })
    .allow(null, ''),
  feedback: Joi.any(),
  survey: Joi.any(),
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
};

export const createGroup = {
  body: Joi.object().keys(createGroupBody),
};

export const getGroups = {
  query: Joi.object().keys({
    hotel: Joi.custom(objectId),
    search: Joi.string(),
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const getGroup = {
  params: Joi.object().keys({
    groupId: Joi.required().custom(objectId),
  }),
};

export const updateGroup = {
  params: Joi.object().keys({
    groupId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    title: Joi.string().allow(null, ''),
    description: Joi.string().allow(null, ''),
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
        imageType: Joi.string().valid('none', 'icon', 'image', 'url').allow(null, ''),
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

export const deleteGroup = {
  params: Joi.object().keys({
    groupId: Joi.required().custom(objectId),
  }),
};

export const duplicateGroup = {
  params: Joi.object().keys({
    groupId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    hotel: Joi.custom(objectId).required(),
  }),
};
