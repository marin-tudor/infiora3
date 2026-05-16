import cron from 'node-cron';
import { cleanupOrphanedUploads } from '../utils/cleanupOrphanedUploads';
import logger from '../logger/logger';

const runCleanup = async (): Promise<void> => {
  logger.info('Orphaned uploads cleanup: starting...');
  try {
    const { deleted, freed } = await cleanupOrphanedUploads();
    logger.info(
      `Orphaned uploads cleanup: done. Deleted ${deleted} file(s), freed ${(freed / 1024).toFixed(1)} KB.`
    );
  } catch (err) {
    logger.error(`Orphaned uploads cleanup: unexpected error: ${err}`);
  }
};

export const startCleanupOrphanedUploadsJob = (): void => {
  // Every Sunday at 03:00 UTC — low-traffic window
  cron.schedule('0 3 * * 0', runCleanup, { timezone: 'UTC' });
  logger.info('Orphaned uploads cleanup cron scheduled (Sun 03:00 UTC)');
};
