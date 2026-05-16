'use client'

import { useEffect, useState } from 'react'

import { Card, CardContent, Stack, Typography, Chip, Divider } from '@mui/material'
import axios from 'axios'

export default function UpcomingScheduledOrders({ hotelId }: { hotelId: string }) {
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    const fetch = () =>
      axios
        .get(`/api/v1/orders/hotels/${hotelId}`, { params: { scheduled: true } })
        .then(r => {
          const all = r.data.results ?? r.data

          const sorted = [...all].sort(
            (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
          )

          setOrders(sorted.slice(0, 5))
        })
        .catch(() => {})

    fetch()
    const interval = setInterval(fetch, 60_000)

    return () => clearInterval(interval)
  }, [hotelId])

  if (orders.length === 0) return null

  return (
    <Card>
      <CardContent>
        <Stack direction='row' alignItems='center' justifyContent='space-between' mb={1.5}>
          <Typography variant='h6' fontWeight={600}>
            <i className='ri-time-line' style={{ marginRight: 6 }} />
            Upcoming Scheduled Orders
          </Typography>
          <Chip label={orders.length} size='small' color='warning' />
        </Stack>
        <Stack divider={<Divider />} gap={1}>
          {orders.map(order => {
            const scheduled = new Date(order.scheduledFor)
            const isToday = scheduled.toDateString() === new Date().toDateString()

            return (
              <Stack key={order._id} direction='row' justifyContent='space-between' alignItems='center' py={0.5}>
                <Stack gap={0.25}>
                  <Typography variant='body2' fontWeight={600}>
                    Room {order.guestRoomNumber}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {order.items?.map((i: any) => i.name).join(', ')}
                  </Typography>
                </Stack>
                <Typography variant='body2' fontWeight={600} color={isToday ? 'warning.main' : 'text.secondary'}>
                  {isToday ? 'Today ' : scheduled.toLocaleDateString()}{' '}
                  {scheduled.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Stack>
            )
          })}
        </Stack>
      </CardContent>
    </Card>
  )
}
