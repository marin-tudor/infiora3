import AuditLog from './audit-log.model';

type CreateAuditLogInput = {
  hotelId: string;
  actorType: 'user' | 'staff' | 'system' | 'guest';
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  summary: string;
  details?: Record<string, unknown>;
};

export const createAuditLog = async (input: CreateAuditLogInput) => {
  return AuditLog.create(input);
};

export const listAuditLogs = async (hotelId: string, limit = 20) => {
  return AuditLog.find({ hotelId }).sort({ createdAt: -1 }).limit(Math.max(1, Math.min(limit, 100)));
};
