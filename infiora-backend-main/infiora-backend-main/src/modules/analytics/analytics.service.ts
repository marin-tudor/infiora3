import mongoose, { type PipelineStage } from 'mongoose';
import GuestOrder from '../orders/guest-order.model';
import Booking from '../booking/booking.model';
import { runAggregateExplainCheck, runQueryExplainCheck } from './analyticsExplain';

export const getAnalytics = async (hotelId: string, from: Date, to: Date) => {
  const hid = new mongoose.Types.ObjectId(hotelId);
  const base = { hotelId: hid, createdAt: { $gte: from, $lte: to } };
  const revenueByCategoryPipeline: PipelineStage[] = [
    { $match: { ...base, status: 'Completed' } },
    { $unwind: '$items' },
    { $lookup: { from: 'catalogitems', localField: 'items.itemId', foreignField: '_id', as: 'item' } },
    { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$item.categoryId',
        categoryName: { $first: '$item.categoryName' },
        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
        orderCount: { $addToSet: '$_id' },
      },
    },
    { $project: { categoryName: 1, totalRevenue: 1, orderCount: { $size: '$orderCount' } } },
    { $sort: { totalRevenue: -1 } },
  ];
  const acceptanceStatsPipeline: PipelineStage[] = [
    { $match: { ...base, acceptedAt: { $ne: null } } },
    { $project: { diffMs: { $subtract: ['$acceptedAt', '$createdAt'] } } },
    { $group: { _id: null, avgMs: { $avg: '$diffMs' }, count: { $sum: 1 } } },
  ];
  const slaBreachesFilter = {
    hotelId: hid,
    status: 'Awaiting confirmation',
    createdAt: { $gte: from, $lte: new Date(Math.min(to.getTime(), Date.now() - 5 * 60_000)) },
  };
  const dailyRatingsPipeline: PipelineStage[] = [
    { $match: { ...base, rating: { $ne: null } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 as 1 } },
  ];
  const bookingStatsPipeline: PipelineStage[] = [
    { $match: { ...base, status: { $in: ['confirmed', 'completed'] } } },
    { $group: { _id: null, total: { $sum: 1 }, revenue: { $sum: '$total' } } },
  ];

  await Promise.all([
    runAggregateExplainCheck('analytics.revenueByCategory', GuestOrder, revenueByCategoryPipeline),
    runAggregateExplainCheck('analytics.acceptanceStats', GuestOrder, acceptanceStatsPipeline),
    runQueryExplainCheck('analytics.slaBreaches', GuestOrder.find(slaBreachesFilter).limit(1)),
    runAggregateExplainCheck('analytics.dailyRatings', GuestOrder, dailyRatingsPipeline),
    runAggregateExplainCheck('analytics.bookingStats', Booking, bookingStatsPipeline),
  ]);

  const [revenueByCategory, acceptanceStats, slaBreaches, dailyRatings, bookingStats] = await Promise.all([
    GuestOrder.aggregate(revenueByCategoryPipeline),
    GuestOrder.aggregate(acceptanceStatsPipeline),
    GuestOrder.countDocuments(slaBreachesFilter),
    GuestOrder.aggregate(dailyRatingsPipeline),
    Booking.aggregate(bookingStatsPipeline),
  ]);

  return {
    revenueByCategory,
    avgAcceptanceMs: acceptanceStats[0]?.avgMs ?? 0,
    slaBreaches,
    dailyRatings,
    bookings: bookingStats[0] ?? { total: 0, revenue: 0 },
  };
};
