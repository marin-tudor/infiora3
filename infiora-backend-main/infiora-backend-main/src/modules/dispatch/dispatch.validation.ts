import Joi from 'joi';
import { DISPATCH_EVENT_TYPES } from './dispatch.interfaces';

const createGroup = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    emailAddresses: Joi.array().items(Joi.string().email()).default([]),
    sseEnabled: Joi.boolean().default(true),
  }),
};

const updateGroup = {
  params: Joi.object().keys({ groupId: Joi.string().required() }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      emailAddresses: Joi.array().items(Joi.string().email()),
      sseEnabled: Joi.boolean(),
    })
    .min(1),
};

const conditionsSchema = Joi.object({
  categoryIds: Joi.array().items(Joi.string()).default([]),
  itemIds: Joi.array().items(Joi.string()).default([]),
  eventTypes: Joi.array()
    .items(Joi.string().valid(...DISPATCH_EVENT_TYPES))
    .min(1)
    .required(),
});

const createRule = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    priority: Joi.number().integer().min(0).required(),
    conditions: conditionsSchema.required(),
    targetGroupId: Joi.string().required(),
    escalationSeconds: Joi.number().integer().min(5).default(30),
    active: Joi.boolean(),
  }),
};

const updateRule = {
  params: Joi.object().keys({ ruleId: Joi.string().required() }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      priority: Joi.number().integer().min(0),
      conditions: conditionsSchema,
      targetGroupId: Joi.string(),
      escalationSeconds: Joi.number().integer().min(5),
      active: Joi.boolean(),
    })
    .min(1),
};

export default { createGroup, updateGroup, createRule, updateRule };
