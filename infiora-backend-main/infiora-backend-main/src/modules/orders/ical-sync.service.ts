import ical from 'node-ical';
import axios from 'axios';
import dns from 'node:dns/promises';
import net from 'node:net';
import httpStatus from 'http-status';
import ICalSource from './ical-source.model';
import ReservationCode from './reservation-code.model';
import logger from '../logger/logger';
import ApiError from '../errors/ApiError';

const BLOCKED_SUMMARIES = ['not available', 'closed', 'unavailable', 'blocked'];
const BLOCKED_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '169.254.169.254']);
const ICAL_FETCH_TIMEOUT_MS = 5000;
const ICAL_MAX_BYTES = 1024 * 1024;
type ReservationCodeBulkWriteOperation = Parameters<typeof ReservationCode.bulkWrite>[0] extends Array<infer T> ? T : never;

const isPrivateIpv4 = (ip: string) => {
  const [a = Number.NaN, b = Number.NaN] = ip.split('.').map(Number);
  if (Number.isNaN(a) || Number.isNaN(b)) {
    return false;
  }

  return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
};

const isBlockedIp = (ip: string) => {
  if (net.isIP(ip) === 4) {
    return isPrivateIpv4(ip);
  }

  if (net.isIP(ip) === 6) {
    const normalized = ip.toLowerCase();
    return (
      normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80')
    );
  }

  return false;
};

export const assertSafeRemoteUrl = async (rawUrl: string): Promise<URL> => {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid URL');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Only https URLs are allowed');
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Private or local network URLs are not allowed');
  }

  if (net.isIP(hostname) && isBlockedIp(hostname)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Private or local network URLs are not allowed');
  }

  let records: Array<{ address: string }>;
  try {
    records = await dns.lookup(hostname, { all: true });
  } catch {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Could not resolve remote host');
  }
  if (!records.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Could not resolve remote host');
  }
  if (records.some((record) => isBlockedIp(record.address))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Private or local network URLs are not allowed');
  }

  return parsedUrl;
};

const fetchICalText = async (safeUrl: URL): Promise<string> => {
  const response = await axios.get<string>(safeUrl.toString(), {
    responseType: 'text',
    timeout: ICAL_FETCH_TIMEOUT_MS,
    maxRedirects: 0,
    maxContentLength: ICAL_MAX_BYTES,
    maxBodyLength: ICAL_MAX_BYTES,
    validateStatus: (status) => status >= 200 && status < 300,
    headers: {
      Accept: 'text/calendar,text/plain;q=0.9,*/*;q=0.1',
      'User-Agent': 'InfioraICalSync/1.0',
    },
  });

  const contentType = String(response.headers['content-type'] || '').toLowerCase();
  if (
    contentType &&
    !contentType.includes('text/calendar') &&
    !contentType.includes('text/plain') &&
    !contentType.includes('application/octet-stream')
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Remote URL did not return calendar data');
  }

  const body = typeof response.data === 'string' ? response.data : '';
  if (!body.trim()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Remote calendar response was empty');
  }

  return body;
};

export const isBlockedEvent = (summary?: string): boolean => {
  if (!summary) return false;
  const lower = summary.toLowerCase();
  return BLOCKED_SUMMARIES.some((s) => lower.includes(s));
};

export const extractCodeFromUid = (uid: string, platform: string): string => {
  const fallback = uid.replace(/[@.]/g, '-').toUpperCase().slice(0, 30);
  if (platform === 'airbnb') {
    const match = uid.match(/airbnb[_-]?([A-Z0-9]+)/i);
    const captured = match?.[1];
    return captured ? captured.toUpperCase() : fallback;
  }
  if (platform === 'booking') {
    const match = uid.match(/(\d{5,})/);
    const captured = match?.[1];
    return captured ?? fallback;
  }
  return fallback;
};

export const extractGuestName = (summary?: string): string => {
  if (!summary) return '';
  const airbnbMatch = summary.match(/HM\w+ - (.+?) \(Airbnb\)/);
  const captured = airbnbMatch?.[1];
  if (captured) return captured.trim();
  return '';
};

export const syncICalSource = async (sourceId: string): Promise<{ synced: number; errors: number }> => {
  const source = await ICalSource.findById(sourceId);
  if (!source || !source.enabled) return { synced: 0, errors: 0 };

  try {
    const safeUrl = await assertSafeRemoteUrl(source.url);
    const rawCalendar = await fetchICalText(safeUrl);
    const events = await ical.async.parseICS(rawCalendar);
    const ops: ReservationCodeBulkWriteOperation[] = [];

    for (const event of Object.values(events)) {
      if ((event as any).type !== 'VEVENT') continue;
      const e = event as any;
      if (isBlockedEvent(e.summary)) continue;

      const checkIn = e.start instanceof Date ? e.start : new Date(e.start);
      const checkOut = e.end instanceof Date ? e.end : new Date(e.end);
      if (!checkIn || !checkOut || Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) continue;

      const uid = String(e.uid || '');
      if (!uid) continue;

      const code = extractCodeFromUid(uid, source.platform);
      const guestName = extractGuestName(e.summary);

      ops.push({
        updateOne: {
          filter: { hotelId: source.hotelId, externalUid: uid },
          update: {
            $set: { code, guestName, checkIn, checkOut, source: source.platform, active: true },
            $setOnInsert: {
              hotelId: source.hotelId,
              externalUid: uid,
            },
          },
          upsert: true,
        },
      });
    }

    if (ops.length > 0) {
      await ReservationCode.bulkWrite(ops, { ordered: false });
    }

    await ICalSource.findByIdAndUpdate(sourceId, {
      lastSyncAt: new Date(),
      lastSyncStatus: 'success',
      lastSyncError: null,
    });

    logger.info(`iCal sync OK source=${sourceId} events=${ops.length}`);
    return { synced: ops.length, errors: 0 };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await ICalSource.findByIdAndUpdate(sourceId, {
      lastSyncAt: new Date(),
      lastSyncStatus: 'error',
      lastSyncError: message,
    });
    logger.error(`iCal sync FAIL source=${sourceId} err=${message}`);
    return { synced: 0, errors: 1 };
  }
};

export const syncAllICalSources = async (): Promise<void> => {
  const sources = await ICalSource.find({ enabled: true });
  logger.info(`iCal sync: processing ${sources.length} sources`);
  for (const source of sources) {
    await syncICalSource(String(source._id));
  }
};
