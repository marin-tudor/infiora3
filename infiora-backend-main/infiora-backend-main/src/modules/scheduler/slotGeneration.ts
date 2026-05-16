import cron from 'node-cron';
import CatalogItem from '../orders/catalog-item.model';
import TimeSlot from '../booking/time-slot.model';
import BlackoutDate from '../booking/blackout-date.model';
import { Hotel } from '../hotel';
import logger from '../logger/logger';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
type DayKey = typeof DAYS[number];

export async function generateSlotsForHotel(hotelId: string): Promise<void> {
  const items = await CatalogItem.find({ hotelId, type: 'bookable', available: true });

  for (const item of items) {
    const config = item.bookingConfig;
    if (!config) continue;

    const useSimple = config.simpleAvailability?.enabled !== false && config.simpleAvailability?.from;
    const simpleEntry = useSimple ? { from: config.simpleAvailability.from, to: config.simpleAvailability.to } : null;

    if (!useSimple && !config.weeklySchedule) continue;

    const blackoutDates = await BlackoutDate.find({
      hotelId,
      $or: [{ itemId: null }, { itemId: item._id }],
    });
    const blackoutSet = new Set(blackoutDates.map((b) => b.date));

    const step = Math.max((config as any).startInterval ?? config.duration, config.duration + config.bufferMinutes);

    const maxPersons =
      (config as any).bookingModel === 'shared'
        ? ((config as any).totalInventory ?? 1) * ((config as any).capacityPerUnit ?? config.maxPersons ?? 1)
        : (config as any).totalInventory ?? 1;

    const now = new Date();
    const ops: any[] = [];

    for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
      const date = new Date(now);
      date.setDate(now.getDate() + dayOffset);
      date.setHours(0, 0, 0, 0);
      const dayKey = DAYS[date.getDay()] as DayKey | undefined;
      if (!dayKey) continue;

      const dateStr = date.toISOString().slice(0, 10);
      if (blackoutSet.has(dateStr)) continue;

      const schedule = useSimple ? (simpleEntry ? [simpleEntry] : []) : config.weeklySchedule[dayKey];

      if (!schedule || schedule.length === 0) continue;

      for (const entry of schedule) {
        const fromParts = entry.from.split(':').map(Number);
        const toParts = entry.to.split(':').map(Number);
        const fromH = fromParts[0] ?? 0;
        const fromM = fromParts[1] ?? 0;
        const toH = toParts[0] ?? 0;
        const toM = toParts[1] ?? 0;
        const fromMinutes = fromH * 60 + fromM;
        const toMinutes = toH * 60 + toM;

        for (let m = fromMinutes; m + config.duration <= toMinutes; m += step) {
          const slotStart = new Date(date);
          slotStart.setHours(Math.floor(m / 60), m % 60, 0, 0);
          const slotEnd = new Date(slotStart.getTime() + config.duration * 60_000);

          ops.push({
            updateOne: {
              filter: { itemId: item._id, startTime: slotStart },
              update: {
                $set: {
                  endTime: slotEnd,
                  maxPersons,
                },
                $setOnInsert: {
                  itemId: item._id,
                  startTime: slotStart,
                  bookedPersons: 0,
                  isBlocked: false,
                },
              },
              upsert: true,
            },
          });
        }
      }
    }

    if (ops.length > 0) {
      await TimeSlot.bulkWrite(ops, { ordered: false });
      logger.info(`Generated ${ops.length} slots for item ${item._id}`);
    }
  }
}

export async function generateSlotsForAllHotels(): Promise<void> {
  const hotels = await Hotel.find({ 'features.bookableServicesEnabled': true });
  for (const hotel of hotels) {
    await generateSlotsForHotel(String(hotel._id)).catch((err) =>
      logger.error(`Slot generation failed for hotel ${hotel._id}: ${err.message}`)
    );
  }
}

export function startSlotGenerationCron(): void {
  cron.schedule('0 2 * * *', generateSlotsForAllHotels, { timezone: 'UTC' });
  logger.info('Slot generation cron started (02:00 UTC daily)');
}
