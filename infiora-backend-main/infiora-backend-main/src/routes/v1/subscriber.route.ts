import express, { Router } from 'express';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import { subscriberController, subscriberValidation } from '../../modules/subscriber';
import { isOwner } from '../../modules/middleware';
import { createRateLimiter } from '../../modules/utils';

const router: Router = express.Router();
const guestSubscriberLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 12 });

router
  .route('/')
  .post(guestSubscriberLimiter, validate(subscriberValidation.createSubscriber), subscriberController.createSubscriber)
  .get(auth(), validate(subscriberValidation.getSubscribers), isOwner, subscriberController.getSubscribers);

router
  .route('/export')
  .get(auth(), validate(subscriberValidation.exportSubscribers), isOwner, subscriberController.exportSubscribers);

router
  .route('/:subscriberId')
  .get(auth(), validate(subscriberValidation.getSubscriber), isOwner, subscriberController.getSubscriber)
  .patch(auth(), validate(subscriberValidation.updateSubscriber), isOwner, subscriberController.updateSubscriber)
  .delete(auth(), validate(subscriberValidation.deleteSubscriber), isOwner, subscriberController.deleteSubscriber);

export default router;
