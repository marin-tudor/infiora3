// Third-party Imports

import { getServerSession } from 'next-auth'

// Type Imports
import type { Locale } from '@configs/i18n'
import type { ChildrenType } from '@core/types'

// Component Imports
import AuthRedirect from '@/components/AuthRedirect'
import LanguageGuard from './LanguageGuard'
import AuthUser from '@/components/AuthUser'
import { authOptions } from '@/libs/auth'

export default async function AuthGuard({ children, locale }: ChildrenType & { locale: Locale }) {
  const session = await getServerSession(authOptions)

  return (
    <>
      {session ? (
        <LanguageGuard locale={locale}>
          <AuthUser locale={locale}>{children}</AuthUser>
        </LanguageGuard>
      ) : (
        <AuthRedirect lang={locale} />
      )}
    </>
  )
}
