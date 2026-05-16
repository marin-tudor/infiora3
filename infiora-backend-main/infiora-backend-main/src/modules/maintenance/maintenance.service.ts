import MaintenanceIssue from './maintenance.model';
import { IMaintenanceIssueDoc, NewMaintenanceIssue } from './maintenance.interfaces';
import { IOptions, QueryResult } from '../paginate/paginate';

const DUPLICATE_WINDOW_MS = 15 * 60 * 1000;

const normalizeText = (value?: string) => (value || '').trim().replace(/\s+/g, ' ');

const buildDuplicateFilter = (body: NewMaintenanceIssue) => ({
  hotel: body.hotel,
  room: body.room,
  type: body.type,
  description: normalizeText(body.description),
  guestRoomNumber: normalizeText(body.guestRoomNumber),
  photoHash: body.photoHash || '',
  status: { $in: ['pending', 'in_progress'] },
  createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
});

export const createMaintenanceIssue = async (body: NewMaintenanceIssue): Promise<IMaintenanceIssueDoc> => {
  const normalizedBody = {
    ...body,
    description: normalizeText(body.description),
    guestRoomNumber: normalizeText(body.guestRoomNumber),
    photoHash: body.photoHash || '',
  };
  const duplicate = await MaintenanceIssue.findOne(buildDuplicateFilter(normalizedBody));
  if (duplicate) {
    (duplicate as any).wasDuplicate = true;
    return duplicate;
  }

  return MaintenanceIssue.create({ ...normalizedBody, status: 'pending' });
};

export const queryMaintenanceIssues = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  return MaintenanceIssue.paginate(filter, options);
};

export const updateMaintenanceStatus = async (id: string, status: string): Promise<IMaintenanceIssueDoc | null> => {
  return MaintenanceIssue.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
};

export const getPendingCount = async (hotelId: string): Promise<number> => {
  return MaintenanceIssue.countDocuments({ hotel: hotelId, status: { $in: ['pending', 'in_progress'] } });
};
