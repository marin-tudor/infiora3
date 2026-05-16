import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { NewCreatedLink } from './link.interfaces';
import { HOTEL_MAP_MARKER_ICONS } from '../hotel/hotel.interfaces';

const sectionSchema = Joi.object({
  id: Joi.string().allow(null, ''),
  title: Joi.string(),
  description: Joi.string().allow(null, ''),
  url: Joi.string().allow(null, ''),
  urlButtonText: Joi.string().allow(null, ''),
  phone: Joi.string().allow(null, ''),
  address: Joi.string().allow(null, ''),
  images: Joi.any(),
  video: Joi.string().allow(null, ''),
  items: Joi.any(),
  mapEnabled: Joi.boolean(),
  mapTitle: Joi.string().allow(null, ''),
  mapDescription: Joi.string().allow(null, ''),
  mapImage: Joi.any(),
  mapLat: Joi.number().min(-90).max(90).allow(null),
  mapLng: Joi.number().min(-180).max(180).allow(null),
  mapColor: Joi.string().allow(null, ''),
  mapIcon: Joi.string()
    .valid(...HOTEL_MAP_MARKER_ICONS)
    .allow(null, ''),
  linkedMapPointId: Joi.string().allow(null, ''),
});

const createLinkBody: Record<keyof NewCreatedLink, any> = {
  room: Joi.custom(objectId),
  group: Joi.custom(objectId),
  title: Joi.string(),
  value: Joi.string(),
  type: Joi.string(),
  items: Joi.any(),
  sections: Joi.alternatives().try(Joi.array().items(sectionSchema), Joi.any()),
  imageType: Joi.string().valid('none', 'icon', 'image', 'url'),
  image: Joi.any(),
  data: Joi.any(),
};

export const createLink = {
  body: Joi.object().keys(createLinkBody),
};

export const getLinks = {
  query: Joi.object().keys({
    room: Joi.custom(objectId),
    group: Joi.custom(objectId),
    search: Joi.string(),
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const getLink = {
  params: Joi.object().keys({
    linkId: Joi.required().custom(objectId),
  }),
  query: Joi.object().keys({
    room: Joi.custom(objectId),
    item: Joi.custom(objectId),
    device: Joi.string(),
    language: Joi.string(),
  }),
};

export const updateLink = {
  params: Joi.object().keys({
    linkId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    title: Joi.string(),
    value: Joi.string(),
    type: Joi.string(),
    items: Joi.any(),
    sections: Joi.alternatives().try(Joi.array().items(sectionSchema), Joi.any()),
    imageType: Joi.string().valid('none', 'icon', 'image', 'url'),
    image: Joi.any(),
    isActive: Joi.boolean(),
    data: Joi.any(),
  }),
};

export const deleteLink = {
  params: Joi.object().keys({
    linkId: Joi.required().custom(objectId),
  }),
};

export const reorderLinks = {
  params: Joi.object({
    id: Joi.required().custom(objectId),
  }),
  body: Joi.object({
    orderedLinks: Joi.array().items(Joi.custom(objectId)).required(),
  }),
};
