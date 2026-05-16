import express, { Router } from 'express';
import { auth } from '../../modules/auth';
import { isHotelOwner } from '../../modules/middleware';
import { getHotelAnalytics } from '../../modules/analytics/analytics.controller';

const router: Router = express.Router({ mergeParams: true });

router.get('/', auth(), isHotelOwner, getHotelAnalytics);

export default router;
