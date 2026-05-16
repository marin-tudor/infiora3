const parseRequiredUrl = (key: 'NEXT_PUBLIC_API_URL'): string => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }

  try {
    new URL(value);
  } catch {
    throw new Error(`[env] ${key} must be a valid absolute URL. Received: ${value}`);
  }

  return value;
};

const parseOptionalCsv = (key: 'IMAGE_PROXY_ALLOWED_HOSTS'): string[] => {
  const value = process.env[key];

  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
};

export const env = {
  NEXT_PUBLIC_API_URL: parseRequiredUrl('NEXT_PUBLIC_API_URL'),
  GOOGLE_TRANSLATE_API_KEY: process.env.GOOGLE_TRANSLATE_API_KEY,
  IMAGE_PROXY_ALLOWED_HOSTS: parseOptionalCsv('IMAGE_PROXY_ALLOWED_HOSTS'),
} as const;

export const publicEnv = {
  apiUrl: env.NEXT_PUBLIC_API_URL,
} as const;
