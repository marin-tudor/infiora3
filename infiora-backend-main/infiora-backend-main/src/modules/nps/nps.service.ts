import crypto from 'crypto';
import config from '../../config/config';
import { sendEmail } from '../email/email.service';
import logger from '../logger/logger';
import GuestOrder from '../orders/guest-order.model';
import Booking from '../booking/booking.model';
import NpsToken from './nps-token.model';

const getNpsSecret = (): string => {
  const secret = process.env['NPS_HMAC_SECRET'];
  const allowInsecure = process.env['ALLOW_INSECURE_NPS_SECRET'] === 'true';

  if (!secret) {
    if (config.env === 'test' || allowInsecure) {
      return 'test-only-nps-secret';
    }

    throw new Error('NPS_HMAC_SECRET must be configured.');
  }

  return secret;
};

const hashToken = (token: string): string => crypto.createHmac('sha256', getNpsSecret()).update(token).digest('hex');

const buildFeedbackUrl = (params: { token: string; rating: number }): string => {
  const base = process.env['API_BASE_URL'] || `${config.urls.host.replace(/\/$/, '')}/v1`;
  return `${base.replace(/\/$/, '')}/feedback/${encodeURIComponent(params.token)}/${params.rating}`;
};

export const scheduleNpsEmail = (params: {
  entityId: string;
  entityType: 'order' | 'booking';
  guestEmail: string;
  itemName: string;
}): void => {
  setTimeout(async () => {
    try {
      const rawToken = crypto.randomBytes(32).toString('hex');
      await NpsToken.create({
        tokenHash: hashToken(rawToken),
        entityId: params.entityId,
        entityType: params.entityType,
        guestEmail: params.guestEmail,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });

      const links = [1, 2, 3, 4, 5].map((rating) => ({
        rating,
        url: buildFeedbackUrl({ token: rawToken, rating }),
      }));
      const htmlLinks = links
        .map(
          (link) =>
            `<a href="${link.url}" style="display:inline-block;margin:4px;padding:10px 14px;border-radius:6px;background:#f5f0e8;color:#1a1a1a;text-decoration:none">${link.rating}</a>`
        )
        .join('');

      await sendEmail(
        params.guestEmail,
        `How was your ${params.itemName}?`,
        `Please rate your ${params.itemName}: ${links.map((link) => `${link.rating}: ${link.url}`).join(' ')}`,
        `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <h2>How was your ${params.itemName}?</h2>
          <p>Tap a rating from 1 to 5.</p>
          <div>${htmlLinks}</div>
        </div>`
      );
    } catch (err) {
      logger.error(`NPS email failed for ${params.entityType} ${params.entityId}: ${err}`);
    }
  }, 2 * 60 * 60 * 1000);
};

export const saveRating = async (params: {
  rating: number;
  token: string;
  comment?: string;
}): Promise<'positive' | 'negative'> => {
  const npsToken = await NpsToken.findOne({ tokenHash: hashToken(params.token) });
  if (!npsToken || npsToken.expiresAt.getTime() < Date.now()) {
    throw Object.assign(new Error('Invalid NPS token'), { statusCode: 403 });
  }
  if (npsToken.usedAt) {
    throw Object.assign(new Error('NPS token already used'), { statusCode: 410 });
  }

  const update: { rating: number; ratingComment?: string } = { rating: params.rating };
  if (params.comment) update.ratingComment = params.comment;

  const updated =
    npsToken.entityType === 'order'
      ? await GuestOrder.findOneAndUpdate({ _id: npsToken.entityId, guestEmail: npsToken.guestEmail }, update, { new: true })
      : await Booking.findOneAndUpdate({ _id: npsToken.entityId, guestEmail: npsToken.guestEmail }, update, { new: true });

  if (!updated) {
    throw Object.assign(new Error('Feedback target not found'), { statusCode: 404 });
  }

  npsToken.rating = params.rating;
  if (params.comment) {
    npsToken.commentProvidedAt = new Date();
  }
  if (params.comment || params.rating >= 4) {
    npsToken.usedAt = new Date();
  }
  await npsToken.save();

  return params.rating >= 4 ? 'positive' : 'negative';
};
