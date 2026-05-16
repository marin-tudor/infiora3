import httpStatus from 'http-status';
import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import pick from '../utils/pick';
import { IOptions } from '../paginate/paginate';
import * as userService from './user.service';
import { match } from '../utils';
import { toObjectId } from '../utils/mongoUtils';
import * as insightService from '../insight/insight.service';

export const getCurrentUser = catchAsync(async (req: Request, res: Response) => {
  res.send(req.user);
});

export const getUsers = catchAsync(async (req: Request, res: Response) => {
  const s = req.user.role === 'manager' ? { $or: [{ managers: { $in: [req.user.id] } }, { _id: req.user.id }] } : {};
  const filter = {
    ...s,
    ...pick(req.query, ['role', 'name', 'email', '_id']),
    ...match(req.query, ['name', 'email', '_id']),
  };
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const result = await userService.queryUsers(filter, options);
  res.send(result);
});

export const getUser = catchAsync(async (req: Request, res: Response) => {
  const userId = toObjectId(req.params['userId']);
  const user = await userService.getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(user);
});

export const createUser = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send(user);
});

export const updateUserById = catchAsync(async (req: Request, res: Response) => {
  const userId = toObjectId(req.params['userId']);
  const user = await userService.updateUserById(userId, req.body);
  res.send(user);
});

export const updateUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const user = await userService.updateUserById(userId, req.body);
  res.send(user);
});

export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const userId = toObjectId(req.params['userId']);
  await userService.deleteUserById(userId);
  res.status(httpStatus.NO_CONTENT).send();
});

export const getInsights = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate } = pick(req.query, ['startDate', 'endDate']);
  const insights = await insightService.getAdminInsights({ startDate, endDate, reqUser: req.user });
  res.send(insights);
});
