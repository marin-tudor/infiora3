'use client'

import { Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material'

import { useAuthUser } from '@/hooks/useAuthUser'
import Loader from '@/components/common/Loader'
import { useGetOrdersQuery } from '@/redux/api/ordersApi'

export default function ScheduledOrdersPage() {
  const authUser = useAuthUser()
  const hotelId = authUser?.hotel?.id

  const { data, isLoading } = useGetOrdersQuery(
    { hotelId: hotelId!, scheduled: true, limit: 100 },
    { skip: !hotelId, pollingInterval: 60_000 }
  )

  if (!authUser) return <Loader center />

  const orders = (data as any)?.results ?? []

  return (
    <Stack gap={3}>
      <Typography variant='h4' fontWeight={700}>Scheduled Orders</Typography>

      {isLoading ? (
        <Box textAlign='center' py={6}>
          <CircularProgress />
        </Box>
      ) : orders.length === 0 ? (
        <Box textAlign='center' py={8}>
          <Typography fontSize={36} mb={1}>🕐</Typography>
          <Typography color='text.secondary'>No scheduled orders</Typography>
        </Box>
      ) : (
        <Stack gap={1.5}>
          {orders.map((order: any) => (
            <Card key={order.id ?? order._id} variant='outlined'>
              <CardContent>
                <Stack direction='row' alignItems='flex-start' justifyContent='space-between' gap={2}>
                  <Stack gap={0.5}>
                    <Typography variant='subtitle1' fontWeight={700} color='primary.main'>
                      #{order.orderId}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Room {order.guestRoomNumber || order.roomNumber || 'N/A'}
                    </Typography>
                    {order.items?.length > 0 && (
                      <Typography variant='body2'>
                        {order.items.map((i: any) => `${i.name} ×${i.qty}`).join(', ')}
                      </Typography>
                    )}
                  </Stack>
                  <Stack alignItems='flex-end' gap={0.5} flexShrink={0}>
                    <Typography variant='body2' fontWeight={600} color='warning.main'>
                      Scheduled for
                    </Typography>
                    <Typography variant='body2'>
                      {new Date(order.scheduledFor).toLocaleString([], {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      Status: {order.status}
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
