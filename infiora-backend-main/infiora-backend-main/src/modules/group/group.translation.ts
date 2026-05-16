import crypto from 'crypto';
import mongoose from 'mongoose';
import Group from './group.model';
import TranslationCache from '../translation-cache/translation-cache.model';
import { ITranslationCacheDoc } from '../translation-cache/translation-cache.interfaces';
import { Link } from '../link';
import { reorderItems } from '../utils/arrayUtils';
import { removeNullFields } from '../utils/miscUtils';
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
const serializeLinks = (links: any[]) => links.map((link) => (typeof link?.toJSON === 'function' ? link.toJSON() : link));
const isAllowedGuestImage = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' && !value.startsWith('data:');

const sanitizeLinkForGuestPayload = (link: Record<string, any>) => ({
  ...link,
  image: isAllowedGuestImage(link['image']) ? link['image'] : '',
  sections: Array.isArray(link['sections'])
    ? link['sections'].map((section: Record<string, any>) => ({
        ...section,
        mapImage: isAllowedGuestImage(section['mapImage']) ? section['mapImage'] : '',
        images: Array.isArray(section['images']) ? section['images'].filter(isAllowedGuestImage) : [],
      }))
    : [],
});

const getSourceLanguage = (payload: any): string =>
  getBaseLanguageCode(payload?.hotel?.settings?.translationSourceLanguage || 'hr') || 'hr';

const getGroupPrecacheLanguages = (payload: any, sourceLanguage: string) =>
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
  availableTranslationLanguages: getAvailableTranslationLanguages(sourceLanguage, getGroupPrecacheLanguages(payload, sourceLanguage)),
});

const getCacheQuery = (
  groupId: mongoose.Types.ObjectId,
  hotelId: mongoose.Types.ObjectId,
  targetLanguage: string,
  contentHash: string
) => ({
  scope: 'group' as const,
  group: groupId,
  hotel: hotelId,
  targetLanguage,
  contentHash,
});

const getReadyGroupCache = async (cacheQuery: Record<string, any>) => {
  const readyCache = (await TranslationCache.findOne({ ...cacheQuery, status: 'ready' })) as ITranslationCacheDoc | null;
  if (readyCache) {
    await TranslationCache.updateOne({ _id: readyCache._id }, { $set: { lastUsedAt: new Date() } });
  }
  return readyCache;
};

const getBestGroupFallback = async (
  canonicalPayload: Record<string, any>,
  groupId: mongoose.Types.ObjectId,
  hotelId: mongoose.Types.ObjectId,
  sourceLanguage: string,
  contentHash: string,
  requestedLanguage?: string
) => {
  const precacheLanguages = getGroupPrecacheLanguages(canonicalPayload, sourceLanguage);

  for (const language of precacheLanguages) {
    const readyCache = await getReadyGroupCache(getCacheQuery(groupId, hotelId, language, contentHash));
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

  return buildTranslationResponse(canonicalPayload, sourceLanguage, contentHash, sourceLanguage, false, requestedLanguage);
};

export const buildGroupGuestPayload = async (groupId: mongoose.Types.ObjectId | string) => {
  const group = await Group.findById(groupId).populate('hotel');
  if (!group) {
    return null;
  }

  const links = await Link.find({ group: group._id, isActive: true });
  const json: any = group.toJSON();

  return {
    ...removeNullFields(json),
    hotel: json.hotel,
    id: json.id,
    links: reorderItems(
      serializeLinks(links).map(sanitizeLinkForGuestPayload) as Array<{ position?: number; group?: string }>
    ),
  };
};

export const getGroupContentHash = (payload: Record<string, any>): string =>
  crypto.createHash('sha256').update(stableSerialize(payload)).digest('hex');

export const attachGroupTranslationMetadata = (payload: Record<string, any>) => {
  const sourceLanguage = getSourceLanguage(payload);

  return buildTranslationResponse(payload, sourceLanguage, getGroupContentHash(payload), sourceLanguage, false);
};

const translateGroupPayloadAndStore = async (
  canonicalPayload: Record<string, any>,
  groupId: mongoose.Types.ObjectId,
  hotelId: mongoose.Types.ObjectId,
  targetLanguage: string,
  sourceLanguage: string,
  contentHash: string
) => {
  const cacheQuery = getCacheQuery(groupId, hotelId, targetLanguage, contentHash);
  const translationsMap = collectStrings(canonicalPayload, TRANSLATABLE_KEYS);
  const texts = translationsMap.map((entry) => entry.value);

  if (texts.length === 0) {
    const finalPayload = buildTranslationResponse(
      canonicalPayload,
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
  const translatedPayload = JSON.parse(JSON.stringify(canonicalPayload));

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

const queueGroupTranslation = async (
  canonicalPayload: Record<string, any>,
  groupId: mongoose.Types.ObjectId,
  hotelId: mongoose.Types.ObjectId,
  targetLanguage: string,
  sourceLanguage: string,
  contentHash: string
) => {
  const cacheQuery = getCacheQuery(groupId, hotelId, targetLanguage, contentHash);
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

  void translateGroupPayloadAndStore(canonicalPayload, groupId, hotelId, targetLanguage, sourceLanguage, contentHash).catch(
    async (error: any) => {
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
    }
  );
};

export const getTranslatedGroupPayload = async (
  groupId: mongoose.Types.ObjectId,
  hotelId: mongoose.Types.ObjectId,
  requestedLanguage?: string
) => {
  const canonicalPayload = await buildGroupGuestPayload(groupId);
  if (!canonicalPayload) {
    return null;
  }

  const sourceLanguage = getSourceLanguage(canonicalPayload);
  const resolvedTarget = resolveRequestedLanguage(requestedLanguage);
  const contentHash = getGroupContentHash(canonicalPayload);

  if (!requestedLanguage || !resolvedTarget || resolvedTarget === sourceLanguage) {
    return buildTranslationResponse(canonicalPayload, sourceLanguage, contentHash, sourceLanguage, true, requestedLanguage);
  }

  const readyCache = await getReadyGroupCache(getCacheQuery(groupId, hotelId, resolvedTarget, contentHash));
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

  await queueGroupTranslation(canonicalPayload, groupId, hotelId, resolvedTarget, sourceLanguage, contentHash);

  return getBestGroupFallback(canonicalPayload, groupId, hotelId, sourceLanguage, contentHash, requestedLanguage);
};

export const invalidateGroupTranslationCache = async (groupId: mongoose.Types.ObjectId | string) => {
  await TranslationCache.deleteMany({ scope: 'group', group: groupId });
};

export const preloadGroupConfiguredTranslationCache = async (
  groupId: mongoose.Types.ObjectId,
  hotelId: mongoose.Types.ObjectId
) => {
  const canonicalPayload = await buildGroupGuestPayload(groupId);
  if (!canonicalPayload) {
    return;
  }

  const sourceLanguage = getSourceLanguage(canonicalPayload);
  const precacheLanguages = getGroupPrecacheLanguages(canonicalPayload, sourceLanguage);
  const contentHash = getGroupContentHash(canonicalPayload);

  await Promise.all(
    precacheLanguages.map((language) =>
      queueGroupTranslation(canonicalPayload, groupId, hotelId, language, sourceLanguage, contentHash)
    )
  );
};

export const refreshGroupConfiguredTranslationCache = async (
  groupId: mongoose.Types.ObjectId,
  hotelId: mongoose.Types.ObjectId
) => {
  await invalidateGroupTranslationCache(groupId);
  await preloadGroupConfiguredTranslationCache(groupId, hotelId);
};
