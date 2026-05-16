import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import { ITranslationCacheDoc } from './translation-cache.interfaces';

const translationCacheSchema = new mongoose.Schema<ITranslationCacheDoc>(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
      index: true,
    },
    scope: {
      type: String,
      enum: ['group', 'room'],
      required: true,
      index: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      index: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      index: true,
    },
    targetLanguage: {
      type: String,
      required: true,
      index: true,
    },
    sourceLanguage: {
      type: String,
    },
    contentHash: {
      type: String,
      required: true,
      index: true,
    },
    translatedPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['pending', 'ready', 'failed'],
      default: 'pending',
      index: true,
    },
    characterCount: {
      type: Number,
      default: 0,
    },
    error: {
      type: String,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

translationCacheSchema.index(
  { scope: 1, group: 1, targetLanguage: 1, contentHash: 1 },
  { unique: true, partialFilterExpression: { scope: 'group', group: { $exists: true } } }
);
translationCacheSchema.index(
  { scope: 1, room: 1, targetLanguage: 1, contentHash: 1 },
  { unique: true, partialFilterExpression: { scope: 'room', room: { $exists: true } } }
);

translationCacheSchema.plugin(toJSON);

const TranslationCache = mongoose.model<ITranslationCacheDoc>('TranslationCache', translationCacheSchema);

export default TranslationCache;
