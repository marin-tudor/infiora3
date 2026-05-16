import Joi from 'joi';
import { ALL_PERMISSIONS } from './staff.interfaces';

const createRole = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    permissions: Joi.array()
      .items(Joi.string().valid(...ALL_PERMISSIONS))
      .default([]),
    visibleModules: Joi.array().items(Joi.string()).default([]),
  }),
};

const updateRole = {
  params: Joi.object().keys({ roleId: Joi.string().required() }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      permissions: Joi.array().items(Joi.string().valid(...ALL_PERMISSIONS)),
      visibleModules: Joi.array().items(Joi.string()),
    })
    .min(1),
};

const createMember = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    pin: Joi.string().length(4).pattern(/^\d+$/).required(),
    roleId: Joi.string().required(),
    groupIds: Joi.array().items(Joi.string()).default([]),
    isActive: Joi.boolean(),
  }),
};

const updateMember = {
  params: Joi.object().keys({ memberId: Joi.string().required() }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      pin: Joi.string().length(4).pattern(/^\d+$/),
      roleId: Joi.string(),
      groupIds: Joi.array().items(Joi.string()),
      isActive: Joi.boolean(),
    })
    .min(1),
};

const verifyPin = {
  body: Joi.object().keys({
    pin: Joi.string().length(4).pattern(/^\d+$/).required(),
  }),
};

export default { createRole, updateRole, createMember, updateMember, verifyPin };
