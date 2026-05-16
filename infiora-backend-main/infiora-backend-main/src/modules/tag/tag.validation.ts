import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { NewCreatedTag } from './tag.interfaces';

const createTagBody: Record<keyof NewCreatedTag, any> = {
  batch: Joi.required().custom(objectId),
};

export const createTag = {
  body: Joi.object().keys(createTagBody),
};

export const getTags = {
  query: Joi.object().keys({
    search: Joi.string(),
    batch: Joi.custom(objectId),
    room: Joi.custom(objectId),
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const getTag = {
  params: Joi.object().keys({
    tagId: Joi.required().custom(objectId),
  }),
};

export const updateTag = {
  params: Joi.object().keys({
    tagId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    name: Joi.string(),
    isActive: Joi.boolean(),
  }),
};

export const deleteTag = {
  params: Joi.object().keys({
    tagId: Joi.required().custom(objectId),
  }),
};

export const linkTag = {
  params: Joi.object().keys({
    tagId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    room: Joi.required().custom(objectId),
    type: Joi.string(),
  }),
};

export const unlinkTag = {
  params: Joi.object().keys({
    tagId: Joi.required().custom(objectId),
  }),
};

export const exportTags = {
  query: Joi.object().keys({
    batch: Joi.custom(objectId),
    room: Joi.custom(objectId),
  }),
};
