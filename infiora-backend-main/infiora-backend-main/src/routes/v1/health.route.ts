import express, { Request, Response } from 'express';
import httpStatus from 'http-status';
import config from '../../config/config';

const router = express.Router();

router.get('/', (_req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
  });
});

export default router;
