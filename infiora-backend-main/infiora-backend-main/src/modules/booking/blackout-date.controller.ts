import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import BlackoutDate from './blackout-date.model';

export const listBlackoutDates = catchAsync(async (req: Request, res: Response) => {
  const filter: any = { hotelId: req.params['hotelId'] };
  if (req.query['itemId']) filter.itemId = req.query['itemId'];
  if (req.query['from']) filter.date = { $gte: req.query['from'] };
  res.json(await BlackoutDate.find(filter).sort({ date: 1 }));
});

export const createBlackoutDate = catchAsync(async (req: Request, res: Response) => {
  const doc = await BlackoutDate.create({
    ...req.body,
    hotelId: req.params['hotelId'],
    createdBy: (req as any).user?.id,
  });
  res.status(201).json(doc);
});

export const deleteBlackoutDate = catchAsync(async (req: Request, res: Response) => {
  await BlackoutDate.findOneAndDelete({
    _id: req.params['blackoutId'],
    hotelId: req.params['hotelId'],
  });
  res.status(204).send();
});
