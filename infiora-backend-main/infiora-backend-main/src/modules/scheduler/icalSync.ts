import cron from 'node-cron';
import logger from '../logger/logger';
import { syncAllICalSources } from '../orders/ical-sync.service';

export function startICalSyncCron(): void {
  // Every 2 hours at minute 0
  cron.schedule('0 */2 * * *', syncAllICalSources, { timezone: 'UTC' });
  logger.info('iCal sync cron started (every 2h UTC)');
}
