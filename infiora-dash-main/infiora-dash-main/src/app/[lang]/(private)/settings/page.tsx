'use client'
import { useSession } from 'next-auth/react'

import Loader from '@/components/common/Loader'
import Settings from '@/views/settings/Settings'

const SettingsPage = () => {
  const { data: session } = useSession()

  if (!session?.user) {
    return <Loader center />
  }

  return <Settings authUser={session.user} />
}

export default SettingsPage
