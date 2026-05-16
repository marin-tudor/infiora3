import mongoose from 'mongoose';
import app from './app';
import config from './config/config';
import logger from './modules/logger/logger';
import { startScheduledOrdersJob } from './modules/scheduler/scheduledOrders';
import { startWeeklyReportJob } from './modules/scheduler/weeklyReport';
import { startSlotGenerationCron } from './modules/scheduler/slotGeneration';
import { startDailyDigestCron } from './modules/scheduler/dailyDigest';
import { startICalSyncCron } from './modules/scheduler/icalSync';
import { startWaitlistCron } from './modules/booking/booking.service';
import { startCleanupOrphanedUploadsJob } from './modules/scheduler/cleanupOrphanedUploadsJob';

let server: any;
mongoose.connect(config.mongoose.url).then(() => {
  logger.info('Connected to MongoDB');
  server = app.listen(config.port, () => {
    logger.info(`Listening to port ${config.port}`);
  });
  if (config.env !== 'test') {
    startWeeklyReportJob();
    startScheduledOrdersJob();
    startSlotGenerationCron();
    startWaitlistCron();
    startDailyDigestCron();
    startICalSyncCron();
    startCleanupOrphanedUploadsJob();
  }
});

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error: string) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});
