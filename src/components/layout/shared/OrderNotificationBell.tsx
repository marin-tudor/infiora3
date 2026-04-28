'use client'

import { useEffect, useRef } from 'react'

import { useParams, useRouter } from 'next/navigation'

import { Badge, IconButton, Tooltip } from '@mui/material'

import type { Locale } from '@configs/i18n'
import { getLocalizedUrl } from '@/utils/i18n'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useGetHotelQuery } from '@/redux/api/hotelApi'
import { useOrdersSSE } from '@/hooks/useOrdersSSE'
import { useUnfinishedOrdersCount } from '@/hooks/useUnfinishedOrdersCount'
import { installNotificationSoundUnlock, playNotificationSound } from '@/utils/soundUtils'

export default function OrderNotificationBell() {
  const router = useRouter()
  const { lang: locale } = useParams()
  const authUser = useAuthUser()
  const hotelId = (authUser as any)?.hotel?.id
  const { data: liveHotel } = useGetHotelQuery(hotelId!, { skip: !hotelId })
  const isFeatureLocked = ((liveHotel as any) ?? (authUser as any)?.hotel)?.features?.ordersEnabled === false

  // SSE: real-time invalidation + sound + toast (replaces polling)
  useOrdersSSE(isFeatureLocked ? undefined : hotelId)

  const { count: pendingCount } = useUnfinishedOrdersCount(hotelId, { skip: isFeatureLocked })
  const previousCountRef = useRef<number | null>(null)

  useEffect(() => {
    installNotificationSoundUnlock()
  }, [])

  useEffect(() => {
    if (previousCountRef.current !== null && pendingCount > previousCountRef.current) {
      playNotificationSound()
    }

    previousCountRef.current = pendingCount
  }, [pendingCount])

  if (!hotelId || isFeatureLocked) return null

  return (
    <Tooltip title={pendingCount > 0 ? `${pendingCount} unfinished order${pendingCount > 1 ? 's' : ''}` : 'No unfinished orders'}>
      <IconButton onClick={() => router.push(getLocalizedUrl('/orders', locale as Locale))} color={pendingCount > 0 ? 'warning' : 'default'}>
        <Badge badgeContent={pendingCount || undefined} color='warning'>
          <i className={pendingCount > 0 ? 'ri-notification-3-fill' : 'ri-notification-3-line'} style={{ fontSize: 22 }} />
        </Badge>
      </IconButton>
    </Tooltip>
  )
}
