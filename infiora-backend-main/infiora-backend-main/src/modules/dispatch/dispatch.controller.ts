import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import * as dispatchService from './dispatch.service';

export const createGroup = catchAsync(async (req: Request, res: Response) => {
  const group = await dispatchService.createGroup(req.params['hotelId']!, req.body);
  res.status(httpStatus.CREATED).json(group);
});

export const getGroups = catchAsync(async (req: Request, res: Response) => {
  const groups = await dispatchService.getGroups(req.params['hotelId']!);
  res.json(groups);
});

export const updateGroup = catchAsync(async (req: Request, res: Response) => {
  const group = await dispatchService.updateGroup(req.params['hotelId']!, req.params['groupId']!, req.body);
  res.json(group);
});

export const deleteGroup = catchAsync(async (req: Request, res: Response) => {
  await dispatchService.deleteGroup(req.params['hotelId']!, req.params['groupId']!);
  res.status(httpStatus.NO_CONTENT).send();
});

export const createRule = catchAsync(async (req: Request, res: Response) => {
  const rule = await dispatchService.createRule(req.params['hotelId']!, req.body);
  res.status(httpStatus.CREATED).json(rule);
});

export const getRules = catchAsync(async (req: Request, res: Response) => {
  const rules = await dispatchService.getRules(req.params['hotelId']!);
  res.json(rules);
});

export const updateRule = catchAsync(async (req: Request, res: Response) => {
  const rule = await dispatchService.updateRule(req.params['hotelId']!, req.params['ruleId']!, req.body);
  res.json(rule);
});

export const deleteRule = catchAsync(async (req: Request, res: Response) => {
  await dispatchService.deleteRule(req.params['hotelId']!, req.params['ruleId']!);
  res.status(httpStatus.NO_CONTENT).send();
});
