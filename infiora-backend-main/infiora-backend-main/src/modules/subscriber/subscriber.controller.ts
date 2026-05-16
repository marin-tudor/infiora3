import httpStatus from 'http-status';
import { Request, Response } from 'express';
import { json2csv } from 'json-2-csv';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import * as subscriberService from './subscriber.service';
import { pick, match } from '../utils';
import { IOptions } from '../paginate/paginate';
import { toObjectId } from '../utils/mongoUtils';
import { toDate } from '../utils/miscUtils';

export const getSubscribers = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate } = pick(req.query, ['startDate', 'endDate']);
  const { start, end } = toDate({ startDate, endDate });
  const filter = {
    createdAt: { $gte: start, $lte: end },
    ...pick(req.query, ['user', 'room']),
    ...match(req.query, ['email']),
  };
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const result = await subscriberService.querySubscribers(filter, options);
  res.send(result);
});

export const getSubscriber = catchAsync(async (req: Request, res: Response) => {
  const subscriberId = toObjectId(req.params['subscriberId']);
  const subscriber = await subscriberService.getSubscriberById(subscriberId);
  if (!subscriber) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Subscriber not found');
  }
  res.send(subscriber);
});

export const createSubscriber = catchAsync(async (req: Request, res: Response) => {
  const subscriber = await subscriberService.createSubscriber(req.body);
  res.status(httpStatus.CREATED).send(subscriber);
});

export const updateSubscriber = catchAsync(async (req: Request, res: Response) => {
  const subscriberId = toObjectId(req.params['subscriberId']);
  const subscriber = await subscriberService.updateSubscriberById(subscriberId, req.body);
  res.send(subscriber);
});

export const deleteSubscriber = catchAsync(async (req: Request, res: Response) => {
  const subscriberId = toObjectId(req.params['subscriberId']);
  await subscriberService.deleteSubscriberById(subscriberId);
  res.status(httpStatus.NO_CONTENT).send();
});

export const exportSubscribers = catchAsync(async (req: Request, res: Response) => {
  const filter = {
    ...pick(req.query, ['user', 'room']),
    ...match(req.query, ['email']),
  };
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const result = await subscriberService.querySubscribers(filter, options);
  const csv = json2csv(result.results.map((s: any) => ({ email: s.email })));
  res.set('Content-Type', `text/csv; name="subscribers.csv"`);
  res.set('Content-Disposition', `inline; filename="subscribers.csv"`);
  res.send(csv);
});
