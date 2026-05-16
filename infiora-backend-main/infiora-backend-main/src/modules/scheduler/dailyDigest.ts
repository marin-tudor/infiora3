import cron from 'node-cron';
import Hotel from '../hotel/hotel.model';
import GuestOrder from '../orders/guest-order.model';
import Booking from '../booking/booking.model';
import { sendEmail } from '../email/email.service';
import logger from '../logger/logger';

const money = (value?: number | null): string => `${(value ?? 0).toFixed(2)} EUR`;

const buildDigest = async (hotel: any) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const today = new Date(yesterday.getTime() + 86_400_000);
  const range = { createdAt: { $gte: yesterday, $lt: today } };

  const Maintenance = (await import('../maintenance/maintenance.model')).default;
  const Housekeeping = (await import('../housekeeping/housekeeping.model')).default;

  const [orderStats, bookingStats, maintOpen, maintResolved, hkOpen, hkResolved] = await Promise.all([
    GuestOrder.aggregate([
      { $match: { hotelId: hotel._id, ...range } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          revenue: { $sum: '$total' },
          avgRating: { $avg: '$rating' },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
        },
      },
    ]),
    Booking.aggregate([
      { $match: { hotelId: hotel._id, ...range } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          confirmed: { $sum: { $cond: [{ $in: ['$status', ['confirmed', 'completed']] }, 1, 0] } },
        },
      },
    ]),
    Maintenance.countDocuments({ hotel: hotel._id, ...range, status: { $in: ['pending', 'in_progress'] } }),
    Maintenance.countDocuments({ hotel: hotel._id, ...range, status: 'done' }),
    Housekeeping.countDocuments({ hotel: hotel._id, ...range, status: { $in: ['pending', 'in_progress'] } }),
    Housekeeping.countDocuments({ hotel: hotel._id, ...range, status: 'done' }),
  ]);

  return {
    hotelName: hotel.name,
    date: yesterday.toISOString().slice(0, 10),
    orders: orderStats[0] ?? { total: 0, revenue: 0, avgRating: null, completed: 0 },
    bookings: bookingStats[0] ?? { total: 0, confirmed: 0 },
    maintenance: { open: maintOpen, resolved: maintResolved },
    housekeeping: { open: hkOpen, resolved: hkResolved },
  };
};

const digestHtml = (data: any): string => `
  <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px">
    <h2>Daily Digest - ${data.hotelName}</h2>
    <p style="color:#666">${data.date}</p>
    <h3>Orders</h3>
    <p>Total: <strong>${data.orders.total}</strong> | Completed: <strong>${
  data.orders.completed
}</strong> | Revenue: <strong>${money(data.orders.revenue)}</strong> | Avg rating: <strong>${
  data.orders.avgRating ? data.orders.avgRating.toFixed(1) : 'N/A'
}</strong></p>
    <h3>Bookings</h3>
    <p>Total: <strong>${data.bookings.total}</strong> | Confirmed/completed: <strong>${data.bookings.confirmed}</strong></p>
    <h3>Maintenance</h3>
    <p>Open: <strong>${data.maintenance.open}</strong> | Resolved: <strong>${data.maintenance.resolved}</strong></p>
    <h3>Housekeeping</h3>
    <p>Open: <strong>${data.housekeeping.open}</strong> | Resolved: <strong>${data.housekeeping.resolved}</strong></p>
  </div>
`;

const sendDailyDigests = async (): Promise<void> => {
  const hotels = await Hotel.find({ isActive: true }).populate('user', 'email');

  for (const hotel of hotels) {
    try {
      const data = await buildDigest(hotel);
      const recipients = [
        ((hotel as any).user as any)?.email,
        ...(((hotel as any).orders?.emails ?? []) as string[]),
      ].filter(Boolean);

      for (const to of [...new Set(recipients)]) {
        await sendEmail(
          to,
          `Daily Digest - ${(hotel as any).name} - ${data.date}`,
          `Orders: ${data.orders.total}, revenue: ${money(data.orders.revenue)}. Bookings: ${data.bookings.total}.`,
          digestHtml(data)
        );
      }
    } catch (err) {
      logger.error(`Daily digest failed for hotel ${hotel._id}: ${err}`);
    }
  }
};

export const startDailyDigestCron = (): void => {
  cron.schedule('0 8 * * *', sendDailyDigests, { timezone: 'UTC' });
  logger.info('Daily digest cron started (08:00 UTC)');
};
