import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';

const npsTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    entityId: { type: String, required: true },
    entityType: { type: String, enum: ['order', 'booking'], required: true },
    guestEmail: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, default: null },
    usedAt: { type: Date, default: null },
    commentProvidedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

npsTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

npsTokenSchema.plugin(toJSON);

export default mongoose.model('NpsToken', npsTokenSchema);
