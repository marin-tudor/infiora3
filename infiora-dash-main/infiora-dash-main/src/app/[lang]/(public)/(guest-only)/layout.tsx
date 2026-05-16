// Type Imports
import type { ChildrenType } from '@core/types'
import type { Locale } from '@configs/i18n'

// HOC Imports
import GuestOnlyRoute from '@/hocs/GuestOnlyRoute'

const Layout = async ({ children, params }: ChildrenType & { params: Promise<{ lang: string }> }) => {
  const { lang } = await params

  return <GuestOnlyRoute lang={lang as Locale}>{children}</GuestOnlyRoute>
}

export default Layout
