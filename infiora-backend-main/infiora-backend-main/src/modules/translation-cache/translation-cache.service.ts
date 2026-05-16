import axios from 'axios';

const HASH_OMIT_KEYS = new Set(['createdAt', 'updatedAt', '__v', 'lastUsedAt', 'activityId']);
const MAX_TEXTS_PER_REQUEST = 20;
const MAX_CHARS_PER_REQUEST = 4_500;

export const DEFAULT_TRANSLATION_PRECACHE_LANGUAGES = ['en'];
const LEGACY_TRANSLATION_PRECACHE_LANGUAGES = ['en', 'de', 'it'];

export const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const normalizeLanguageCode = (value?: string | null): string =>
  String(value ?? '')
    .trim()
    .replace(/_/g, '-')
    .toLowerCase();

export const getBaseLanguageCode = (value?: string | null): string => {
  const normalized = normalizeLanguageCode(value);
  return normalized.split('-')[0] || normalized;
};

export const decodeHtmlEntities = (text: string): string =>
  text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

export const stableSerialize = (value: any): string => {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([key]) => !HASH_OMIT_KEYS.has(key))
      .sort(([a], [b]) => a.localeCompare(b));

    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`).join(',')}}`;
  }

  return JSON.stringify(value);
};

export const protectPhrases = (value: string) => {
  const protectedPhrases: string[] = [];
  const processedValue = value.replace(/\*(.*?)\*/g, (_, phrase) => {
    const placeholder = `[[${protectedPhrases.length}]]`;
    protectedPhrases.push(phrase);
    return placeholder;
  });

  return { processedValue, protectedPhrases };
};

export const restoreProtectedPhrases = (value: string, protectedPhrases: string[]) => {
  let restored = value;

  protectedPhrases.forEach((original, index) => {
    const placeholderRegex = new RegExp(`\\[\\[\\s*${index}\\s*\\]\\]`, 'g');
    restored = restored.replace(placeholderRegex, original);
  });

  return restored;
};

export const collectStrings = (
  value: any,
  translatableKeys: Set<string>,
  path: Array<string | number> = [],
  result: { path: Array<string | number>; value: string; protectedPhrases: string[] }[] = []
) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStrings(item, translatableKeys, [...path, index], result));
    return result;
  }

  if (!value || typeof value !== 'object') {
    return result;
  }

  Object.entries(value).forEach(([key, entry]) => {
    const nextPath = [...path, key];

    if (typeof entry === 'string' && entry.trim() !== '' && translatableKeys.has(key)) {
      const { processedValue, protectedPhrases } = protectPhrases(entry);
      result.push({ path: nextPath, value: processedValue, protectedPhrases });
      return;
    }

    if (entry && typeof entry === 'object') {
      collectStrings(entry, translatableKeys, nextPath, result);
    }
  });

  return result;
};

export const setAtPath = (target: any, path: Array<string | number>, value: string) => {
  let current = target;

  for (let index = 0; index < path.length - 1; index += 1) {
    current = current[path[index] as keyof typeof current];
  }

  current[path[path.length - 1] as keyof typeof current] = value;
};

const chunkTexts = (texts: string[]) => {
  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentChars = 0;

  texts.forEach((text) => {
    const nextChars = currentChars + text.length;

    if (
      currentChunk.length > 0 &&
      (currentChunk.length >= MAX_TEXTS_PER_REQUEST || nextChars > MAX_CHARS_PER_REQUEST)
    ) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentChars = 0;
    }

    currentChunk.push(text);
    currentChars += text.length;
  });

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
};

export const translateTexts = async (
  texts: string[],
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string[]> => {
  const apiKey = process.env['GOOGLE_TRANSLATE_API_KEY'];

  if (!apiKey) {
    throw new Error('GOOGLE_TRANSLATE_API_KEY is not configured on the backend');
  }

  const translated: string[] = [];
  const chunks = chunkTexts(texts);

  for (const chunk of chunks) {
    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        q: chunk,
        ...(sourceLanguage && sourceLanguage !== targetLanguage ? { source: sourceLanguage } : {}),
        target: targetLanguage,
        format: 'text',
      },
      {
        timeout: 15_000,
      }
    );

    const items = response.data?.data?.translations;
    if (!Array.isArray(items) || items.length !== chunk.length) {
      throw new Error('Unexpected Google Translate response');
    }

    translated.push(...items.map((item: { translatedText: string }) => decodeHtmlEntities(item.translatedText)));
  }

  return translated;
};

export const getPrecacheTranslationLanguages = (
  rawLanguages: unknown,
  sourceLanguage?: string,
  fallbackLanguages: string[] = DEFAULT_TRANSLATION_PRECACHE_LANGUAGES
) => {
  const normalizedSource = getBaseLanguageCode(sourceLanguage);
  const normalizedConfigured = Array.isArray(rawLanguages)
    ? rawLanguages
        .map((value) => getBaseLanguageCode(typeof value === 'string' ? value : ''))
        .filter(Boolean)
    : [];

  const configured =
    normalizedConfigured.length > 0 &&
    normalizedConfigured.length === LEGACY_TRANSLATION_PRECACHE_LANGUAGES.length &&
    normalizedConfigured.every((value, index) => value === LEGACY_TRANSLATION_PRECACHE_LANGUAGES[index])
      ? DEFAULT_TRANSLATION_PRECACHE_LANGUAGES
      : normalizedConfigured.length > 0
        ? normalizedConfigured
        : fallbackLanguages;

  return Array.from(
    new Set(
      configured
        .filter((value) => Boolean(value) && value !== normalizedSource)
    )
  ).slice(0, 6);
};

export const getAvailableTranslationLanguages = (sourceLanguage: string, precacheLanguages: string[]) =>
  Array.from(new Set([getBaseLanguageCode(sourceLanguage), ...precacheLanguages].filter(Boolean)));

export const resolveRequestedLanguage = (requestedLanguage?: string) => {
  const normalizedTarget = normalizeLanguageCode(requestedLanguage);
  if (!normalizedTarget) {
    return null;
  }

  return getBaseLanguageCode(normalizedTarget);
};
