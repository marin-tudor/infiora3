# Wave 1 — iCal Sync + Reservation Codes Filtering

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add iCal feed import from OTA platforms (Booking.com, Airbnb, etc.) that auto-creates ReservationCodes, and add filtering controls to the Codes tab.

**Architecture:** New `ICalSource` model per hotel stores OTA iCal URLs. A `node-cron` job runs every 2h fetching each enabled source via `node-ical`, upserting ReservationCodes by `externalUid` for dedup. Dashboard Order Settings gets an iCal config section; Codes tab gets showExpired/status/source filters backed by new query params on the existing codes endpoint.

**Tech Stack:** `node-ical` (iCal parsing), `node-cron` (already installed), Mongoose, MUI v5, RTK Query

---

## File Map

**Backend — create:**
- `src/modules/orders/ical-source.model.ts` — ICalSource mongoose schema
- `src/modules/orders/ical-sync.service.ts` — fetch + parse + upsert logic
- `src/modules/scheduler/icalSync.ts` — cron job registration

**Backend — modify:**
- `src/modules/orders/orders.interfaces.ts` — add IICalSource, update IReservationCode
- `src/modules/orders/reservation-code.model.ts` — add source, externalUid; make createdBy optional
- `src/modules/orders/orders.service.ts` — add iCal CRUD + filtered getCodes
- `src/modules/orders/orders.controller.ts` — add iCal handlers + update getCodes handler
- `src/routes/v1/orders.route.ts` — add iCal routes + update codes route
- `src/index.ts` — register icalSync cron

**Dashboard — modify:**
- `src/types/index.ts` — add IICalSource, update IReservationCode
- `src/redux/api/ordersApi.ts` — add iCal endpoints, update codes query
- `src/views/orders/components/ReservationCodes.tsx` — add filter toolbar
- `src/views/orders/components/OrderSettings.tsx` — add iCal sync section (import ICalSources component)

**Dashboard — create:**
- `src/views/orders/components/ICalSources.tsx` — iCal sources list + add/edit dialog

---

## Task 1: Install node-ical and add interfaces

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/package.json`
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.interfaces.ts`

- [ ] **Step 1: Install node-ical**

```bash
cd infiora-backend-main/infiora-backend-main
yarn add node-ical
yarn add -D @types/node-ical
```

Expected: `node_modules/node-ical` exists, no errors.

- [ ] **Step 2: Add IICalSource interface and update IReservationCode**

In `src/modules/orders/orders.interfaces.ts`, add after the `IReservationCode` block:

```typescript
// ─── iCal Source ──────────────────────────────────────────────────────────────

export type ICalPlatform = 'booking' | 'airbnb' | 'vrbo' | 'agoda' | 'tripadvisor' | 'custom';

export interface IICalSource {
  hotelId: Types.ObjectId;
  platform: ICalPlatform;
  label: string;
  url: string;
  enabled: boolean;
  lastSyncAt: Date | null;
  lastSyncStatus: 'success' | 'error' | null;
  lastSyncError: string | null;
}

export interface IICalSourceDoc extends IICalSource, Document {}
export interface IICalSourceModel extends Model<IICalSourceDoc> {}

export type NewICalSource = Pick<IICalSource, 'platform' | 'label' | 'url' | 'enabled'>;
```

Also update `IReservationCode` to add the new fields:

```typescript
export interface IReservationCode {
  hotelId: Types.ObjectId;
  roomId?: Types.ObjectId;
  roomNumber?: string;
  code: string;
  guestName?: string;
  checkIn: Date;
  checkOut: Date;
  active: boolean;
  createdBy?: Types.ObjectId;           // optional — null for auto-synced codes
  source?: ICalPlatform | 'manual';     // new
  externalUid?: string;                 // new — iCal UID for dedup
}
```

- [ ] **Step 3: Compile to verify types**

```bash
yarn compile
```

Expected: no TypeScript errors (warnings about unused vars in other files are ok).

- [ ] **Step 4: Commit**

```bash
git add src/modules/orders/orders.interfaces.ts package.json yarn.lock
git commit -m "feat(ical): add IICalSource interface, update IReservationCode with source/externalUid"
```

---

## Task 2: Create ICalSource Mongoose model

**Files:**
- Create: `infiora-backend-main/infiora-backend-main/src/modules/orders/ical-source.model.ts`

- [ ] **Step 1: Create the model file**

```typescript
// src/modules/orders/ical-source.model.ts
import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import { IICalSourceDoc, IICalSourceModel } from './orders.interfaces';

const icalSourceSchema = new mongoose.Schema<IICalSourceDoc, IICalSourceModel>(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Hotel' },
    platform: {
      type: String,
      enum: ['booking', 'airbnb', 'vrbo', 'agoda', 'tripadvisor', 'custom'],
      required: true,
    },
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    lastSyncAt: { type: Date, default: null },
    lastSyncStatus: { type: String, enum: ['success', 'error', null], default: null },
    lastSyncError: { type: String, default: null },
  },
  { timestamps: true }
);

icalSourceSchema.index({ hotelId: 1 });
icalSourceSchema.plugin(toJSON);

const ICalSource = mongoose.model<IICalSourceDoc, IICalSourceModel>('ICalSource', icalSourceSchema);
export default ICalSource;
```

