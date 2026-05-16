// Type Imports
import type { Locale } from '@configs/i18n'

// Component Imports
import Providers from '@components/Providers'
import BlankLayout from '@layouts/BlankLayout'
import NotFound from '@views/NotFound'

// Config Imports
import { i18n } from '@configs/i18n'

// Util Imports
import { getSystemMode } from '@core/utils/serverHelpers'

const NotFoundPage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const { lang } = await params
  const locale = lang as Locale

  // Vars
  const direction = i18n.langDirection[locale]

  const systemMode = await getSystemMode()

  return (
    <Providers direction={direction}>
      <BlankLayout systemMode={systemMode}>
        <NotFound />
      </BlankLayout>
    </Providers>
  )
}

export default NotFoundPage
