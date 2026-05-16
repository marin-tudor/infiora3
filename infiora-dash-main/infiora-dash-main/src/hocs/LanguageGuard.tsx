'use client'
import { useEffect } from 'react'

import { usePathname, useRouter } from 'next/navigation'

import { useSession } from 'next-auth/react'

import type { Locale } from '@/configs/i18n'
import type { ChildrenType } from '@/@core/types'

export default function LanguageGuard({ children, locale }: ChildrenType & { locale: Locale }) {
  const { data: session } = useSession()
  const pathName = usePathname()
  const router = useRouter()

  const getLocalePath = (pathName: string, locale: string) => {
    if (!pathName) return '/'
    const segments = pathName.split('/')

    segments[1] = locale

    return segments.join('/')
  }

  useEffect(() => {
    if (session?.user) {
      const language = session?.user?.language || 'hr'

      if (language !== locale) {
        router.replace(getLocalePath(pathName, language))
      }
    }
  }, [session, locale, pathName, router])

  return <>{children}</>
}
