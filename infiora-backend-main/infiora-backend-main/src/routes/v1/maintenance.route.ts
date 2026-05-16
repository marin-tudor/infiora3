import express, { Router } from 'express';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import { isHotelOwner } from '../../modules/middleware';
import { maintenanceController, maintenanceValidation } from '../../modules/maintenance';
import multerUpload from '../../modules/utils/multerUpload';
import { createRateLimiter } from '../../modules/utils';

const router: Router = express.Router();
const publicMaintenanceLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 12 });
const guestStatusLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 60 });

router.post(
  '/',
  publicMaintenanceLimiter,
  multerUpload.fields([{ name: 'photo', maxCount: 1 }]),
  validate(maintenanceValidation.createIssue),
  maintenanceController.createIssue
);

router.get(
  '/:issueId/status',
  guestStatusLimiter,
  validate(maintenanceValidation.getGuestIssueStatus),
  maintenanceController.getGuestIssueStatus
);

router.get('/hotels/:hotelId', auth(), isHotelOwner, validate(maintenanceValidation.getIssues), maintenanceController.getIssues);

router.get(
  '/hotels/:hotelId/pending-count',
  auth(),
  isHotelOwner,
  validate(maintenanceValidation.getPendingCount),
  maintenanceController.getPendingCount
);

router.patch('/:issueId/status', auth(), validate(maintenanceValidation.updateStatus), maintenanceController.updateStatus);

export default router;
