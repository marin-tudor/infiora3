import GuestOrder from '../orders/guest-order.model';
import { sendAdminSSEEvent } from '../orders/sse.service';
import { Hotel } from '../hotel';
import { sendEmail } from '../email/email.service';
import logger from '../logger/logger';

const timers = new Map<string, NodeJS.Timeout>();

export const scheduleEscalation = (
  orderId: string,
  hotelId: string,
  _groupId: string | null,
  delaySeconds: number
): void => {
  cancelEscalation(orderId);

  const timer = setTimeout(async () => {
    timers.delete(orderId);

    try {
      const order = await GuestOrder.findById(orderId).select('status orderId total');
      if (!order || order.status !== 'Awaiting confirmation') return;

      const hotel = await Hotel.findById(hotelId).select('orders.emails');
      const emails: string[] = (hotel as any)?.orders?.emails ?? [];

      if (emails.length > 0) {
        const subject = `[Escalation] Order ${order.orderId} unaccepted`;
        const text = `Order ${order.orderId} (${order.total}) has not been accepted within the required time. Please check the dashboard.`;
        const html = `<p>Order <strong>${order.orderId}</strong> (${order.total}) has not been accepted within the required time. Please check the dashboard.</p>`;
        await sendEmail(emails.join(','), subject, text, html).catch((err) => logger.error('Escalation email failed', err));
      }

      sendAdminSSEEvent(hotelId, 'rs:escalation-alert', {
        orderId: String(order._id),
        orderRef: order.orderId,
        total: order.total,
        firedAt: new Date(),
      });

      logger.warn(`Escalation fired for order ${order.orderId} (hotel ${hotelId})`);
    } catch (err) {
      logger.error('Escalation handler error', err);
    }
  }, delaySeconds * 1000);

  timers.set(orderId, timer);
};

export const cancelEscalation = (orderId: string): void => {
  const timer = timers.get(orderId);
  if (!timer) return;
  clearTimeout(timer);
  timers.delete(orderId);
};
