import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { NewCreatedBatch } from './batch.interfaces';

const createBatchBody: Record<keyof NewCreatedBatch, any> = {
  name: Joi.string(),
  description: Joi.string(),
  quantity: Joi.number(),
};

export const createBatch = {
  body: Joi.object().keys(createBatchBody),
};

export const getBatches = {
  query: Joi.object().keys({
    search: Joi.string(),
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const getBatch = {
  params: Joi.object().keys({
    batchId: Joi.required().custom(objectId),
  }),
};

export const updateBatch = {
  params: Joi.object().keys({
    batchId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    name: Joi.string(),
    description: Joi.string(),
  }),
};

export const deleteBatch = {
  params: Joi.object().keys({
    batchId: Joi.required().custom(objectId),
  }),
};
