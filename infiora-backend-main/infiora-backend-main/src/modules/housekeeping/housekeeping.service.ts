import HousekeepingRequest from './housekeeping.model';
import { IHousekeepingRequestDoc, NewHousekeepingRequest } from './housekeeping.interfaces';
import { IOptions, QueryResult } from '../paginate/paginate';

const DUPLICATE_WINDOW_MS = 15 * 60 * 1000;

const normalizeText = (value?: string) => (value || '').trim().replace(/\s+/g, ' ');

const buildDuplicateFilter = (body: NewHousekeepingRequest) => ({
  hotel: body.hotel,
  room: body.room,
  type: body.type,
  note: normalizeText(body.note),
  guestRoomNumber: normalizeText(body.guestRoomNumber),
  status: { $in: ['pending', 'in_progress'] },
  createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
});

export const createHousekeepingRequest = async (body: NewHousekeepingRequest): Promise<IHousekeepingRequestDoc> => {
  const normalizedBody = {
    ...body,
    note: normalizeText(body.note),
    guestRoomNumber: normalizeText(body.guestRoomNumber),
  };
  const duplicate = await HousekeepingRequest.findOne(buildDuplicateFilter(normalizedBody));
  if (duplicate) {
    (duplicate as any).wasDuplicate = true;
    return duplicate;
  }

  return HousekeepingRequest.create({ ...normalizedBody, status: 'pending' });
};

export const queryHousekeepingRequests = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  return HousekeepingRequest.paginate(filter, options);
};

export const updateHousekeepingStatus = async (id: string, status: string): Promise<IHousekeepingRequestDoc | null> => {
  return HousekeepingRequest.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
};

export const getPendingCount = async (hotelId: string): Promise<number> => {
  return HousekeepingRequest.countDocuments({ hotel: hotelId, status: { $in: ['pending', 'in_progress'] } });
};
