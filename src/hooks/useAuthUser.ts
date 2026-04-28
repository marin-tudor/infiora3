'use client'
import { useSession } from 'next-auth/react'

export const useAuthUser = () => {
  const { data: session } = useSession()
  const user = { ...session?.user }

  return user
}
