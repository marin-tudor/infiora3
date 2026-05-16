import express, { Router } from 'express';
import { submitFeedback } from '../../modules/nps/nps.controller';
import { createRateLimiter } from '../../modules/utils';

const router: Router = express.Router();
const npsLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });

router.get('/feedback/:token/:rating', npsLimiter, submitFeedback);

export default router;
