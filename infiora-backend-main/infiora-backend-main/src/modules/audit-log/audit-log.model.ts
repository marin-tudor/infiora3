import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';

export interface IAuditLogDoc extends mongoose.Document {
  hotelId: mongoose.Types.ObjectId;
  actorType: 'user' | 'staff' | 'system' | 'guest';
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  summary: string;
  details?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new mongoose.Schema<IAuditLogDoc>(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Hotel' },
    actorType: { type: String, enum: ['user', 'staff', 'system', 'guest'], required: true },
    actorId: { type: String, default: null },
    action: { type: String, required: true, trim: true },
    targetType: { type: String, required: true, trim: true },
    targetId: { type: String, default: null },
    summary: { type: String, required: true, trim: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.plugin(toJSON);
auditLogSchema.index({ hotelId: 1, createdAt: -1 });
auditLogSchema.index({ hotelId: 1, action: 1, createdAt: -1 });
// Retain audit logs for 90 days (7776000 seconds). Override by setting AUDIT_LOG_RETENTION_DAYS env var.
const retentionDays = parseInt(process.env['AUDIT_LOG_RETENTION_DAYS'] || '90', 10);
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: retentionDays * 24 * 60 * 60 });

const AuditLog = mongoose.model<IAuditLogDoc>('AuditLog', auditLogSchema);

export default AuditLog;
