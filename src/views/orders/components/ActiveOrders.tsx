'use client'

import { useState } from 'react'

import { Box, Button, CircularProgress, FormControl, InputLabel, MenuItem, Select, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { endOfToday, formatISO, isSameDay, parseISO, startOfToday } from 'date-fns'

import RangePicker from '@/components/common/RangePicker'
import type { IGuestOrder } from '@/types'
import { useGetOrdersQuery } from '@/redux/api/ordersApi'
import { useGetNotificationGroupsQuery } from '@/redux/api/staffApi'
import { useOrdersSSE } from '@/hooks/useOrdersSSE'
import { useDictionary } from '@/contexts/DictionaryContext'

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
  const dictionary: any = useDictionary()
  const t = dictionary.pages?.activeOrders || {}
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [range, setRange] = useState<{ startDate?: string; endDate?: string }>({})

  const escalatedIds = useOrdersSSE(hotelId)
  const { data: groupsData } = useGetNotificationGroupsQuery(hotelId)

  const startDate = range.startDate || formatISO(startOfToday())
  const endDate = range.endDate || formatISO(endOfToday())
  const isToday = !range.startDate || isSameDay(parseISO(range.startDate), new Date())
  const todayStart = startOfToday()

  const { data, isLoading } = useGetOrdersQuery(
    { hotelId, status: statusFilter || undefined, limit: 100, startDate, endDate, groupId: selectedGroupId || undefined },
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

  const groups: { id: string; name: string }[] = (groupsData as any) ?? []

  return (
    <Stack gap={2}>
      <Stack direction='row' alignItems='center' justifyContent='space-between' flexWrap='wrap' gap={2}>
        <Stack direction='row' alignItems='center' gap={2} flexWrap='wrap'>
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

          {groups.length > 0 && (
            <FormControl size='small' sx={{ minWidth: 160 }}>
              <InputLabel>Group</InputLabel>
              <Select
                value={selectedGroupId}
                label='Group'
                onChange={e => setSelectedGroupId(e.target.value)}
              >
                <MenuItem value=''>All groups</MenuItem>
                {groups.map(g => (
                  <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>

        <Stack direction='row' gap={1} alignItems='center'>
          {isLoading && <CircularProgress size={18} />}
          <Button
            size='small'
            variant='outlined'
            startIcon={<i className='ri-file-excel-2-line' />}
            onClick={() => exportToCSV(allOrders, currency || 'EUR')}
            disabled={allOrders.length === 0}
          >
            {dictionary.export}
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
          <Typography fontSize={40} mb={1}>{t.orderList || 'Order list'}</Typography>
          <Typography color='text.secondary'>{t.noOrdersFound || 'No orders found'}</Typography>
        </Box>
      ) : (
        <Stack gap={1.5}>
          {carryOrders.length > 0 && (
            <Typography variant='caption' color='warning.main' fontWeight={600}>
              {carryOrders.length} {t.unfinishedCarryPrefix || 'unfinished order'}{carryOrders.length > 1 ? t.unfinishedCarryPlural || 's' : ''} {t.unfinishedCarrySuffix || 'carried over from previous days'}
            </Typography>
          )}
          {allOrders.map(order => (
            <OrderCard key={order.id} order={order} currency={currency} escalated={escalatedIds.has(order.id)} />
          ))}
        </Stack>
      )}
    </Stack>
  )
}
