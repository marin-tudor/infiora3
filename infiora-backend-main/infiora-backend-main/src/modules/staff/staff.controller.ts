import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import * as staffService from './staff.service';

export const getTemplates = catchAsync(async (_req: Request, res: Response) => {
  const templates = await staffService.getTemplates();
  res.json(templates);
});

export const createRole = catchAsync(async (req: Request, res: Response) => {
  const role = await staffService.createRole(req.params['hotelId']!, req.body);
  res.status(httpStatus.CREATED).json(role);
});

export const getRoles = catchAsync(async (req: Request, res: Response) => {
  const roles = await staffService.getRoles(req.params['hotelId']!);
  res.json(roles);
});

export const updateRole = catchAsync(async (req: Request, res: Response) => {
  const role = await staffService.updateRole(req.params['hotelId']!, req.params['roleId']!, req.body);
  res.json(role);
});

export const deleteRole = catchAsync(async (req: Request, res: Response) => {
  await staffService.deleteRole(req.params['hotelId']!, req.params['roleId']!);
  res.status(httpStatus.NO_CONTENT).send();
});

export const createMember = catchAsync(async (req: Request, res: Response) => {
  const member = await staffService.createMember(req.params['hotelId']!, req.user.id, req.body);
  res.status(httpStatus.CREATED).json(member);
});

export const getMembers = catchAsync(async (req: Request, res: Response) => {
  const members = await staffService.getMembers(req.params['hotelId']!);
  res.json(members);
});

export const updateMember = catchAsync(async (req: Request, res: Response) => {
  const member = await staffService.updateMember(req.params['hotelId']!, req.params['memberId']!, req.body);
  res.json(member);
});

export const deleteMember = catchAsync(async (req: Request, res: Response) => {
  await staffService.deleteMember(req.params['hotelId']!, req.params['memberId']!);
  res.status(httpStatus.NO_CONTENT).send();
});

export const verifyPin = catchAsync(async (req: Request, res: Response) => {
  const result = await staffService.verifyPin(req.params['hotelId']!, req.body.pin);
  res.json(result);
});
