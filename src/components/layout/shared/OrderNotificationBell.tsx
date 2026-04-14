'use client'
import { useRouter } from 'next/navigation'
import { Badge, IconButton, Tooltip } from '@mui/material'

import { useGetOrdersQuery } from '@/redux/api/ordersApi'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useOrdersSSE } from '@/hooks/useOrdersSSE'

export default function OrderNotificationBell() {
  const router = useRouter()
  const authUser = useAuthUser()
  const hotelId = (authUser as any)?.hotel?.id

  // SSE: real-time invalidation + sound + toast (replaces polling)
  useOrdersSSE(hotelId)

  const { data } = useGetOrdersQuery(
    { hotelId: hotelId!, status: 'Awaiting confirmation', limit: 50 },
    { skip: !hotelId }
  )

  const pendingCount = (data?.results?.length) || 0

  if (!hotelId) return null

  return (
    <Tooltip title={pendingCount > 0 ? `${pendingCount} order${pendingCount > 1 ? 's' : ''} waiting` : 'No pending orders'}>
      <IconButton onClick={() => router.push('/en/orders')} color={pendingCount > 0 ? 'warning' : 'default'}>
        <Badge badgeContent={pendingCount || undefined} color='warning'>
          <i className={pendingCount > 0 ? 'ri-notification-3-fill' : 'ri-notification-3-line'} style={{ fontSize: 22 }} />
        </Badge>
      </IconButton>
    </Tooltip>
  )
}
