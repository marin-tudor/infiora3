// Type Imports
import type { Locale } from '@configs/i18n'
import type { ChildrenType } from '@core/types'

// Config Imports
import { getDictionary } from '@/utils/getDictionary'
import { DictionaryProvider } from '@/contexts/DictionaryContext'

const DictionaryWrapper = async (params: { lang: Locale } & ChildrenType) => {
  const dictionary = await getDictionary(params.lang)

  return <DictionaryProvider dictionary={dictionary}>{params.children}</DictionaryProvider>
}

export default DictionaryWrapper
