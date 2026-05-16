import crypto from 'crypto';
import mongoose from 'mongoose';
import TranslationCache from '../translation-cache/translation-cache.model';
import { ITranslationCacheDoc } from '../translation-cache/translation-cache.interfaces';
import {
  collectStrings,
  getAvailableTranslationLanguages,
  getBaseLanguageCode,
  getPrecacheTranslationLanguages,
  normalizeLanguageCode,
  resolveRequestedLanguage,
  restoreProtectedPhrases,
  setAtPath,
  stableSerialize,
  translateTexts,
} from '../translation-cache/translation-cache.service';

const TRANSLATABLE_KEYS = new Set([
  'title',
  'description',
  'message',
  'buttonText',
  'successMessage',
  'mainButtonText',
  'urlButtonText',
  'value',
  'text',
  'roomNumberLabel',
  'reservationCodeLabel',
  'processingLabel',
  'onTheWayLabel',
  'completedLabel',
  'locationLabel',
  'label',
]);

const TRANSLATION_RETRY_COOLDOWN_MS = 6 * 60 * 60 * 1000;

const getSourceLanguage = (payload: any): string =>
  getBaseLanguageCode(payload?.hotel?.settings?.translationSourceLanguage || 'hr') || 'hr';

const getRoomPrecacheLanguages = (payload: any, sourceLanguage: string) =>
  getPrecacheTranslationLanguages(payload?.hotel?.settings?.translationCacheLanguages, sourceLanguage);

const buildTranslationResponse = (
  payload: Record<string, any>,
  sourceLanguage: string,
  contentHash: string,
  translationLanguage: string,
  translationCacheHit: boolean,
  requestedLanguage?: string
) => ({
  ...payload,
  sourceLanguage,
  contentHash,
  translationLanguage,
  translationCacheHit,
  requestedTranslationLanguage: normalizeLanguageCode(requestedLanguage) || translationLanguage,
  availableTranslationLanguages: getAvailableTranslationLanguages(sourceLanguage, getRoomPrecacheLanguages(payload, sourceLanguage)),
});

const getCacheQuery = (
  roomId: mongoose.Types.ObjectId,
  hotelId: mongoose.Types.ObjectId,
  targetLanguage: string,
  contentHash: string
) => ({
  scope: 'room' as const,
  room: roomId,
  hotel: hotelId,
  targetLanguage,
  contentHash,
});

const getReadyRoomCache = async (cacheQuery: Record<string, any>) => {
  const readyCache = (await TranslationCache.findOne({ ...cacheQuery, status: 'ready' })) as ITranslationCacheDoc | null;
  if (readyCache) {
    await TranslationCache.updateOne({ _id: readyCache._id }, { $set: { lastUsedAt: new Date() } });
  }
  return readyCache;
};

const getBestRoomFallback = async (
  payload: Record<string, any>,
  roomId: mongoose.Types.ObjectId,
  hotelId: mongoose.Types.ObjectId,
  sourceLanguage: string,
  contentHash: string,
  requestedLanguage?: string
) => {
  const precacheLanguages = getRoomPrecacheLanguages(payload, sourceLanguage);

  for (const language of precacheLanguages) {
    const readyCache = await getReadyRoomCache(getCacheQuery(roomId, hotelId, language, contentHash));
    if (readyCache) {
      return buildTranslationResponse(
        readyCache.translatedPayload,
        sourceLanguage,
        contentHash,
        language,
        true,
        requestedLanguage
      );
    }
  }

  return buildTranslationResponse(payload, sourceLanguage, contentHash, sourceLanguage, false, requestedLanguage);
};

const translateRoomPayloadAndStore = async (
  payload: Record<string, any>,
  roomId: mongoose.Types.ObjectId,
  hotelId: mongoose.Types.ObjectId,
  targetLanguage: string,
  sourceLanguage: string,
  contentHash: string
) => {
  const cacheQuery = getCacheQuery(roomId, hotelId, targetLanguage, contentHash);
  const translationsMap = collectStrings(payload, TRANSLATABLE_KEYS);
  const texts = translationsMap.map((entry) => entry.value);

  if (texts.length === 0) {
    const finalPayload = buildTranslationResponse(payload, sourceLanguage, contentHash, targetLanguage, false, targetLanguage);

    await TranslationCache.findOneAndUpdate(
      cacheQuery,
      {
        $set: {
          sourceLanguage,
          translatedPayload: finalPayload,
          status: 'ready',
          characterCount: 0,
          error: undefined,
          lastUsedAt: new Date(),
        },
      },
      { new: true }
    );

    return finalPayload;
  }

  const translatedTexts = await translateTexts(texts, targetLanguage, sourceLanguage);
  const translatedPayload = JSON.parse(JSON.stringify(payload));

  translatedTexts.forEach((translatedText, index) => {
    const { path, protectedPhrases } = translationsMap[index]!;
    const restored = restoreProtectedPhrases(translatedText, protectedPhrases);
    setAtPath(translatedPayload, path, restored);
  });

  const finalPayload = buildTranslationResponse(
    translatedPayload,
    sourceLanguage,
    contentHash,
    targetLanguage,
    false,
    targetLanguage
  );

  await TranslationCache.findOneAndUpdate(
    cacheQuery,
    {
      $set: {
        sourceLanguage,
        translatedPayload: finalPayload,
        status: 'ready',
        characterCount: texts.reduce((sum, text) => sum + text.length, 0),
        error: undefined,
        lastUsedAt: new Date(),
      },
    },
    { new: true }
  );

  return finalPayload;
};

