import nodemailer from 'nodemailer';
import config from '../../config/config';
import logger from '../logger/logger';
import { Message } from './email.interfaces';
import { IHotelDoc } from '../hotel/hotel.interfaces';
import { IUserDoc } from '../user/user.interfaces';

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeHtmlWithBreaks = (value: unknown): string => escapeHtml(value).replace(/\r?\n/g, '<br />');

const escapeUrl = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }

  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
};

export const transport = nodemailer.createTransport(config.email.smtp);
/* istanbul ignore next */
if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch(() => logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env'));
}

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @param {string} html
 * @param {string} from - Optional from address
 * @returns {Promise<void>}
 */
export const sendEmail = async (to: string, subject: string, text: string, html: string, from?: string): Promise<void> => {
  const msg: Message = {
    from: from || config.email.from,
    to,
    subject,
    text,
    html,
  };
  try {
    logger.debug(`Sending email to: ${to}, subject: ${subject}, from: ${msg.from}`);
    await transport.sendMail(msg);
  } catch (error) {
    logger.error(`Failed to send email to: ${to}, subject: ${subject}, error: ${error}`);
    throw error;
  }
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise<void>}
 */
export const sendResetPasswordEmail = async (to: string, token: string): Promise<void> => {
  const subject = 'Reset password';
  // replace this url with the link to the reset password page of your front-end app
  const resetPasswordUrl = `${config.urls.app}/reset-password?token=${token}`;
  const text = `Hi,
  To reset your password, click on this link: ${resetPasswordUrl}
  If you did not request any password resets, then ignore this email.`;
  const html = `<div style="margin:30px; padding:30px; border:1px solid black; border-radius: 20px 10px;"><h4><strong>Dear user,</strong></h4>
  <p>To reset your password, click on this link: ${resetPasswordUrl}</p>
  <p>If you did not request any password resets, please ignore this email.</p>
  <p>Thanks,</p>
  <p><strong>Team</strong></p></div>`;
  await sendEmail(to, subject, text, html);
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 * @param {string} name
 * @returns {Promise<void>}
 */
export const sendVerificationEmail = async (to: string, token: string, name: string): Promise<void> => {
  const subject = 'Email Verification';
  // replace this url with the link to the email verification page of your front-end app
  const verificationEmailUrl = `${config.urls.app}/verify-email?token=${token}`;
  const text = `Hi ${name},
  To verify your email, click on this link: ${verificationEmailUrl}
  If you did not create an account, then ignore this email.`;
  const html = `<div style="margin:30px; padding:30px; border:1px solid black; border-radius: 20px 10px;"><h4><strong>Hi ${escapeHtml(name)},</strong></h4>
  <p>To verify your email, click on this link: ${verificationEmailUrl}</p>
  <p>If you did not create an account, then ignore this email.</p></div>`;
  await sendEmail(to, subject, text, html);
};

/**
 * Send email verification after registration
 * @param {string} to
 * @param {string} token
 * @param {string} name
 * @returns {Promise<void>}
 */
export const sendSuccessfulRegistration = async (to: string, token: string, name: string): Promise<void> => {
  const subject = 'Email Verification';
  // replace this url with the link to the email verification page of your front-end app
  const verificationEmailUrl = `${config.urls.app}/verify-email?token=${token}`;
  const text = `Hi ${name},
  Congratulations! Your account has been created.
  You are almost there. Complete the final step by verifying your email at: ${verificationEmailUrl}
  Don't hesitate to contact us if you face any problems
  Regards,
  Team`;
  const html = `<div style="margin:30px; padding:30px; border:1px solid black; border-radius: 20px 10px;"><h4><strong>Hi ${escapeHtml(name)},</strong></h4>
  <p>Congratulations! Your account has been created.</p>
  <p>You are almost there. Complete the final step by verifying your email at: ${verificationEmailUrl}</p>
  <p>Don't hesitate to contact us if you face any problems</p>
  <p>Regards,</p>
  <p><strong>Team</strong></p></div>`;
  await sendEmail(to, subject, text, html);
};

/**
 * Send email verification after registration
 * @param {string} to
 * @param {string} name
 * @returns {Promise<void>}
 */
export const sendAccountCreated = async (to: string, name: string): Promise<void> => {
  const subject = 'Account Created Successfully';
  // replace this url with the link to the email verification page of your front-end app
  const loginUrl = `${config.urls.app}/auth/login`;
  const text = `Hi ${name},
  Congratulations! Your account has been created successfully.
  You can now login at: ${loginUrl}
  Don't hesitate to contact us if you face any problems
  Regards,
  Team`;
  const html = `<div style="margin:30px; padding:30px; border:1px solid black; border-radius: 20px 10px;"><h4><strong>Hi ${escapeHtml(name)},</strong></h4>
  <p>Congratulations! Your account has been created successfully.</p>
  <p>You can now login at: ${loginUrl}</p>
  <p>Don't hesitate to contact us if you face any problems</p>
  <p>Regards,</p>
  <p><strong>Team</strong></p></div>`;
  await sendEmail(to, subject, text, html);
};

/**
 * Send a ticket email with the details provided.
 * @param {SupportDetails} support - The support ticket details.
 * @returns {Promise<void>}
 */
export const sendTicketEmail = async (support: any): Promise<void> => {
  const to = 'support@infiora.hr'; // Define the recipient email
  const subject = 'New Message Received'; // Define the email subject

  // Define the plain text and HTML content
  const text = `New Message Received\n\nFrom: ${support.user.email}\nSubject: ${support.subject}\nMessage: ${support.message}`;
  const html = `
    <div>
      <h4><strong>New Message Received</strong></h4>
      <p><strong>From:</strong> ${escapeHtml(support.user.email)}</p>
      <p><strong>Subject:</strong> ${escapeHtml(support.subject)}</p>
      <p><strong>Message:</strong> ${escapeHtmlWithBreaks(support.message)}</p>
    </div>
  `;

  await sendEmail(to, subject, text, html);
};
/**
 * Sends a notification email for a new hotel request.
 * @param {IUserDoc} user - The user who submitted the hotel.
 * @param {IHotelDoc} hotel - The hotel document containing details.
 * @returns {Promise<void>}
 */
export const sendHotelEmail = async (user: IUserDoc, hotel: IHotelDoc): Promise<void> => {
  const to = 'support@infiora.hr';
  const subject = 'New Hotel Request';

  const text = `New Hotel Request\n\nHotel Details:\n\n- Name: ${hotel.name}\n\nSubmitted By:\n\n- Name: ${user.name}\n\n- Email: ${user.email}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>New Hotel Request</h2>

      <h3>Hotel Details</h3>
      <p><strong>ID:</strong> ${escapeHtml(hotel.id)}</p>
      <p><strong>Name:</strong> ${escapeHtml(hotel.name)}</p>

      <h3>Submitted By</h3>
      <p><strong>Name:</strong> ${escapeHtml(user.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
    </div>
  `;

  await sendEmail(to, subject, text, html);
};

/**
 * Send feedback notification email
 * @param {string} to - Recipient email address
 * @param {object} feedbackData - Feedback details
 * @returns {Promise<void>}
 */
export const sendFeedbackEmail = async (
  to: string,
  feedbackData: {
    roomNumber?: string | undefined;
    roomId: string;
    hotelName: string | undefined;
    rating?: number | undefined;
    email?: string | undefined;
    message?: string | undefined;
  }
): Promise<void> => {
  const subject = `New Feedback Received - Room ${feedbackData.roomNumber || feedbackData.roomId}`;
  const ratingStars = feedbackData.rating ? '⭐'.repeat(feedbackData.rating) : 'No rating';

  const text = `New Feedback Received\n\nRoom: ${feedbackData.roomNumber || feedbackData.roomId}\nHotel: ${
    feedbackData.hotelName || 'N/A'
  }\nRating: ${ratingStars}\n${feedbackData.email ? `Customer Email: ${feedbackData.email}\n` : ''}${
    feedbackData.message ? `Message: ${feedbackData.message}` : ''
  }`;

  const html = `<div style="margin:30px; padding:30px; border:1px solid black; border-radius: 20px 10px;"><h4><strong>New Feedback Received</strong></h4>
  <p><strong>Room:</strong> ${escapeHtml(feedbackData.roomNumber || feedbackData.roomId)}</p>
  <p><strong>Hotel:</strong> ${escapeHtml(feedbackData.hotelName || 'N/A')}</p>
  <p><strong>Rating:</strong> ${escapeHtml(ratingStars)}</p>
  ${feedbackData.email ? `<p><strong>Customer Email:</strong> ${escapeHtml(feedbackData.email)}</p>` : ''}
  ${feedbackData.message ? `<p><strong>Message:</strong> ${escapeHtmlWithBreaks(feedbackData.message)}</p>` : ''}
  <p>Thanks,</p>
  <p><strong>Team</strong></p></div>`;

  await sendEmail(to, subject, text, html);
};

/**
 * Send thank you email to feedback submitter
 * @param {string} to - Customer email address
 * @param {string} hotelName - Hotel name
 * @param {string} from - Optional from address
 * @returns {Promise<void>}
 */
export const sendFeedbackThankYouEmail = async (to: string, hotelName: string | undefined, from?: string): Promise<void> => {
  const subject = 'Thank You for Your Feedback';

  const text = `Thank you for your feedback!\n\nDear Guest,\n\nThank you for taking the time to share your feedback with us${
    hotelName ? ` at ${hotelName}` : ''
  }. We truly appreciate your input and value your experience.\n\nYour feedback helps us improve our services and ensure we provide the best possible experience for all our guests.\n\nWe hope to welcome you again soon!\n\nBest regards,\nThe Team`;

  const html = `<div style="margin:30px; padding:30px; border:1px solid black; border-radius: 20px 10px;"><h4><strong>Dear Guest,</strong></h4>
  <p>Thank you for taking the time to share your feedback with us${
    hotelName ? ` at <strong>${escapeHtml(hotelName)}</strong>` : ''
  }. We truly appreciate your input and value your experience.</p>
  <p>Your feedback helps us improve our services and ensure we provide the best possible experience for all our guests.</p>
  <p>We hope to welcome you again soon!</p>
  <p>Thanks,</p>
  <p><strong>Team</strong></p></div>`;

  await sendEmail(to, subject, text, html, from);
};

export const sendUrgentFeedbackAlert = async (
  to: string,
  data: { hotelName: string; roomNumber: string; rating: number; message?: string }
): Promise<void> => {
  const stars = '★'.repeat(data.rating) + '☆'.repeat(5 - data.rating);
  const subject = `🚨 URGENT: ${data.rating}-star review — Room ${data.roomNumber} — ${data.hotelName}`;
  const text = `Low Rating Alert\n\nHotel: ${data.hotelName}\nRoom: ${data.roomNumber}\nRating: ${stars} (${
    data.rating
  }/5)\n${
    data.message ? `Guest message: ${data.message}\n` : ''
  }Act quickly — service recovery before checkout prevents negative reviews.`;
  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:2px solid #ef4444;border-radius:8px;">
    <h2 style="color:#ef4444;margin-top:0;">⚠️ Low Rating Alert</h2>
    <p><strong>Hotel:</strong> ${escapeHtml(data.hotelName)}</p>
    <p><strong>Room:</strong> ${escapeHtml(data.roomNumber)}</p>
    <p><strong>Rating:</strong> <span style="font-size:20px;">${escapeHtml(stars)}</span> (${data.rating}/5)</p>
    ${
      data.message
        ? `<p><strong>Guest message:</strong></p><blockquote style="border-left:3px solid #ef4444;padding-left:12px;color:#555;">${escapeHtmlWithBreaks(data.message)}</blockquote>`
        : '<p><em>No written feedback provided.</em></p>'
    }
    <p style="color:#888;font-size:12px;">Act quickly — service recovery before checkout prevents negative reviews.</p>
  </div>`;
  await sendEmail(to, subject, text, html);
};

export const sendHousekeepingRequestEmail = async (
  to: string,
  data: {
    hotelName?: string | undefined;
    roomNumber?: string | undefined;
    roomId: string;
    requestType: string;
    note?: string | undefined;
    guestRoomNumber?: string | undefined;
    reservationCode?: string | undefined;
    reservationCodeStatus?: string | undefined;
  }
): Promise<void> => {
  const roomLabel = data.roomNumber || data.roomId;
  const subject = `New Housekeeping Request - Room ${roomLabel}`;
  const text = `New Housekeeping Request\n\nHotel: ${data.hotelName || 'N/A'}\nRoom: ${roomLabel}\nRequest: ${
    data.requestType
  }\n${data.guestRoomNumber ? `Guest room: ${data.guestRoomNumber}\n` : ''}${
    data.reservationCode
      ? `Reservation code: ${data.reservationCode} (${data.reservationCodeStatus || 'not_provided'})\n`
      : ''
  }${data.note ? `Note: ${data.note}` : ''}`;
  const html = `<div style="margin:30px; padding:30px; border:1px solid black; border-radius: 20px 10px;"><h4><strong>New Housekeeping Request</strong></h4>
  <p><strong>Hotel:</strong> ${escapeHtml(data.hotelName || 'N/A')}</p>
  <p><strong>Room:</strong> ${escapeHtml(roomLabel)}</p>
  <p><strong>Request:</strong> ${escapeHtml(data.requestType)}</p>
  ${data.guestRoomNumber ? `<p><strong>Guest room:</strong> ${escapeHtml(data.guestRoomNumber)}</p>` : ''}
  ${
    data.reservationCode
      ? `<p><strong>Reservation code:</strong> ${escapeHtml(data.reservationCode)} (${escapeHtml(data.reservationCodeStatus || 'not_provided')})</p>`
      : ''
  }
  ${data.note ? `<p><strong>Note:</strong> ${escapeHtmlWithBreaks(data.note)}</p>` : ''}
  <p>Thanks,</p>
  <p><strong>Team</strong></p></div>`;

  await sendEmail(to, subject, text, html);
};

export const sendMaintenanceIssueEmail = async (
  to: string,
  data: {
    hotelName?: string | undefined;
    roomNumber?: string | undefined;
    roomId: string;
    issueType: string;
    description: string;
    photo?: string | undefined;
    guestRoomNumber?: string | undefined;
    reservationCode?: string | undefined;
    reservationCodeStatus?: string | undefined;
  }
): Promise<void> => {
  const roomLabel = data.roomNumber || data.roomId;
  const subject = `New Maintenance Issue - Room ${roomLabel}`;
  const text = `New Maintenance Issue\n\nHotel: ${data.hotelName || 'N/A'}\nRoom: ${roomLabel}\nIssue: ${data.issueType}\n${
    data.guestRoomNumber ? `Guest room: ${data.guestRoomNumber}\n` : ''
  }${
    data.reservationCode
      ? `Reservation code: ${data.reservationCode} (${data.reservationCodeStatus || 'not_provided'})\n`
      : ''
  }Description: ${data.description}${data.photo ? `\nPhoto: ${data.photo}` : ''}`;
  const html = `<div style="margin:30px; padding:30px; border:1px solid black; border-radius: 20px 10px;"><h4><strong>New Maintenance Issue</strong></h4>
  <p><strong>Hotel:</strong> ${escapeHtml(data.hotelName || 'N/A')}</p>
  <p><strong>Room:</strong> ${escapeHtml(roomLabel)}</p>
  <p><strong>Issue:</strong> ${escapeHtml(data.issueType)}</p>
  ${data.guestRoomNumber ? `<p><strong>Guest room:</strong> ${escapeHtml(data.guestRoomNumber)}</p>` : ''}
  ${
    data.reservationCode
      ? `<p><strong>Reservation code:</strong> ${escapeHtml(data.reservationCode)} (${escapeHtml(data.reservationCodeStatus || 'not_provided')})</p>`
      : ''
  }
  <p><strong>Description:</strong> ${escapeHtmlWithBreaks(data.description)}</p>
  ${data.photo ? `<p><strong>Photo:</strong> <a href="${escapeUrl(data.photo)}">${escapeHtml(data.photo)}</a></p>` : ''}
  <p>Thanks,</p>
  <p><strong>Team</strong></p></div>`;

  await sendEmail(to, subject, text, html);
};

// ─── Orders Emails ────────────────────────────────────────────────────────────

const orderItemsHtml = (items: any[]): string =>
  items
    .map(
      (i) =>
        `<tr>
          <td style="padding:6px 0;border-bottom:1px solid #f0f0f0">${i.image || '🛒'} ${i.name}</td>
          <td style="padding:6px 0;border-bottom:1px solid #f0f0f0;text-align:center">${i.qty}</td>
          <td style="padding:6px 0;border-bottom:1px solid #f0f0f0;text-align:right">${(i.price * i.qty).toFixed(2)} €</td>
        </tr>`
    )
    .join('');

const guestStatusCtaHtml = (statusUrl?: string): string =>
  statusUrl
    ? `<p style="margin-top:24px"><a href="${statusUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600">Check your status</a></p>`
    : '';

const guestStatusCtaText = (statusUrl?: string): string => (statusUrl ? ` Check your status: ${statusUrl}` : '');

/**
 * Send order confirmation to guest after placing order
 */
export const sendOrderConfirmationEmail = async (
  to: string,
  hotelName: string,
  order: any,
  statusUrl?: string
): Promise<void> => {
  const subject = `Order ${order.orderId} received — ${hotelName}`;
  const text = `Your order ${order.orderId} has been received. The hotel will confirm it shortly.${guestStatusCtaText(
    statusUrl
  )}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#4f46e5">${hotelName}</h2>
      <h3>Order received 📬</h3>
      <p>Hi! Your order <strong>${order.orderId}</strong> has been received and is awaiting confirmation.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr style="background:#f8f9fb">
            <th style="text-align:left;padding:8px">Item</th>
            <th style="text-align:center;padding:8px">Qty</th>
            <th style="text-align:right;padding:8px">Price</th>
          </tr>
        </thead>
        <tbody>${orderItemsHtml(order.items)}</tbody>
      </table>
      <p style="font-size:16px;font-weight:bold">Total: ${order.total.toFixed(2)} €</p>
      <p style="color:#6b7280">Payment: ${order.payment}</p>
      ${order.note ? `<p style="color:#f59e0b">📝 Note: ${order.note}</p>` : ''}
      ${guestStatusCtaHtml(statusUrl)}
      <p style="margin-top:24px;color:#6b7280">You will receive another email when your order is confirmed.</p>
    </div>`;
  await sendEmail(to, subject, text, html);
};

/**
 * Send new order alert to hotel staff
 */
export const sendNewOrderAlertEmail = async (to: string, hotelName: string, order: any): Promise<void> => {
  const subject = `🔔 New order ${order.orderId} — Room ${order.roomNumber || ''}`;
  const text = `New order ${order.orderId} from Room ${order.roomNumber}. Total: ${order.total.toFixed(2)} €`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#4f46e5">${hotelName} — New Order</h2>
      <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:14px;margin-bottom:16px">
        <strong style="font-size:18px">${order.orderId}</strong> &nbsp;·&nbsp; Room <strong>${
    order.roomNumber || 'N/A'
  }</strong>
        &nbsp;·&nbsp; <strong>${order.total.toFixed(2)} €</strong>
      </div>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr style="background:#f8f9fb">
            <th style="text-align:left;padding:8px">Item</th>
            <th style="text-align:center;padding:8px">Qty</th>
            <th style="text-align:right;padding:8px">Price</th>
          </tr>
        </thead>
        <tbody>${orderItemsHtml(order.items)}</tbody>
      </table>
      ${order.note ? `<p style="color:#f59e0b">📝 Guest note: ${order.note}</p>` : ''}
      <p>Payment method: <strong>${order.payment}</strong></p>
      ${
        order.scheduledFor
          ? `<p>⏰ Scheduled for: <strong>${new Date(order.scheduledFor).toLocaleString()}</strong></p>`
          : ''
      }
      <p style="margin-top:24px;color:#6b7280">Log in to your dashboard to accept this order.</p>
    </div>`;
  await sendEmail(to, subject, text, html);
};

/**
 * Send order accepted notification to guest (with ETA)
 */
export const sendOrderAcceptedEmail = async (
  to: string,
  hotelName: string,
  order: any,
  statusUrl?: string
): Promise<void> => {
  const subject = `Your order is being processed — ${hotelName}`;
  const text = `Your order ${order.orderId} has been accepted. Estimated time: ${order.acceptedEta} minutes.${guestStatusCtaText(
    statusUrl
  )}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#4f46e5">${hotelName}</h2>
      <h3 style="color:#10b981">✓ Order confirmed!</h3>
      <p>Your order <strong>${order.orderId}</strong> has been accepted.</p>
      <div style="background:#d1fae5;border:1px solid #10b981;border-radius:8px;padding:16px;text-align:center;margin:16px 0">
        <div style="font-size:12px;color:#6b7280;letter-spacing:2px;text-transform:uppercase">Estimated time</div>
        <div style="font-size:48px;font-weight:bold;color:#10b981">${order.acceptedEta}</div>
        <div style="color:#6b7280">minutes</div>
      </div>
      ${
        order.staffNote
          ? `<p style="background:#f8f9fb;padding:12px;border-radius:6px">💬 Message from hotel: ${order.staffNote}</p>`
          : ''
      }
      ${guestStatusCtaHtml(statusUrl)}
      <p style="color:#6b7280">Total: <strong>${order.total.toFixed(2)} €</strong> · Payment: ${order.payment}</p>
    </div>`;
  await sendEmail(to, subject, text, html);
};

/**
 * Send order completed notification to guest
 */
export const sendOrderCompletedEmail = async (
  to: string,
  hotelName: string,
  order: any,
  statusUrl?: string
): Promise<void> => {
  const subject = `Your order has been completed — ${hotelName}`;
  const text = `Your order ${order.orderId} has been completed. Enjoy!${guestStatusCtaText(statusUrl)}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#4f46e5">${hotelName}</h2>
      <div style="text-align:center;padding:24px 0">
        <div style="font-size:56px">🎉</div>
        <h3 style="color:#10b981">Order completed!</h3>
        <p>Your order <strong>${order.orderId}</strong> is done.</p>
      </div>
      <p style="color:#6b7280">Total: <strong>${order.total.toFixed(2)} €</strong></p>
      <p>Payment: <strong>${order.payment}</strong></p>
      ${guestStatusCtaHtml(statusUrl)}
      <p style="margin-top:24px;color:#6b7280;font-size:12px">Thank you for your order. We hope you enjoy it!</p>
    </div>`;
  await sendEmail(to, subject, text, html);
};

/**
 * Send order cancelled notification to guest
 */
export const sendOrderCancelledEmail = async (
  to: string,
  hotelName: string,
  order: any,
  statusUrl?: string
): Promise<void> => {
  const subject = `Your order was cancelled — ${hotelName}`;
  const text = `Your order ${order.orderId} has been cancelled. Please contact reception for assistance.${guestStatusCtaText(
    statusUrl
  )}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#4f46e5">${hotelName}</h2>
      <h3 style="color:#ef4444">Order cancelled</h3>
      <p>Unfortunately, your order <strong>${order.orderId}</strong> has been cancelled.</p>
      <p>Please contact reception for assistance.</p>
      ${guestStatusCtaHtml(statusUrl)}
      <p style="color:#6b7280;margin-top:24px;font-size:12px">We apologise for any inconvenience.</p>
    </div>`;
  await sendEmail(to, subject, text, html);
};

export const sendGuestStatusLinkEmail = async (
  to: string,
  hotelName: string,
  statusUrl: string,
  subject = `Your status link — ${hotelName}`
): Promise<void> => {
  const text = `Use this private link to view your orders and bookings: ${statusUrl}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#4f46e5">${hotelName}</h2>
      <p>Use the private link below to view your orders and bookings for this hotel.</p>
      <p style="margin-top:24px"><a href="${statusUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600">Open status page</a></p>
      <p style="margin-top:18px;color:#6b7280;font-size:12px">If you did not request this link, you can ignore this email.</p>
    </div>`;
  await sendEmail(to, subject, text, html);
};
