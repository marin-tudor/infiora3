import mongoose from 'mongoose';
import Booking from '../booking/booking.model';
import DispatchRule from '../dispatch/dispatch-rule.model';
import HousekeepingRequest from '../housekeeping/housekeeping.model';
import MaintenanceIssue from '../maintenance/maintenance.model';
import GuestOrder from '../orders/guest-order.model';
import TranslationCache from '../translation-cache/translation-cache.model';
import { listAuditLogs } from '../audit-log/audit-log.service';
import Hotel from './hotel.model';

const dayMs = 24 * 60 * 60 * 1000;

export const getTranslationCacheReview = async (hotelId: string) => {
  const hid = new mongoose.Types.ObjectId(hotelId);
  const [totals, pendingOldest, recentFailures] = await Promise.all([
    TranslationCache.aggregate([
      { $match: { hotel: hid } },
      { $group: { _id: { scope: '$scope', status: '$status' }, count: { $sum: 1 } } },
      { $sort: { '_id.scope': 1, '_id.status': 1 } },
    ]),
    TranslationCache.findOne({ hotel: hid, status: 'pending' }).sort({ createdAt: 1 }).select('scope language createdAt'),
    TranslationCache.find({ hotel: hid, status: 'failed' })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('scope language error updatedAt'),
  ]);

  return {
    totals: totals.map((entry: any) => ({
      scope: entry._id.scope,
      status: entry._id.status,
      count: entry.count,
    })),
    pendingOldest: pendingOldest
      ? {
          scope: pendingOldest.scope,
          language: pendingOldest.targetLanguage,
          createdAt: pendingOldest.createdAt,
        }
      : null,
    recentFailures: recentFailures.map((entry: any) => ({
      scope: entry.scope,
      language: entry.targetLanguage,
      error: entry.error,
      updatedAt: entry.updatedAt,
    })),
  };
};

