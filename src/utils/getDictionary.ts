// Third-party Imports
import 'server-only'

// Type Imports
import type { Locale } from '@configs/i18n'

const dictionaries = {
  en: () => import('@/data/dictionaries/en.json').then(module => module.default),
  hr: () => import('@/data/dictionaries/hr.json').then(module => module.default)
}

export const getDictionary = async (locale: Locale) => {
  // Fallback to 'hr' if locale is not defined or invalid
  const dictionaryLoader = dictionaries[locale as keyof typeof dictionaries] || dictionaries['hr']

  return dictionaryLoader()
}