- [ ] **Step 2: Compile**

```bash
yarn compile
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/orders/ical-source.model.ts
git commit -m "feat(ical): add ICalSource mongoose model"
```

---

## Task 3: Update ReservationCode model

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/orders/reservation-code.model.ts`

- [ ] **Step 1: Add source, externalUid fields and make createdBy optional**

Replace the full file content with:

```typescript
import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IReservationCodeDoc, IReservationCodeModel } from './orders.interfaces';

const reservationCodeSchema = new mongoose.Schema<IReservationCodeDoc, IReservationCodeModel>(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Hotel' },
    roomId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Room' },
    roomNumber: { type: String, default: '' },
    code: { type: String, required: true, trim: true },
    guestName: { type: String, default: '' },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'User', default: null },
    source: {
      type: String,
      enum: ['manual', 'booking', 'airbnb', 'vrbo', 'agoda', 'tripadvisor', 'custom'],
      default: 'manual',
    },
    externalUid: { type: String, default: null },
  },
  { timestamps: true }
);

reservationCodeSchema.pre('save', function (next) {
  if (this.code) {
    this.code = this.code.trim().toUpperCase().replace(/\s/g, '');
  }
  next();
});

reservationCodeSchema.index({ hotelId: 1, roomId: 1 });
reservationCodeSchema.index({ hotelId: 1, code: 1 });
reservationCodeSchema.index(
  { hotelId: 1, roomId: 1, code: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);
// Dedup index for iCal sync — unique per (hotelId, externalUid) when externalUid is set
reservationCodeSchema.index(
  { hotelId: 1, externalUid: 1 },
  { unique: true, partialFilterExpression: { externalUid: { $type: 'string' } } }
);

reservationCodeSchema.plugin(toJSON);
reservationCodeSchema.plugin(paginate);

const ReservationCode = mongoose.model<IReservationCodeDoc, IReservationCodeModel>('ReservationCode', reservationCodeSchema);
export default ReservationCode;
```

- [ ] **Step 2: Compile**

```bash
yarn compile
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/orders/reservation-code.model.ts
git commit -m "feat(ical): update ReservationCode model with source, externalUid fields"
```

---

## Task 4: Create iCal sync service

**Files:**
- Create: `infiora-backend-main/infiora-backend-main/src/modules/orders/ical-sync.service.ts`

- [ ] **Step 1: Write unit tests first**

Create `src/modules/orders/__tests__/ical-sync.service.test.ts`:

```typescript
import { extractCodeFromUid, extractGuestName, isBlockedEvent } from '../ical-sync.service';

describe('ical-sync.service helpers', () => {
  describe('isBlockedEvent', () => {
    it('returns true for "Not available"', () => {
      expect(isBlockedEvent('Not available')).toBe(true);
    });
    it('returns true for "CLOSED"', () => {
      expect(isBlockedEvent('CLOSED')).toBe(true);
    });
    it('returns false for a real reservation summary', () => {
      expect(isBlockedEvent('HMXYZ123 - John Smith (Airbnb)')).toBe(false);
    });
    it('returns false for undefined', () => {
      expect(isBlockedEvent(undefined)).toBe(false);
    });
  });

  describe('extractCodeFromUid', () => {
    it('extracts numeric ID from booking.com UID', () => {
      expect(extractCodeFromUid('booking-9876543210@booking.com', 'booking')).toBe('9876543210');
    });
    it('extracts HM code from airbnb UID', () => {
      expect(extractCodeFromUid('Airbnb_HMABCDEF123', 'airbnb')).toBe('HMABCDEF123');
    });
    it('returns cleaned UID for custom platform', () => {
      const result = extractCodeFromUid('uid-abc123@vrbo.com', 'vrbo');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('extractGuestName', () => {
    it('extracts name from Airbnb SUMMARY', () => {
      expect(extractGuestName('HMXYZ - John Smith (Airbnb)')).toBe('John Smith');
    });
    it('returns empty string if no summary', () => {
      expect(extractGuestName(undefined)).toBe('');
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
yarn test --testPathPattern=ical-sync
```

Expected: FAIL — `extractCodeFromUid` etc. are not defined.

- [ ] **Step 3: Create the sync service**

```typescript
// src/modules/orders/ical-sync.service.ts
import ical from 'node-ical';
import mongoose from 'mongoose';
import ICalSource from './ical-source.model';
import ReservationCode from './reservation-code.model';
import logger from '../logger/logger';

const BLOCKED_SUMMARIES = ['not available', 'closed', 'unavailable', 'blocked'];

export const isBlockedEvent = (summary?: string): boolean => {
  if (!summary) return false;
  const lower = summary.toLowerCase();
  return BLOCKED_SUMMARIES.some((s) => lower.includes(s));
};

export const extractCodeFromUid = (uid: string, platform: string): string => {
  if (platform === 'airbnb') {
    const match = uid.match(/airbnb[_-]?([A-Z0-9]+)/i);
    return match ? match[1].toUpperCase() : uid.replace(/[@.]/g, '-').toUpperCase().slice(0, 30);
  }
  if (platform === 'booking') {
    const match = uid.match(/(\d{5,})/);
    return match ? match[1] : uid.replace(/[@.]/g, '-').toUpperCase().slice(0, 30);
  }
  return uid.replace(/[@.]/g, '-').toUpperCase().slice(0, 30);
};

export const extractGuestName = (summary?: string, description?: string): string => {
  if (!summary) return '';
  const airbnbMatch = summary.match(/HM\w+ - (.+?) \(Airbnb\)/);
  if (airbnbMatch) return airbnbMatch[1].trim();
  return '';
};

export const syncICalSource = async (sourceId: string): Promise<{ synced: number; errors: number }> => {
  const source = await ICalSource.findById(sourceId);
  if (!source || !source.enabled) return { synced: 0, errors: 0 };

  try {
    const events = await ical.async.fromURL(source.url);
    const ops: any[] = [];

    for (const event of Object.values(events)) {
      if ((event as any).type !== 'VEVENT') continue;
      const e = event as any;
      if (isBlockedEvent(e.summary)) continue;

      const checkIn = e.start instanceof Date ? e.start : new Date(e.start);
      const checkOut = e.end instanceof Date ? e.end : new Date(e.end);
      if (!checkIn || !checkOut || isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) continue;

      const uid = String(e.uid || '');
      if (!uid) continue;

      const code = extractCodeFromUid(uid, source.platform);
      const guestName = extractGuestName(e.summary, e.description);

      ops.push({
        updateOne: {
          filter: { hotelId: source.hotelId, externalUid: uid },
          update: {
            $set: { code, guestName, checkIn, checkOut, source: source.platform, active: true },
            $setOnInsert: {
              hotelId: source.hotelId,
              externalUid: uid,
              createdBy: null,
            },
          },
          upsert: true,
        },
      });
    }

    if (ops.length > 0) {
      await (ReservationCode as any).bulkWrite(ops, { ordered: false });
    }

    await ICalSource.findByIdAndUpdate(sourceId, {
      lastSyncAt: new Date(),
      lastSyncStatus: 'success',
      lastSyncError: null,
    });

    logger.info(`iCal sync OK source=${sourceId} events=${ops.length}`);
    return { synced: ops.length, errors: 0 };
  } catch (err: any) {
    await ICalSource.findByIdAndUpdate(sourceId, {
      lastSyncAt: new Date(),
      lastSyncStatus: 'error',
      lastSyncError: err.message || 'Unknown error',
    });
    logger.error(`iCal sync FAIL source=${sourceId} err=${err.message}`);
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
```

- [ ] **Step 4: Run tests**

```bash
yarn test --testPathPattern=ical-sync
```

Expected: PASS (3 describe blocks, all green).

- [ ] **Step 5: Commit**

```bash
git add src/modules/orders/ical-sync.service.ts src/modules/orders/__tests__/ical-sync.service.test.ts
git commit -m "feat(ical): add iCal sync service with unit tests"
```

---

## Task 5: Create iCal sync cron job

**Files:**
- Create: `infiora-backend-main/infiora-backend-main/src/modules/scheduler/icalSync.ts`
- Modify: `infiora-backend-main/infiora-backend-main/src/index.ts`

- [ ] **Step 1: Create the cron file**

```typescript
// src/modules/scheduler/icalSync.ts
import cron from 'node-cron';
import logger from '../logger/logger';
import { syncAllICalSources } from '../orders/ical-sync.service';

export function startICalSyncCron(): void {
  // Every 2 hours at minute 0
  cron.schedule('0 */2 * * *', syncAllICalSources, { timezone: 'UTC' });
  logger.info('iCal sync cron started (every 2h UTC)');
}
```

- [ ] **Step 2: Register in src/index.ts**

Add import at the top of `src/index.ts`:

```typescript
import { startICalSyncCron } from './modules/scheduler/icalSync';
```

Inside the `if (config.env !== 'test')` block, add:

```typescript
startICalSyncCron();
```

- [ ] **Step 3: Compile**

```bash
yarn compile
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/scheduler/icalSync.ts src/index.ts
git commit -m "feat(ical): register iCal sync cron job (every 2h)"
```

---

## Task 6: Add iCal CRUD and updated getCodes to orders.service.ts

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.service.ts`

- [ ] **Step 1: Add imports at the top of orders.service.ts**

Add after existing imports:

```typescript
import ICalSource from './ical-source.model';
import { syncICalSource } from './ical-sync.service';
import { IICalSource, NewICalSource, ICalPlatform } from './orders.interfaces';
```

- [ ] **Step 2: Add iCal source service functions**

Add at the end of orders.service.ts (before the last export if any, otherwise at the bottom):

```typescript
// ─── iCal Sources ─────────────────────────────────────────────────────────────

const PLATFORM_LABELS: Record<ICalPlatform, string> = {
  booking: 'Booking.com',
  airbnb: 'Airbnb',
  vrbo: 'Vrbo',
  agoda: 'Agoda',
  tripadvisor: 'TripAdvisor',
  custom: 'Custom',
};

export const getICalSources = async (hotelId: string) => {
  return ICalSource.find({ hotelId }).sort({ createdAt: 1 });
};

export const createICalSource = async (hotelId: string, data: NewICalSource) => {
  const label = data.platform !== 'custom' ? PLATFORM_LABELS[data.platform] : data.label;
  return ICalSource.create({ ...data, hotelId, label });
};

export const updateICalSource = async (sourceId: string, hotelId: string, data: Partial<NewICalSource>) => {
  const source = await ICalSource.findOne({ _id: sourceId, hotelId });
  if (!source) throw new ApiError(httpStatus.NOT_FOUND, 'iCal source not found');
  Object.assign(source, data);
  await source.save();
  return source;
};

export const deleteICalSource = async (sourceId: string, hotelId: string) => {
  const deleted = await ICalSource.findOneAndDelete({ _id: sourceId, hotelId });
  if (!deleted) throw new ApiError(httpStatus.NOT_FOUND, 'iCal source not found');
};

export const manualSyncICalSource = async (sourceId: string, hotelId: string) => {
  const source = await ICalSource.findOne({ _id: sourceId, hotelId });
  if (!source) throw new ApiError(httpStatus.NOT_FOUND, 'iCal source not found');
  return syncICalSource(sourceId);
};

export const manualSyncAllICalSources = async (hotelId: string) => {
  const sources = await ICalSource.find({ hotelId, enabled: true });
  let totalSynced = 0;
  for (const source of sources) {
    const result = await syncICalSource(String(source._id));
    totalSynced += result.synced;
  }
  return { synced: totalSynced, sources: sources.length };
};
```

- [ ] **Step 3: Update getReservationCodes to support filtering**

Find the existing `getReservationCodes` function (or `getCodes`) in orders.service.ts and replace it with:

```typescript
export const getReservationCodes = async (
  hotelId: string,
  filters: { showExpired?: boolean; status?: 'all' | 'current' | 'upcoming'; source?: string }
) => {
  const now = new Date();
  const query: any = { hotelId };

  // Hide expired by default
  if (!filters.showExpired) {
    query.checkOut = { $gte: now };
  }

  // Status filter (takes precedence over showExpired for checkIn/checkOut)
  if (filters.status === 'current') {
    query.checkIn = { $lte: now };
    query.checkOut = { $gte: now };
  } else if (filters.status === 'upcoming') {
    query.checkIn = { $gt: now };
  }

  // Source filter
  if (filters.source && filters.source !== 'all') {
    if (filters.source === 'manual') {
      query.source = { $in: ['manual', null] };
    } else {
      query.source = filters.source;
    }
  }

  return ReservationCode.find(query).sort({ checkIn: 1 });
};
```

- [ ] **Step 4: Compile**

```bash
yarn compile
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/orders/orders.service.ts
git commit -m "feat(ical): add iCal CRUD services and filtered getReservationCodes"
```

---

## Task 7: Add iCal controllers to orders.controller.ts

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.controller.ts`

- [ ] **Step 1: Update getReservationCodes controller**

Find the existing `getReservationCodes` controller and replace with:

```typescript
export const getReservationCodes = catchAsync(async (req: Request, res: Response) => {
  const hotelId = req.params['hotelId'] as string;
  const showExpired = req.query['showExpired'] === 'true';
  const status = (req.query['status'] as 'all' | 'current' | 'upcoming') || 'all';
  const source = (req.query['source'] as string) || 'all';
  const codes = await ordersService.getReservationCodes(hotelId, { showExpired, status, source });
  res.send(codes);
});
```

- [ ] **Step 2: Add iCal controllers at the bottom of orders.controller.ts**

```typescript
// ─── iCal Sources ─────────────────────────────────────────────────────────────

export const getICalSources = catchAsync(async (req: Request, res: Response) => {
  const sources = await ordersService.getICalSources(req.params['hotelId'] as string);
  res.send(sources);
});

export const createICalSource = catchAsync(async (req: Request, res: Response) => {
  const source = await ordersService.createICalSource(req.params['hotelId'] as string, req.body);
  res.status(httpStatus.CREATED).send(source);
});

export const updateICalSource = catchAsync(async (req: Request, res: Response) => {
  const source = await ordersService.updateICalSource(
    req.params['sourceId'] as string,
    req.params['hotelId'] as string,
    req.body
  );
  res.send(source);
});

export const deleteICalSource = catchAsync(async (req: Request, res: Response) => {
  await ordersService.deleteICalSource(req.params['sourceId'] as string, req.params['hotelId'] as string);
  res.status(httpStatus.NO_CONTENT).send();
});

export const syncICalSource = catchAsync(async (req: Request, res: Response) => {
  const result = await ordersService.manualSyncICalSource(
    req.params['sourceId'] as string,
    req.params['hotelId'] as string
  );
  res.send(result);
});

export const syncAllICalSources = catchAsync(async (req: Request, res: Response) => {
  const result = await ordersService.manualSyncAllICalSources(req.params['hotelId'] as string);
  res.send(result);
});
```

- [ ] **Step 3: Compile**

```bash
yarn compile
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/orders/orders.controller.ts
git commit -m "feat(ical): add iCal source controllers and update getCodes with filters"
```

---

## Task 8: Add iCal routes and update codes route

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/routes/v1/orders.route.ts`

- [ ] **Step 1: Add iCal routes after the Reservation Codes section**

In `src/routes/v1/orders.route.ts`, after the codes routes, add:

```typescript
// ─── iCal Sources ────────────────────────────────────────────────────────────

router
  .route('/hotels/:hotelId/ical-sources')
  .get(auth(), isHotelOwner, ordersController.getICalSources)
  .post(auth(), isHotelOwner, ordersController.createICalSource);

router
  .route('/hotels/:hotelId/ical-sources/sync-all')
  .post(auth(), isHotelOwner, ordersController.syncAllICalSources);

router
  .route('/hotels/:hotelId/ical-sources/:sourceId')
  .patch(auth(), isHotelOwner, ordersController.updateICalSource)
  .delete(auth(), isHotelOwner, ordersController.deleteICalSource);

router
  .route('/hotels/:hotelId/ical-sources/:sourceId/sync')
  .post(auth(), isHotelOwner, ordersController.syncICalSource);
```

- [ ] **Step 2: Compile**

```bash
yarn compile
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Start the server locally (`yarn dev`) and test:

```bash
# Get iCal sources (should return empty array)
curl -H "Authorization: Bearer <token>" http://localhost:3000/v1/orders/hotels/<hotelId>/ical-sources

# Create a source
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"platform":"airbnb","label":"Airbnb","url":"https://www.airbnb.com/calendar/ical/XXXXX.ics","enabled":true}' \
  http://localhost:3000/v1/orders/hotels/<hotelId>/ical-sources
```

Expected: 200 with `[]`, then 201 with the new source.

- [ ] **Step 4: Commit**

```bash
git add src/routes/v1/orders.route.ts
git commit -m "feat(ical): add iCal source routes to orders router"
```

---

## Task 9: Dashboard — update types and RTK Query

**Files:**
- Modify: `infiora-dash-main/infiora-dash-main/src/types/index.ts`
- Modify: `infiora-dash-main/infiora-dash-main/src/redux/api/ordersApi.ts`

- [ ] **Step 1: Add IICalSource type and update IReservationCode**

In `src/types/index.ts`, find the `IReservationCode` interface and add the new fields:

```typescript
export interface IReservationCode {
  id: string
  hotelId: string
  roomId?: string
  roomNumber?: string
  code: string
  guestName?: string
  checkIn: string
  checkOut: string
  active: boolean
  source?: 'manual' | 'booking' | 'airbnb' | 'vrbo' | 'agoda' | 'tripadvisor' | 'custom'
  externalUid?: string
  createdAt: string
}
```

Then add the new `IICalSource` interface:

```typescript
export type ICalPlatform = 'booking' | 'airbnb' | 'vrbo' | 'agoda' | 'tripadvisor' | 'custom'

export interface IICalSource {
  id: string
  hotelId: string
  platform: ICalPlatform
  label: string
  url: string
  enabled: boolean
  lastSyncAt: string | null
  lastSyncStatus: 'success' | 'error' | null
  lastSyncError: string | null
  createdAt: string
}
```

- [ ] **Step 2: Add RTK Query endpoints for iCal sources**

In `src/redux/api/ordersApi.ts`, add `IICalSource` to the imports from `@/types`.

Add `'ICalSources'` to `tagTypes`:

```typescript
tagTypes: ['Orders', 'Categories', 'Items', 'Settings', 'Codes', 'ICalSources'],
```

Add the following endpoints inside the `endpoints` builder:

```typescript
// iCal Sources
getICalSources: builder.query<IICalSource[], string>({
  query: hotelId => ({ url: `/v1/orders/hotels/${hotelId}/ical-sources` }),
  providesTags: [{ type: 'ICalSources', id: 'LIST' }],
}),
createICalSource: builder.mutation<IICalSource, { hotelId: string; platform: ICalPlatform; label: string; url: string; enabled: boolean }>({
  query: ({ hotelId, ...body }) => ({ url: `/v1/orders/hotels/${hotelId}/ical-sources`, method: 'POST', body }),
  invalidatesTags: [{ type: 'ICalSources', id: 'LIST' }],
}),
updateICalSource: builder.mutation<IICalSource, { hotelId: string; sourceId: string } & Partial<{ label: string; url: string; enabled: boolean }>>({
  query: ({ hotelId, sourceId, ...body }) => ({ url: `/v1/orders/hotels/${hotelId}/ical-sources/${sourceId}`, method: 'PATCH', body }),
  invalidatesTags: [{ type: 'ICalSources', id: 'LIST' }],
}),
deleteICalSource: builder.mutation<void, { hotelId: string; sourceId: string }>({
  query: ({ hotelId, sourceId }) => ({ url: `/v1/orders/hotels/${hotelId}/ical-sources/${sourceId}`, method: 'DELETE' }),
  invalidatesTags: [{ type: 'ICalSources', id: 'LIST' }],
}),
syncICalSource: builder.mutation<{ synced: number; errors: number }, { hotelId: string; sourceId: string }>({
  query: ({ hotelId, sourceId }) => ({ url: `/v1/orders/hotels/${hotelId}/ical-sources/${sourceId}/sync`, method: 'POST' }),
  invalidatesTags: [{ type: 'ICalSources', id: 'LIST' }],
}),
syncAllICalSources: builder.mutation<{ synced: number; sources: number }, string>({
  query: hotelId => ({ url: `/v1/orders/hotels/${hotelId}/ical-sources/sync-all`, method: 'POST' }),
  invalidatesTags: [{ type: 'ICalSources', id: 'LIST' }],
}),
```

Also update `getReservationCodes` query to support filter params:

```typescript
getReservationCodes: builder.query<
  IReservationCode[],
  { hotelId: string; showExpired?: boolean; status?: 'all' | 'current' | 'upcoming'; source?: string }
>({
  query: ({ hotelId, ...params }) => ({ url: `/v1/orders/hotels/${hotelId}/codes`, params }),
  providesTags: [{ type: 'Codes', id: 'LIST' }],
}),
```

Add the exports for the new hooks at the bottom of the file (or in the `export const { ... } = ordersApi` destructure):

```typescript
export const {
  // ... existing exports ...
  useGetICalSourcesQuery,
  useCreateICalSourceMutation,
  useUpdateICalSourceMutation,
  useDeleteICalSourceMutation,
  useSyncICalSourceMutation,
  useSyncAllICalSourcesMutation,
} = ordersApi
```

- [ ] **Step 3: Compile dashboard**

```bash
cd infiora-dash-main/infiora-dash-main
yarn build
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/redux/api/ordersApi.ts
git commit -m "feat(ical): add IICalSource types and RTK Query endpoints"
```

---

## Task 10: Create ICalSources dashboard component

**Files:**
- Create: `infiora-dash-main/infiora-dash-main/src/views/orders/components/ICalSources.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'
import { useState } from 'react'
import {
  Box, Stack, Typography, Button, Card, IconButton, Chip, Switch,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, FormControlLabel,
  CircularProgress, Tooltip
} from '@mui/material'
import { toast } from 'react-toastify'
import { format } from 'date-fns'
import {
  useGetICalSourcesQuery,
  useCreateICalSourceMutation,
  useUpdateICalSourceMutation,
  useDeleteICalSourceMutation,
  useSyncICalSourceMutation,
  useSyncAllICalSourcesMutation,
} from '@/redux/api/ordersApi'
import type { IICalSource, ICalPlatform } from '@/types'

const PLATFORMS: { value: ICalPlatform; label: string; helpUrl: string }[] = [
  { value: 'booking', label: 'Booking.com', helpUrl: 'https://partner.booking.com/en-us/help/reservations/ical-export' },
  { value: 'airbnb', label: 'Airbnb', helpUrl: 'https://www.airbnb.com/help/article/99' },
  { value: 'vrbo', label: 'Vrbo', helpUrl: 'https://help.vrbo.com/en-us/articles/115003986886' },
  { value: 'agoda', label: 'Agoda', helpUrl: 'https://ycs.agoda.com/en-us/help' },
  { value: 'tripadvisor', label: 'TripAdvisor', helpUrl: 'https://www.tripadvisor.com/help' },
  { value: 'custom', label: 'Custom iCal URL', helpUrl: '' },
]

const STATUS_COLOR: Record<string, 'success' | 'error' | 'default'> = {
  success: 'success',
  error: 'error',
}

interface AddDialogProps {
  open: boolean
  onClose: () => void
  hotelId: string
}

function AddDialog({ open, onClose, hotelId }: AddDialogProps) {
  const [platform, setPlatform] = useState<ICalPlatform>('booking')
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [create, { isLoading }] = useCreateICalSourceMutation()

  const selectedPlatform = PLATFORMS.find(p => p.value === platform)!

  const handleSubmit = async () => {
    if (!url.trim()) { toast.error('iCal URL is required'); return }
    try {
      await create({ hotelId, platform, label: label || selectedPlatform.label, url: url.trim(), enabled }).unwrap()
      toast.success('iCal source added')
      onClose()
      setUrl('')
      setLabel('')
    } catch { toast.error('Failed to add iCal source') }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Add iCal Source</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Platform</InputLabel>
            <Select value={platform} label='Platform' onChange={e => setPlatform(e.target.value as ICalPlatform)}>
              {PLATFORMS.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
            </Select>
          </FormControl>
          {platform === 'custom' && (
            <TextField label='Label' value={label} onChange={e => setLabel(e.target.value)} fullWidth />
          )}
          <TextField
            label='iCal URL'
            value={url}
            onChange={e => setUrl(e.target.value)}
            fullWidth
            placeholder='https://...'
            helperText={selectedPlatform.helpUrl
              ? <><a href={selectedPlatform.helpUrl} target='_blank' rel='noreferrer'>Where to find your iCal URL →</a></>
              : undefined}
          />
          <FormControlLabel
            control={<Switch checked={enabled} onChange={e => setEnabled(e.target.checked)} />}
            label='Enable auto-sync'
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant='contained' onClick={handleSubmit} disabled={isLoading}>Add</Button>
      </DialogActions>
    </Dialog>
  )
}

interface Props { hotelId: string }

export default function ICalSources({ hotelId }: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const { data: sources = [], isLoading } = useGetICalSourcesQuery(hotelId)
  const [deleteSource] = useDeleteICalSourceMutation()
  const [updateSource] = useUpdateICalSourceMutation()
  const [syncOne, { isLoading: syncingOne }] = useSyncICalSourceMutation()
  const [syncAll, { isLoading: syncingAll }] = useSyncAllICalSourcesMutation()

  const handleToggle = async (source: IICalSource) => {
    try {
      await updateSource({ hotelId, sourceId: source.id, enabled: !source.enabled }).unwrap()
    } catch { toast.error('Failed to update') }
  }

  const handleDelete = async (sourceId: string) => {
    if (!confirm('Remove this iCal source?')) return
    try {
      await deleteSource({ hotelId, sourceId }).unwrap()
      toast.success('Removed')
    } catch { toast.error('Failed to remove') }
  }

  const handleSync = async (sourceId: string) => {
    try {
      const result = await syncOne({ hotelId, sourceId }).unwrap()
      toast.success(`Synced ${result.synced} reservation codes`)
    } catch { toast.error('Sync failed') }
  }

  const handleSyncAll = async () => {
    try {
      const result = await syncAll(hotelId).unwrap()
      toast.success(`Synced ${result.synced} codes from ${result.sources} sources`)
    } catch { toast.error('Sync all failed') }
  }

  if (isLoading) return null

  return (
    <Box>
      <Stack direction='row' justifyContent='space-between' alignItems='center' mb={2}>
        <Typography variant='subtitle2'>iCal Sync</Typography>
        <Stack direction='row' spacing={1}>
          {sources.length > 0 && (
            <Button size='small' variant='outlined' onClick={handleSyncAll} disabled={syncingAll}>
              {syncingAll ? <CircularProgress size={14} sx={{ mr: 1 }} /> : null}
              Sync all
            </Button>
          )}
          <Button size='small' variant='contained' onClick={() => setAddOpen(true)}>
            Add iCal source
          </Button>
        </Stack>
      </Stack>

      {sources.length === 0 && (
        <Typography variant='body2' color='text.secondary'>
          No iCal sources configured. Add a source to automatically import reservation codes from Booking.com, Airbnb, and other platforms.
        </Typography>
      )}

      <Stack spacing={1}>
        {sources.map(source => (
          <Card key={source.id} variant='outlined' sx={{ p: 2 }}>
            <Stack direction='row' alignItems='center' spacing={2}>
              <Switch checked={source.enabled} onChange={() => handleToggle(source)} size='small' />
              <Box flex={1}>
                <Typography variant='body2' fontWeight={500}>{source.label}</Typography>
                <Typography variant='caption' color='text.secondary' noWrap sx={{ maxWidth: 300, display: 'block' }}>
                  {source.url}
                </Typography>
                {source.lastSyncAt && (
                  <Stack direction='row' spacing={1} alignItems='center' mt={0.5}>
                    <Chip
                      size='small'
                      label={source.lastSyncStatus === 'success' ? 'OK' : 'Error'}
                      color={STATUS_COLOR[source.lastSyncStatus ?? 'default'] ?? 'default'}
                    />
                    <Typography variant='caption' color='text.secondary'>
                      {format(new Date(source.lastSyncAt), 'dd.MM.yyyy HH:mm')}
                    </Typography>
                    {source.lastSyncError && (
                      <Tooltip title={source.lastSyncError}>
                        <Typography variant='caption' color='error' sx={{ cursor: 'help' }}>⚠</Typography>
                      </Tooltip>
                    )}
                  </Stack>
                )}
              </Box>
              <Button size='small' onClick={() => handleSync(source.id)} disabled={syncingOne}>
                Sync now
              </Button>
              <IconButton size='small' color='error' onClick={() => handleDelete(source.id)}>✕</IconButton>
            </Stack>
          </Card>
        ))}
      </Stack>

      <AddDialog open={addOpen} onClose={() => setAddOpen(false)} hotelId={hotelId} />
    </Box>
  )
}
```

- [ ] **Step 2: Compile**

```bash
yarn build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/views/orders/components/ICalSources.tsx
git commit -m "feat(ical): add ICalSources dashboard component"
```

---

## Task 11: Integrate ICalSources into OrderSettings

**Files:**
- Modify: `infiora-dash-main/infiora-dash-main/src/views/orders/components/OrderSettings.tsx`

- [ ] **Step 1: Add import at the top of OrderSettings.tsx**

```tsx
import ICalSources from './ICalSources'
```

- [ ] **Step 2: Add iCal section inside the settings form**

Find the end of the settings form (just before the save button or the last section), and add:

```tsx
{/* iCal Sync */}
<Box>
  <Typography variant='subtitle1' fontWeight={600} mb={2}>
    iCal Sync
  </Typography>
  <ICalSources hotelId={hotelId} />
</Box>
```

Where `hotelId` is already available from the component's props or the `useAuthUser()` hook.

- [ ] **Step 3: Start dev server and verify**

```bash
yarn dev
```

Navigate to Orders → Setup tab → scroll to bottom. Verify "iCal Sync" section appears with "Add iCal source" button.

- [ ] **Step 4: Commit**

```bash
git add src/views/orders/components/OrderSettings.tsx
git commit -m "feat(ical): integrate ICalSources into OrderSettings"
```

---

## Task 12: Add filtering toolbar to ReservationCodes

**Files:**
- Modify: `infiora-dash-main/infiora-dash-main/src/views/orders/components/ReservationCodes.tsx`

- [ ] **Step 1: Add filter state and updated query at the top of ReservationCodes**

Add these state variables inside the `ReservationCodes` component:

```tsx
const [showExpired, setShowExpired] = useState(false)
const [statusFilter, setStatusFilter] = useState<'all' | 'current' | 'upcoming'>('all')
const [sourceFilter, setSourceFilter] = useState('all')
```

Update the `useGetReservationCodesQuery` call to pass the filters:

```tsx
const { data: codes = [], isLoading } = useGetReservationCodesQuery({
  hotelId,
  showExpired,
  status: statusFilter,
  source: sourceFilter,
})
```

Also fetch iCal sources to populate the source filter dropdown:

```tsx
import { useGetICalSourcesQuery } from '@/redux/api/ordersApi'
// ...
const { data: icalSources = [] } = useGetICalSourcesQuery(hotelId)
const hasICalSources = icalSources.length > 0
```

- [ ] **Step 2: Count expired codes for the "hiding N expired" hint**

Add a separate query to count how many are hidden (only when showExpired is false):

```tsx
const { data: allCodes = [] } = useGetReservationCodesQuery(
  { hotelId, showExpired: true, status: statusFilter, source: sourceFilter },
  { skip: showExpired }
)
const hiddenCount = showExpired ? 0 : allCodes.length - codes.length
```

- [ ] **Step 3: Add the filter toolbar above the codes list**

Insert this JSX above the codes list/table, after the header row:

```tsx
<Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' mb={2}>
  {/* Show expired toggle */}
  <FormControlLabel
    control={<Switch checked={showExpired} onChange={e => setShowExpired(e.target.checked)} size='small' />}
    label='Show expired'
  />

  {/* Status filter */}
  <FormControl size='small' sx={{ minWidth: 140 }}>
    <InputLabel>Status</InputLabel>
    <Select
      value={statusFilter}
      label='Status'
      onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
    >
      <MenuItem value='all'>All active</MenuItem>
      <MenuItem value='current'>Currently active</MenuItem>
      <MenuItem value='upcoming'>Upcoming</MenuItem>
    </Select>
  </FormControl>

  {/* Source filter — only shown if hotel has iCal sources */}
  {hasICalSources && (
    <FormControl size='small' sx={{ minWidth: 140 }}>
      <InputLabel>Source</InputLabel>
      <Select value={sourceFilter} label='Source' onChange={e => setSourceFilter(e.target.value)}>
        <MenuItem value='all'>All sources</MenuItem>
        <MenuItem value='manual'>Manual</MenuItem>
        {icalSources.map(s => (
          <MenuItem key={s.id} value={s.platform}>{s.label}</MenuItem>
        ))}
      </Select>
    </FormControl>
  )}

  {/* Hiding N expired hint */}
  {!showExpired && hiddenCount > 0 && (
    <Typography variant='caption' color='text.secondary'>
      Hiding {hiddenCount} expired {hiddenCount === 1 ? 'code' : 'codes'}
    </Typography>
  )}
</Stack>
```

Add missing MUI imports: `Switch, FormControlLabel, FormControl, InputLabel, Select, MenuItem`.

- [ ] **Step 4: Start dev server and test**

```bash
yarn dev
```

Navigate to Orders → Codes. Verify:
- "Show expired" toggle hides/shows expired codes
- Status filter switches between all active / currently active / upcoming
- Source filter only appears after adding an iCal source

- [ ] **Step 5: Commit**

```bash
git add src/views/orders/components/ReservationCodes.tsx
git commit -m "feat(ical): add filtering toolbar to ReservationCodes tab"
```

---

## Wave 1 Complete

All Wave 1 features are done:
- ✅ iCal sources CRUD (backend + dashboard)
- ✅ Cron job every 2h + manual sync
- ✅ ReservationCode dedup by externalUid
- ✅ Codes filtering (showExpired, status, source)
