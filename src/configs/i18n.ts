export const i18n = {
  defaultLocale: 'hr',
  locales: ['en', 'hr'],
  langDirection: {
    en: 'ltr',
    hr: 'ltr'
  }
} as const

export type Locale = (typeof i18n)['locales'][number]
