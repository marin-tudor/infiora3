import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { getAnalytics } from './analytics.service';

export const getHotelAnalytics = catchAsync(async (req: Request, res: Response) => {
  const from = req.query['from'] ? new Date(req.query['from'] as string) : new Date(Date.now() - 30 * 86_400_000);
  const to = req.query['to'] ? new Date(req.query['to'] as string) : new Date();

  res.json(await getAnalytics(req.params['hotelId']!, from, to));
});
