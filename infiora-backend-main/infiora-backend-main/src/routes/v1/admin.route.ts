import express, { Request, Response } from 'express';
import { auth } from '../../modules/auth';
import catchAsync from '../../modules/utils/catchAsync';
import GuestOrder from '../../modules/orders/guest-order.model';
import { Hotel } from '../../modules/hotel';
import config from '../../config/config';

const router = express.Router();

router.get(
  '/stripe-revenue',
  auth('manageHotels'),
  catchAsync(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const match: Record<string, any> = { stripeStatus: 'succeeded' };

    if (startDate || endDate) {
      match['paidAt'] = {};
      if (startDate) match['paidAt'].$gte = new Date(startDate);
      if (endDate) match['paidAt'].$lte = new Date(endDate);
    }

    const agg = await GuestOrder.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$hotelId',
          gmv: { $sum: '$total' },
          platformFees: { $sum: '$platformFeeAmount' },
          stripeFees: { $sum: '$stripeFeeAmount' },
          transactions: { $sum: 1 },
          lastActivity: { $max: '$paidAt' },
        },
      },
      { $sort: { gmv: -1 } },
    ]);

    const hotelIds = agg.map((row) => row._id);
    const hotels = await Hotel.find({ _id: { $in: hotelIds } }).select('name');
    const hotelMap = new Map(hotels.map((hotel) => [String(hotel._id), hotel.name]));

    const rows = agg.map((row) => ({
      hotelId: String(row._id),
      hotelName: hotelMap.get(String(row._id)) || 'Unknown',
      gmv: row.gmv || 0,
      platformFees: row.platformFees ? row.platformFees / 100 : 0,
      stripeFees: row.stripeFees ? row.stripeFees / 100 : 0,
      transactions: row.transactions || 0,
      lastActivity: row.lastActivity,
    }));

    const totals = rows.reduce(
      (acc, row) => ({
        gmv: acc.gmv + row.gmv,
        platformFees: acc.platformFees + row.platformFees,
        stripeFees: acc.stripeFees + row.stripeFees,
        transactions: acc.transactions + row.transactions,
      }),
      { gmv: 0, platformFees: 0, stripeFees: 0, transactions: 0 }
    );

    res.send({
      rows,
      totals,
      settings: {
        stripePlatformFeePercent: config.stripe.platformFeePercent,
      },
    });
  })
);

export default router;
