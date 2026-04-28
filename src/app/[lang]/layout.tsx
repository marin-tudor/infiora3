// Next Imports
import { headers } from 'next/headers'

// Third-party Imports
import 'react-perfect-scrollbar/dist/css/styles.css'
import 'leaflet/dist/leaflet.css'

// Type Imports
import type { ChildrenType } from '@core/types'
import type { Locale } from '@configs/i18n'

// Component Imports

// HOC Imports
import TranslationWrapper from '@/hocs/TranslationWrapper'

// Config Imports
import { i18n } from '@configs/i18n'

// Style Imports
import '@/app/globals.css'

// Generated Icon CSS Imports
import '@assets/iconify-icons/generated-icons.css'
import DictionaryWrapper from '@/hocs/DictionaryWrapper'

export const metadata = {
  title: 'Infiora',
  description: 'Infiora'
}

const RootLayout = ({ children, params }: ChildrenType & { params: { lang: Locale } }) => {
  // Vars
  const headersList = headers()
  const direction = i18n.langDirection[params.lang]

  return (
    <TranslationWrapper headersList={headersList} lang={params.lang}>
      <DictionaryWrapper lang={params.lang}>
        <html id='__next' lang={params.lang} dir={direction}>
          <body className='flex is-full min-bs-full flex-auto flex-col'>{children}</body>
        </html>
      </DictionaryWrapper>
    </TranslationWrapper>
  )
}

export default RootLayout