export const getOperationsOverview = async (hotelId: string) => {
  const hid = new mongoose.Types.ObjectId(hotelId);
  const since = new Date(Date.now() - 30 * dayMs);
  const hotel = await Hotel.findById(hotelId).select('settings.premium features');

  const [
    activeOrders,
    avgAcceptance,
    slaBreaches,
    orderRatings,
    bookingRatings,
    upcomingBookings,
    confirmedBookingRevenue,
    openMaintenance,
    openHousekeeping,
    maintenanceAvgResolution,
    housekeepingAvgResolution,
    maintenanceByType,
    housekeepingByType,
    dispatchStats,
    auditLogs,
    cacheReview,
  ] = await Promise.all([
    GuestOrder.countDocuments({
      hotelId: hid,
      status: { $in: ['Awaiting confirmation', 'Processing', 'On the way'] },
    }),
    GuestOrder.aggregate([
      { $match: { hotelId: hid, acceptedAt: { $ne: null }, createdAt: { $gte: since } } },
      { $project: { diffMs: { $subtract: ['$acceptedAt', '$createdAt'] } } },
      { $group: { _id: null, avgMs: { $avg: '$diffMs' } } },
    ]),
    GuestOrder.countDocuments({
      hotelId: hid,
      status: 'Awaiting confirmation',
      createdAt: { $lte: new Date(Date.now() - 5 * 60 * 1000) },
    }),
    GuestOrder.aggregate([
      { $match: { hotelId: hid, rating: { $ne: null }, createdAt: { $gte: since } } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
    Booking.aggregate([
      { $match: { hotelId: hid, rating: { $ne: null }, createdAt: { $gte: since } } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
    Booking.countDocuments({
      hotelId: hid,
      startTime: { $gte: new Date() },
      status: { $in: ['pending', 'confirmed'] },
    }),
    Booking.aggregate([
      { $match: { hotelId: hid, status: 'confirmed', startTime: { $gte: new Date() } } },
      { $group: { _id: null, revenue: { $sum: '$total' } } },
    ]),
    MaintenanceIssue.countDocuments({ hotel: hid, status: { $in: ['pending', 'in_progress'] } }),
    HousekeepingRequest.countDocuments({ hotel: hid, status: { $in: ['pending', 'in_progress'] } }),
    MaintenanceIssue.aggregate([
      { $match: { hotel: hid, status: 'done', updatedAt: { $gte: since } } },
      { $project: { diffMs: { $subtract: ['$updatedAt', '$createdAt'] } } },
      { $group: { _id: null, avgMs: { $avg: '$diffMs' } } },
    ]),
    HousekeepingRequest.aggregate([
      { $match: { hotel: hid, status: 'done', updatedAt: { $gte: since } } },
      { $project: { diffMs: { $subtract: ['$updatedAt', '$createdAt'] } } },
      { $group: { _id: null, avgMs: { $avg: '$diffMs' } } },
    ]),
    MaintenanceIssue.aggregate([
      { $match: { hotel: hid, createdAt: { $gte: since } } },
      { $group: { _id: '$typeLabel', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    HousekeepingRequest.aggregate([
      { $match: { hotel: hid, createdAt: { $gte: since } } },
      { $group: { _id: '$typeLabel', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    DispatchRule.aggregate([
      { $match: { hotelId: hid } },
      {
        $group: {
          _id: null,
          totalRules: { $sum: 1 },
          activeRules: { $sum: { $cond: ['$active', 1, 0] } },
          avgEscalationSeconds: { $avg: '$escalationSeconds' },
        },
      },
    ]),
    listAuditLogs(hotelId, 12),
    getTranslationCacheReview(hotelId),
  ]);

  const orderRatingAvg = orderRatings[0]?.avg ?? null;
  const bookingRatingAvg = bookingRatings[0]?.avg ?? null;
  const satisfactionCount = (orderRatings[0]?.count ?? 0) + (bookingRatings[0]?.count ?? 0);
  const satisfactionAverage =
    satisfactionCount > 0
      ? Number(
          (
            ((orderRatingAvg ?? 0) * (orderRatings[0]?.count ?? 0) +
              (bookingRatingAvg ?? 0) * (bookingRatings[0]?.count ?? 0)) /
            satisfactionCount
          ).toFixed(2)
        )
      : null;

  return {
    summary: {
      activeOrders,
      upcomingBookings,
      openMaintenance,
      openHousekeeping,
      guestSatisfaction: satisfactionAverage,
    },
    serviceLevels: {
      avgOrderAcceptanceMinutes:
        avgAcceptance[0]?.avgMs != null ? Number((avgAcceptance[0].avgMs / 60000).toFixed(1)) : null,
      orderSlaBreaches: slaBreaches,
      maintenanceResolutionMinutes:
        maintenanceAvgResolution[0]?.avgMs != null ? Number((maintenanceAvgResolution[0].avgMs / 60000).toFixed(1)) : null,
      housekeepingResolutionMinutes:
        housekeepingAvgResolution[0]?.avgMs != null
          ? Number((housekeepingAvgResolution[0].avgMs / 60000).toFixed(1))
          : null,
    },
    bookings: {
      confirmedRevenue: confirmedBookingRevenue[0]?.revenue ?? 0,
      activeUpcoming: upcomingBookings,
    },
    staffing: {
      totalDispatchRules: dispatchStats[0]?.totalRules ?? 0,
      activeDispatchRules: dispatchStats[0]?.activeRules ?? 0,
      avgEscalationSeconds:
        dispatchStats[0]?.avgEscalationSeconds != null
          ? Number(dispatchStats[0].avgEscalationSeconds.toFixed(0))
          : null,
    },
    issueBreakdown: {
      maintenance: maintenanceByType.map((entry: any) => ({ label: entry._id || 'Other', count: entry.count })),
      housekeeping: housekeepingByType.map((entry: any) => ({ label: entry._id || 'Other', count: entry.count })),
    },
    premiumModules: (hotel as any)?.settings?.premium ?? {},
    coreFeatures: (hotel as any)?.features ?? {},
    recentAuditLogs: auditLogs.map((entry: any) => ({
      id: String(entry._id),
      actorType: entry.actorType,
      actorId: entry.actorId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      summary: entry.summary,
      createdAt: entry.createdAt,
    })),
    translationCacheReview: cacheReview,
  };
};
