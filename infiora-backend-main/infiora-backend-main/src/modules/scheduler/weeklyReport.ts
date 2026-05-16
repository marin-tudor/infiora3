import cron from 'node-cron';
import { Hotel } from '../hotel';
import { Activity } from '../activity';
import Feedback from '../feedback/feedback.model';
import { sendEmail } from '../email/email.service';
import logger from '../logger/logger';
import config from '../../config/config';

type HotelUser = {
  email?: string;
};

const sendWeeklyReport = async (): Promise<void> => {
  logger.info('Weekly report: starting...');

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const hotels = await Hotel.find({ isActive: true }).populate('user');

  let sent = 0;
  for (const hotel of hotels) {
    try {
      const user = hotel.user as unknown as HotelUser | undefined;
      if (!user?.email) continue;

      const [views, taps, feedbacks] = await Promise.all([
        Activity.countDocuments({ hotel: hotel.id, action: 'view', createdAt: { $gte: weekAgo } }),
        Activity.countDocuments({ hotel: hotel.id, action: 'tap', createdAt: { $gte: weekAgo } }),
        Feedback.find({ hotel: hotel.id, createdAt: { $gte: weekAgo }, rating: { $exists: true } }),
      ]);

      const avgRating =
        feedbacks.length > 0 ? (feedbacks.reduce((s, f) => s + (f.rating || 0), 0) / feedbacks.length).toFixed(1) : null;

      const lowRatings = feedbacks.filter((f) => f.rating && f.rating <= 2).length;

      const subject = `📊 Weekly Report — ${hotel.name}`;

      const html = `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f9fafb">
  <div style="background:#4f46e5;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
    <h2 style="margin:0;font-size:20px">${hotel.name}</h2>
    <p style="margin:4px 0 0;opacity:0.85;font-size:13px">Weekly Performance Report</p>
  </div>
  <div style="background:#fff;padding:20px 24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">
    <p style="color:#6b7280;font-size:13px;margin-top:0">
      ${weekAgo.toLocaleDateString()} – ${now.toLocaleDateString()}
    </p>
    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <div style="flex:1;min-width:120px;background:#eff6ff;border-radius:8px;padding:14px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#2563eb">${views}</div>
        <div style="font-size:12px;color:#6b7280">Page Views</div>
      </div>
      <div style="flex:1;min-width:120px;background:#f0fdf4;border-radius:8px;padding:14px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#16a34a">${taps}</div>
        <div style="font-size:12px;color:#6b7280">Button Taps</div>
      </div>
      <div style="flex:1;min-width:120px;background:#fdf4ff;border-radius:8px;padding:14px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#9333ea">${feedbacks.length}</div>
        <div style="font-size:12px;color:#6b7280">Feedbacks</div>
      </div>
    </div>
    ${
      avgRating
        ? `
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:16px">
      <strong>⭐ Avg. Rating this week:</strong> ${avgRating}/5
      ${
        lowRatings > 0
          ? `&nbsp;·&nbsp;<span style="color:#dc2626">${lowRatings} low rating${
              lowRatings > 1 ? 's' : ''
            } (1–2 stars)</span>`
          : ''
      }
    </div>`
        : ''
    }
    <p style="font-size:13px;color:#6b7280;text-align:center;margin-top:20px">
      Log in to your <a href="${config.urls.admin}" style="color:#4f46e5">Infiora admin console</a> for full analytics.
    </p>
  </div>
</div>`;

      const text = `Weekly Report — ${hotel.name}\nViews: ${views} | Taps: ${taps} | Feedbacks: ${feedbacks.length}${
        avgRating ? ` | Avg Rating: ${avgRating}` : ''
      }`;

      await sendEmail(user.email, subject, text, html);
      sent++;
    } catch (err) {
      logger.error(`Weekly report failed for hotel ${hotel.id}: ${err}`);
    }
  }

  logger.info(`Weekly report: sent to ${sent}/${hotels.length} hotels`);
};

export const startWeeklyReportJob = (): void => {
  // Every Monday at 9:00 AM
  cron.schedule('0 9 * * 1', sendWeeklyReport, { timezone: 'Europe/Zagreb' });
  logger.info('Weekly report cron job scheduled (Mon 09:00 Europe/Zagreb)');
};
