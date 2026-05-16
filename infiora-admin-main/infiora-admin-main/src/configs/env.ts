const parseRequiredUrl = (key: 'NEXT_PUBLIC_API_URL'): string => {
  const value = process.env[key];

  if (!value) {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }

    throw new Error(`[env] Missing required environment variable: ${key}`);
  }

  try {
    new URL(value);
  } catch {
    throw new Error(`[env] ${key} must be a valid absolute URL. Received: ${value}`);
  }

  return value;
};

export const env = {
  NEXT_PUBLIC_API_URL: parseRequiredUrl('NEXT_PUBLIC_API_URL'),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
} as const;
