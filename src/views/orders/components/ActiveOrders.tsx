'use client'

import { useEffect, useRef, useState } from 'react'

import { Box, Button, CircularProgress, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { endOfToday, formatISO, isSameDay, parseISO, startOfToday } from 'date-fns'
import { toast } from 'react-toastify'

import RangePicker from '@/components/common/RangePicker'
import type { IGuestOrder } from '@/types'
import { useGetOrdersQuery } from '@/redux/api/ordersApi'
import { playNotificationSound } from '@/utils/soundUtils'

import OrderCard from './OrderCard'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'Awaiting confirmation', label: 'Awaiting' },
  { value: 'Processing', label: 'Processing' },
  { value: 'On the way', label: 'On the way' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
]

function exportToCSV(orders: IGuestOrder[], currency: string) {
  const headers = ['Order ID', 'Date', 'Room', 'Guest Room', 'Status', 'Items', 'Total', 'Payment', 'Note']

  const rows = orders.map(o => [
    o.orderId,
    new Date((o as any).createdAt).toLocaleString(),
    o.roomNumber || '',
    (o as any).guestRoomNumber || '',
    o.status,
    o.items.map((i: any) => `${i.name} x${i.qty}`).join('; '),
    `${o.total?.toFixed(2)} ${currency}`,
    (o as any).payment || '',
    (o as any).note || '',
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')

  a.href = url
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ActiveOrders({ hotelId, currency }: { hotelId: string; currency?: string }) {
  const [statusFilter, setStatusFilter] = useState('')
  const [range, setRange] = useState<{ startDate?: string; endDate?: string }>({})
  const prevAwaitingIds = useRef<Set<string>>(new Set())
  const isFirstLoad = useRef(true)

  const startDate = range.startDate || formatISO(startOfToday())
  const endDate = range.endDate || formatISO(endOfToday())
  const isToday = !range.startDate || isSameDay(parseISO(range.startDate), new Date())
  const todayStart = startOfToday()

  const { data, isLoading } = useGetOrdersQuery(
    { hotelId, status: statusFilter || undefined, limit: 100, startDate, endDate },
    {}
  )

  const { data: carryData } = useGetOrdersQuery(
    { hotelId, limit: 50 },
    { skip: !isToday || !!statusFilter }
  )

  const mainOrders: IGuestOrder[] = data?.results || []

  const carryOrders: IGuestOrder[] =
    isToday && !statusFilter
      ? (carryData?.results || []).filter(
          (o: IGuestOrder) =>
            new Date((o as any).createdAt) < todayStart &&
            !['Completed', 'Cancelled'].includes(o.status)
        )
      : []

  const allOrders = [
    ...mainOrders,
    ...carryOrders.filter(o => !mainOrders.find(m => m.id === o.id)),
  ].sort((a, b) => new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime())

  useEffect(() => {
    if (isLoading) return

    const awaitingOrders = allOrders.filter(o => o.status === 'Awaiting confirmation')
    const currentIds = new Set<string>(awaitingOrders.map(o => o.id))

    if (isFirstLoad.current) {
      isFirstLoad.current = false
      prevAwaitingIds.current = currentIds

      return
    }

    const newOrders = awaitingOrders.filter(o => !prevAwaitingIds.current.has(o.id))

    if (newOrders.length > 0) {
      playNotificationSound()
      newOrders.forEach(o => {
        const orderTotal =
          o.items?.reduce((sum: number, item: any) => sum + item.price * item.qty, 0) || 0

        toast.warning(
          `New order! Infiora ${o.roomNumber || 'N/A'} · Guest ${(o as any).guestRoomNumber || 'Not provided'} · ${o.items?.length} item(s) · ${orderTotal.toFixed(2)} ${currency || 'EUR'}`,
          { autoClose: 8000 }
        )
      })
    }

    prevAwaitingIds.current = currentIds
  }, [allOrders, currency, isLoading])

  return (
    <Stack gap={2}>
      <Stack direction='row' alignItems='center' justifyContent='space-between' flexWrap='wrap' gap={2}>
        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={(_, v) => v !== null && setStatusFilter(v)}
          size='small'
        >
          {STATUS_FILTERS.map(f => (
            <ToggleButton key={f.value} value={f.value}>
              {f.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Stack direction='row' gap={1} alignItems='center'>
          {isLoading && <CircularProgress size={18} />}
          <Button
            size='small'
            variant='outlined'
            startIcon={<i className='ri-file-excel-2-line' />}
            onClick={() => exportToCSV(allOrders, currency || 'EUR')}
            disabled={allOrders.length === 0}
          >
            Export
          </Button>
          <RangePicker range={range} setRange={setRange} />
        </Stack>
      </Stack>

      {isLoading ? (
        <Box textAlign='center' py={6}>
          <CircularProgress />
        </Box>
      ) : allOrders.length === 0 ? (
        <Box textAlign='center' py={8}>
          <Typography fontSize={40} mb={1}>Order list</Typography>
          <Typography color='text.secondary'>No orders found</Typography>
        </Box>
      ) : (
        <Stack gap={1.5}>
          {carryOrders.length > 0 && (
            <Typography variant='caption' color='warning.main' fontWeight={600}>
              {carryOrders.length} unfinished order{carryOrders.length > 1 ? 's' : ''} carried over from previous days
            </Typography>
          )}
          {allOrders.map(order => (
            <OrderCard key={order.id} order={order} currency={currency} />
          ))}
        </Stack>
      )}
    </Stack>
  )
}
