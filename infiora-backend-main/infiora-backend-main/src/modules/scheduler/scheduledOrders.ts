import cron from 'node-cron';
import GuestOrder from '../orders/guest-order.model';
import { sendSSEEventToAll } from '../orders/sse.service';
import logger from '../logger/logger';

export const startScheduledOrdersJob = (): void => {
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const surfaceAt = new Date(now.getTime() + 15 * 60 * 1000);

    const orders = await GuestOrder.find({
      status: 'Awaiting confirmation',
      scheduledFor: { $lte: surfaceAt },
      surfacedAt: null,
    }).select('orderId hotelId dispatchGroupId guestRoomNumber roomNumber total items payment scheduledFor');

    for (const order of orders) {
      await GuestOrder.updateOne({ _id: order._id }, { surfacedAt: now });

      sendSSEEventToAll(
        String(order.hotelId),
        order.dispatchGroupId ? String(order.dispatchGroupId) : null,
        'rs:new-order',
        {
          id: String(order._id),
          _id: String(order._id),
          orderId: order.orderId,
          roomNumber: order.guestRoomNumber || order.roomNumber,
          items: order.items.map((item) => ({ name: item.name, qty: item.qty })),
          itemCount: order.items.reduce((sum, item) => sum + item.qty, 0),
          total: order.total,
          payment: order.payment,
          status: 'Awaiting confirmation',
          scheduledFor: order.scheduledFor,
          createdAt: now,
          surfacedAt: now,
        }
      );

      logger.info(`Scheduled order surfaced: ${order.orderId}`);
    }
  });

  logger.info('Scheduled orders cron job started (every 1 minute)');
};
