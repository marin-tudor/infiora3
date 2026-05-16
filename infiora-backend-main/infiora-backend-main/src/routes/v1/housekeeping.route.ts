import express, { Router } from 'express';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import { isHotelOwner } from '../../modules/middleware';
import { housekeepingController, housekeepingValidation } from '../../modules/housekeeping';
import multerUpload from '../../modules/utils/multerUpload';
import { createRateLimiter } from '../../modules/utils';

const router: Router = express.Router();
const publicHousekeepingLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 12 });
const guestStatusLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 60 });

router.post(
  '/',
  publicHousekeepingLimiter,
  multerUpload.none(),
  validate(housekeepingValidation.createRequest),
  housekeepingController.createRequest
);

router.get(
  '/:requestId/status',
  guestStatusLimiter,
  validate(housekeepingValidation.getGuestRequestStatus),
  housekeepingController.getGuestRequestStatus
);

router.get('/hotels/:hotelId', auth(), isHotelOwner, validate(housekeepingValidation.getRequests), housekeepingController.getRequests);

router.get(
  '/hotels/:hotelId/pending-count',
  auth(),
  isHotelOwner,
  validate(housekeepingValidation.getPendingCount),
  housekeepingController.getPendingCount
);

router.patch('/:requestId/status', auth(), validate(housekeepingValidation.updateStatus), housekeepingController.updateStatus);

export default router;