const queueRoomTranslation = async (
  payload: Record<string, any>,
  roomId: mongoose.Types.ObjectId,
  hotelId: mongoose.Types.ObjectId,
  targetLanguage: string,
  sourceLanguage: string,
  contentHash: string
) => {
  const cacheQuery = getCacheQuery(roomId, hotelId, targetLanguage, contentHash);
  const now = new Date();
  const retryThreshold = new Date(Date.now() - TRANSLATION_RETRY_COOLDOWN_MS);

  const existing = (await TranslationCache.findOne(cacheQuery).select('_id status updatedAt')) as
    | (ITranslationCacheDoc & { updatedAt?: Date })
    | null;

  if (existing?.status === 'ready' || existing?.status === 'pending') {
    return;
  }

  if (existing?.status === 'failed' && existing.updatedAt && existing.updatedAt > retryThreshold) {
    return;
  }

  if (!existing) {
    try {
      await TranslationCache.create({
        ...cacheQuery,
        sourceLanguage,
        translatedPayload: {},
        status: 'pending',
        characterCount: 0,
        lastUsedAt: now,
      });
    } catch (error: any) {
      if (error?.code !== 11000) {
        throw error;
      }
      return;
    }
  } else {
    const updated = await TranslationCache.updateOne(
      {
        ...cacheQuery,
        status: 'failed',
        updatedAt: { $lte: retryThreshold },
      },
      {
        $set: {
          status: 'pending',
          error: undefined,
          lastUsedAt: now,
        },
      }
    );

    if (!updated.modifiedCount) {
      return;
    }
  }

  void translateRoomPayloadAndStore(payload, roomId, hotelId, targetLanguage, sourceLanguage, contentHash).catch(async (error: any) => {
    await TranslationCache.findOneAndUpdate(
      cacheQuery,
      {
        $set: {
          sourceLanguage,
          status: 'failed',
          error: error?.message || 'Translation failed',
          lastUsedAt: new Date(),
        },
      },
      { new: true }
    );
  });
};

export const getRoomContentHash = (payload: Record<string, any>): string =>
  crypto.createHash('sha256').update(stableSerialize(payload)).digest('hex');

export const attachTranslationMetadata = (payload: Record<string, any>) => {
  const sourceLanguage = getSourceLanguage(payload);
  const contentHash = getRoomContentHash(payload);

  return buildTranslationResponse(payload, sourceLanguage, contentHash, sourceLanguage, false);
};

export const getTranslatedRoomPayload = async (
  payload: Record<string, any>,
  roomId: mongoose.Types.ObjectId,
  hotelId: mongoose.Types.ObjectId,
  requestedLanguage?: string
) => {
  const sourceLanguage = getSourceLanguage(payload);
  const resolvedTarget = resolveRequestedLanguage(requestedLanguage);
  const contentHash = getRoomContentHash(payload);

  if (!requestedLanguage || !resolvedTarget || resolvedTarget === sourceLanguage) {
    return buildTranslationResponse(payload, sourceLanguage, contentHash, sourceLanguage, true, requestedLanguage);
  }

  const readyCache = await getReadyRoomCache(getCacheQuery(roomId, hotelId, resolvedTarget, contentHash));
  if (readyCache) {
    return buildTranslationResponse(
      readyCache.translatedPayload,
      sourceLanguage,
      contentHash,
      resolvedTarget,
      true,
      requestedLanguage
    );
  }

  await queueRoomTranslation(payload, roomId, hotelId, resolvedTarget, sourceLanguage, contentHash);

  return getBestRoomFallback(payload, roomId, hotelId, sourceLanguage, contentHash, requestedLanguage);
};

export const invalidateRoomTranslationCache = async (roomId: mongoose.Types.ObjectId | string) => {
  await TranslationCache.deleteMany({ scope: 'room', room: roomId });
};

export const preloadRoomConfiguredTranslationCache = async (
  payload: Record<string, any>,
  roomId: mongoose.Types.ObjectId,
  hotelId: mongoose.Types.ObjectId
) => {
  const sourceLanguage = getSourceLanguage(payload);
  const precacheLanguages = getRoomPrecacheLanguages(payload, sourceLanguage);

  await Promise.all(
    precacheLanguages.map((language) =>
      queueRoomTranslation(payload, roomId, hotelId, language, sourceLanguage, getRoomContentHash(payload))
    )
  );
};

export const refreshRoomConfiguredTranslationCache = async (
  payload: Record<string, any>,
  roomId: mongoose.Types.ObjectId,
  hotelId: mongoose.Types.ObjectId
) => {
  await invalidateRoomTranslationCache(roomId);
  await preloadRoomConfiguredTranslationCache(payload, roomId, hotelId);
};
