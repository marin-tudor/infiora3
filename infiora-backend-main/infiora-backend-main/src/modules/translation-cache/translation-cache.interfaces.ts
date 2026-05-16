import { Document, Model, ObjectId } from 'mongoose';

export interface ITranslationCache {
  hotel: ObjectId;
  scope: 'group' | 'room';
  group?: ObjectId;
  room?: ObjectId;
  targetLanguage: string;
  sourceLanguage?: string;
  contentHash: string;
  translatedPayload: Record<string, any>;
  status: 'pending' | 'ready' | 'failed';
  characterCount: number;
  error?: string;
  lastUsedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITranslationCacheDoc extends ITranslationCache, Document {}

export interface ITranslationCacheModel extends Model<ITranslationCacheDoc> {}
