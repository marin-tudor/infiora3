import express, { Router, Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../modules/utils/catchAsync';
import { auth } from '../../modules/auth';
import { isHotelOwner } from '../../modules/middleware';
import ApiError from '../../modules/errors/ApiError';
import config from '../../config/config';
import { getStripeStatus, initiateOnboarding } from '../../modules/stripe/stripe.service';
import { handleStripeWebhook } from '../../modules/stripe/stripe-webhook.handler';

const router: Router = express.Router();

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  catchAsync(async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string | undefined;
    if (!signature) throw new ApiError(httpStatus.BAD_REQUEST, 'Missing Stripe signature');
    if (!config.stripe.webhookSecret) throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Stripe webhook is not configured');

    await handleStripeWebhook(req.body as Buffer, signature, config.stripe.webhookSecret);
    res.send({ received: true });
  })
);

router.post(
  '/hotels/:hotelId/onboard',
  auth(),
  isHotelOwner,
  catchAsync(async (req: Request, res: Response) => {
    const returnUrl = req.body.returnUrl || `${req.headers.origin}/orders?tab=setup`;
    const url = await initiateOnboarding(req.params['hotelId'] as string, returnUrl);
    res.send({ url });
  })
);

router.get(
  '/hotels/:hotelId/status',
  auth(),
  isHotelOwner,
  catchAsync(async (req: Request, res: Response) => {
    const status = await getStripeStatus(req.params['hotelId'] as string);
    res.send(status);
  })
);

export default router;
