import Joi from 'joi';
import { password, objectId } from '../validate/custom.validation';
import { NewCreatedUser } from './user.interfaces';

const createUserBody: Record<keyof NewCreatedUser, any> = {
  email: Joi.string().required().email(),
  password: Joi.string().required().custom(password),
  name: Joi.string().required(),
  role: Joi.string().valid('user', 'admin', 'manager'),
  managers: Joi.array().items(Joi.string().custom(objectId)),
};

export const createUser = {
  body: Joi.object().keys(createUserBody),
};

export const getUsers = {
  query: Joi.object().keys({
    search: Joi.string(),
    name: Joi.string(),
    email: Joi.string(),
    _id: Joi.string(),
    role: Joi.string(),
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const getUser = {
  params: Joi.object().keys({
    userId: Joi.required().custom(objectId),
  }),
};

export const updateUserById = {
  params: Joi.object().keys({
    userId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      password: Joi.string().custom(password),
      name: Joi.string(),
      role: Joi.string().valid('user', 'admin', 'manager'),
      language: Joi.string(),
      isActive: Joi.boolean(),
      managers: Joi.array().items(Joi.string().custom(objectId)),
    })
    .min(1),
};

export const updateUser = {
  params: Joi.object().keys({
    userId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      password: Joi.string().custom(password),
      name: Joi.string(),
      language: Joi.string(),
    })
    .min(1),
};

export const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.required().custom(objectId),
  }),
};
