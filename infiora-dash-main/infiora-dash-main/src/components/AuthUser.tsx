'use client'
import { useEffect } from 'react'

import { useRouter } from 'next/navigation'

import { useSession } from 'next-auth/react'

import type { Locale } from '@/configs/i18n'
import type { ChildrenType } from '@/@core/types'

export default function AuthUser({ children, locale }: ChildrenType & { locale: Locale }) {
  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.user && (!session?.user.hotel || (session?.user.hotel && !session.user.hotel?.isActive))) {
      router.replace(`/${locale}/home`)
    }
  }, [locale, session, router])

  return <>{children}</>
}
