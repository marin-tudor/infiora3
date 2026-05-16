'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

import Alert from '@mui/material/Alert'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import FeatureLocked from '@/components/common/FeatureLocked'
import { useAuthUser } from '@/hooks/useAuthUser'
import BlackoutDatesPanel from '@/views/bookings/components/BlackoutDatesPanel'
import ItemAvailabilityCalendar from '@/views/bookings/components/ItemAvailabilityCalendar'
import ResourceCalendar from '@/views/bookings/components/ResourceCalendar'
import ResourcesTab from '@/views/bookings/components/ResourcesTab'
import { useGetHotelQuery } from '@/redux/api/hotelApi'
import { useGetCatalogItemsQuery } from '@/redux/api/ordersApi'
import {
  useGetBookingsQuery,
  useGetTimeSlotsQuery,
  useUpdateBookingMutation,
  useCancelBookingMutation,
  useBlockSlotMutation,
  useUnblockSlotMutation,
  useGenerateSlotsMutation,
  type IBooking,
  type ITimeSlot
} from '@/redux/api/bookingApi'

const STATUS_COLORS: Record<string, any> = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'error',
  completed: 'default',
  no_show: 'error'
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending approval',
  confirmed: 'Approved',
  cancelled: 'Cancelled',
  completed: 'Completed',
  no_show: 'No show'
}

const itemName = (item: any) => (typeof item === 'string' ? item : (item?.name ?? '—'))

const toDateInput = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const addDays = (dateInput: string, days: number) => {
  const date = new Date(`${dateInput}T00:00:00`)

  date.setDate(date.getDate() + days)

  return toDateInput(date)
}

const formatBookingDateHeading = (dateInput: string) =>
  new Date(`${dateInput}T00:00:00`).toLocaleDateString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

const formatBookingTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })

const formatBookingDateTime = (iso: string) => new Date(iso).toLocaleString()

export default function BookingsPage() {
  const authUser = useAuthUser()
  const hotelId = (authUser as any)?.hotel?.id
  const { data: liveHotel } = useGetHotelQuery(hotelId!, { skip: !hotelId })
  const hotelFeatures = ((liveHotel as any) ?? (authUser as any)?.hotel)?.features
  const isFeatureLocked = hotelFeatures?.bookableServicesEnabled === false

  const [view, setView] = useState<'list' | 'calendar' | 'resources'>('list')
  const [selectedDate, setSelectedDate] = useState(() => toDateInput(new Date()))
  const [statusFilter, setStatusFilter] = useState('')
  const [escalatedIds, setEscalatedIds] = useState<Set<string>>(new Set())
  const [resourceView, setResourceView] = useState(false)
  const [blackoutDates, setBlackoutDates] = useState<Set<string>>(new Set())
  const [showBlackoutPanel, setShowBlackoutPanel] = useState(false)
  const [calendarItemId, setCalendarItemId] = useState('')

  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date()
    const day = d.getDay()

    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))

    return toDateInput(d)
  })

  const upcomingTo = addDays(selectedDate, 6)
  const recentActivityFrom = addDays(selectedDate, -6)
  const recentActivityTo = addDays(selectedDate, 1)
  const upcomingQueryTo = addDays(upcomingTo, 1)

  const shiftWeek = (n: number) => {
    const d = new Date(`${weekStart}T00:00:00`)

    d.setDate(d.getDate() + n * 7)
    setWeekStart(toDateInput(d))
  }

  const fetchBlackouts = useCallback(async () => {
    if (!hotelId) return
    const API = process.env.NEXT_PUBLIC_API_URL ?? ''
    const now = new Date(`${selectedDate}T00:00:00`)
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    try {
      const data = await fetch(`${API}/v1/hotels/${hotelId}/bookings/blackout?from=${monthStart}`, {
        credentials: 'include'
      }).then(r => r.json())

      const dates = new Set<string>((data as any[]).map((b: any) => b.date))

      setBlackoutDates(dates)
    } catch {}
  }, [hotelId, selectedDate])

  useEffect(() => {
    fetchBlackouts()
  }, [fetchBlackouts])

  const { data: pendingCountData, refetch: refetchPendingCount } = useGetBookingsQuery(
    { hotelId, status: 'pending', limit: 1 },
    { skip: !hotelId || isFeatureLocked }
  )

  const {
    data: recentActivityData,
    isLoading: isLoadingRecentActivity,
    refetch: refetchRecentActivity
  } = useGetBookingsQuery(
    {
      hotelId,
      status: statusFilter || undefined,
      createdFrom: recentActivityFrom,
      createdTo: recentActivityTo,
      sortBy: 'createdAt:desc',
      limit: 100
    },
    { skip: !hotelId || isFeatureLocked || view !== 'list' }
  )

  const {
    data: upcomingBookingsData,
    isLoading: isLoadingUpcoming,
    refetch: refetchUpcoming
  } = useGetBookingsQuery(
    {
      hotelId,
      status: statusFilter || undefined,
      from: selectedDate,
      to: upcomingQueryTo,
      sortBy: 'startTime:asc',
      limit: 500
    },
    { skip: !hotelId || isFeatureLocked || view !== 'list' }
  )

  const nextDay = new Date(`${selectedDate}T00:00:00`)

  nextDay.setDate(nextDay.getDate() + 1)

  const { data: slotsData, refetch: refetchSlots } = useGetTimeSlotsQuery(
    { hotelId, from: selectedDate, to: toDateInput(nextDay) },
    { skip: !hotelId || isFeatureLocked || view !== 'calendar' }
  )

  const [updateBooking] = useUpdateBookingMutation()
  const [cancelBooking] = useCancelBookingMutation()
  const [blockSlot] = useBlockSlotMutation()
  const [unblockSlot] = useUnblockSlotMutation()
  const [generateSlots, { isLoading: isGenerating }] = useGenerateSlotsMutation()

  const { data: allItems } = useGetCatalogItemsQuery({ hotelId }, { skip: !hotelId || isFeatureLocked })

  const catalogItems = Array.isArray(allItems)
    ? allItems
    : ((allItems as any)?.results ?? (allItems as any)?.items ?? [])

  const bookableItems = catalogItems.filter((i: any) => i.type === 'bookable')

  const refreshListData = useCallback(() => {
    refetchRecentActivity()
    refetchUpcoming()
    refetchPendingCount()
  }, [refetchRecentActivity, refetchUpcoming, refetchPendingCount])

  useEffect(() => {
    if (!hotelId) return

    const evtSource = new EventSource(`/api/v1/hotels/${hotelId}/events`, { withCredentials: true })

    evtSource.addEventListener('new_booking', () => {
      refreshListData()
    })

    evtSource.addEventListener('escalation_alert', (e: MessageEvent) => {
      const data = JSON.parse(e.data)

      if (data.bookingId) {
        setEscalatedIds(prev => new Set(prev).add(data.bookingId))
      }

      refreshListData()
    })

    return () => evtSource.close()
  }, [hotelId, refreshListData])

  const handleGenerateSlots = async () => {
    await generateSlots({ hotelId })
    refetchSlots()
  }

  const handleConfirm = async (bookingId: string) => {
    await updateBooking({ hotelId, bookingId, body: { status: 'confirmed' } as any })
    refreshListData()
  }

  const handleComplete = async (bookingId: string) => {
    await updateBooking({ hotelId, bookingId, body: { status: 'completed' } as any })
    refreshListData()
  }

  const handleCancel = async (bookingId: string) => {
    await cancelBooking({ hotelId, bookingId })
    refreshListData()
  }

  const handleBlock = async (slotId: string) => {
    const result = await blockSlot({ hotelId, slotId })

    if ((result as any).error?.status === 409) {
      alert((result as any).error?.data?.message ?? 'Slot has active bookings. Cancel them first.')
    }

    refetchSlots()
  }

  const handleUnblock = async (slotId: string) => {
    await unblockSlot({ hotelId, slotId })
    refetchSlots()
  }

  const renderActions = (booking: IBooking) => (
    <Stack direction='row' spacing={0.5}>
      {booking.status === 'pending' && (
        <Tooltip title='Approve booking'>
          <IconButton size='small' color='success' onClick={() => handleConfirm(booking.id)}>
            <i className='ri-check-line' />
          </IconButton>
        </Tooltip>
      )}
      {booking.status === 'confirmed' && (
        <Tooltip title='Mark completed'>
          <IconButton size='small' color='info' onClick={() => handleComplete(booking.id)}>
            <i className='ri-checkbox-circle-line' />
          </IconButton>
        </Tooltip>
      )}
      {['pending', 'confirmed'].includes(booking.status) && (
        <Tooltip title='Cancel booking'>
          <IconButton size='small' color='error' onClick={() => handleCancel(booking.id)}>
            <i className='ri-close-circle-line' />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  )

  const renderBookingRow = (booking: IBooking) => {
    const isEscalated = escalatedIds.has(booking.id)

    return (
      <TableRow key={booking.id}>
        <TableCell>
          <Stack direction='row' alignItems='center' spacing={0.75}>
            <Typography fontWeight={600}>{booking.bookingRef}</Typography>
            {isEscalated && (
              <Tooltip title='Escalated - needs attention'>
                <i className='ri-alarm-warning-line' style={{ color: 'red', fontSize: 16 }} />
              </Tooltip>
            )}
          </Stack>
        </TableCell>
        <TableCell>{booking.guestRoomNumber}</TableCell>
        <TableCell>{itemName(booking.itemId)}</TableCell>
        <TableCell>{formatBookingTime(booking.startTime)}</TableCell>
        <TableCell>{booking.partySize}</TableCell>
        <TableCell>
          <Chip
            label={STATUS_LABELS[booking.status] ?? booking.status}
            color={STATUS_COLORS[booking.status] ?? 'default'}
            size='small'
          />
        </TableCell>
        <TableCell>{renderActions(booking)}</TableCell>
      </TableRow>
    )
  }

  const recentBookings: IBooking[] = useMemo(() => {
    return (((recentActivityData as any)?.results ?? []) as IBooking[])
      .filter(booking => {
        const dateKey = toDateInput(new Date(booking.createdAt))

        return dateKey >= recentActivityFrom && dateKey < recentActivityTo
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [recentActivityData, recentActivityFrom, recentActivityTo])

  const upcomingGroups = useMemo(() => {
    const upcomingBookings = (((upcomingBookingsData as any)?.results ?? []) as IBooking[])
      .filter(booking => {
        const dateKey = toDateInput(new Date(booking.startTime))

        return dateKey >= selectedDate && dateKey <= upcomingTo
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

    const groups = new Map<string, IBooking[]>()

    upcomingBookings.forEach(booking => {
      const key = toDateInput(new Date(booking.startTime))
      const current = groups.get(key) ?? []

      current.push(booking)
      groups.set(key, current)
    })

    return Array.from(groups.entries())
  }, [upcomingBookingsData, selectedDate, upcomingTo])

  if (isFeatureLocked) return <FeatureLocked featureName='Bookings' />

  const pendingCount = pendingCountData?.totalResults ?? 0
  const slots: ITimeSlot[] = (slotsData as any) ?? []
  const listLoading = isLoadingRecentActivity || isLoadingUpcoming

  return (
    <Box p={3}>
      <Stack direction='row' justifyContent='space-between' alignItems='center' mb={3} gap={2} flexWrap='wrap'>
        <Badge badgeContent={pendingCount || undefined} color='error'>
          <Typography variant='h5' fontWeight={700} sx={{ pr: pendingCount ? 1 : 0 }}>
            Bookings
          </Typography>
        </Badge>
        <ButtonGroup size='small'>
          <Button variant={view === 'list' ? 'contained' : 'outlined'} onClick={() => setView('list')}>
            List
          </Button>
          <Button variant={view === 'calendar' ? 'contained' : 'outlined'} onClick={() => setView('calendar')}>
            Calendar
          </Button>
          <Button variant={view === 'resources' ? 'contained' : 'outlined'} onClick={() => setView('resources')}>
            Resources
          </Button>
        </ButtonGroup>
      </Stack>

      {view === 'resources' && hotelId && <ResourcesTab hotelId={hotelId} />}

      {view !== 'resources' && (
        <Stack direction='row' spacing={2} mb={2} flexWrap='wrap'>
          <Box>
            <Typography variant='body2' fontWeight={600} mb={0.75}>
              Anchor date
            </Typography>
            <TextField type='date' size='small' value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          </Box>

          {view === 'list' && (
            <Box>
              <Typography variant='body2' fontWeight={600} mb={0.75}>
                Status
              </Typography>
              <Select
                size='small'
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                displayEmpty
                sx={{ minWidth: 170 }}
              >
                <MenuItem value=''>All statuses</MenuItem>
                <MenuItem value='pending'>Pending approval</MenuItem>
                <MenuItem value='confirmed'>Approved</MenuItem>
                <MenuItem value='completed'>Completed</MenuItem>
                <MenuItem value='cancelled'>Cancelled</MenuItem>
                <MenuItem value='no_show'>No Show</MenuItem>
              </Select>
            </Box>
          )}
        </Stack>
      )}

      {view === 'calendar' && (
        <Card>
          <CardContent>
            <Stack direction='row' alignItems='center' justifyContent='space-between' mb={2} flexWrap='wrap' gap={1}>
              <Stack direction='row' alignItems='center' gap={1} flexWrap='wrap'>
                <Select
                  size='small'
                  displayEmpty
                  value={calendarItemId}
                  onChange={e => setCalendarItemId(e.target.value)}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value=''>All services (day view)</MenuItem>
                  {bookableItems.map((item: any) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name}
                    </MenuItem>
                  ))}
                </Select>
                {calendarItemId ? (
                  <Stack direction='row' alignItems='center' gap={0.5}>
                    <Tooltip title='Previous week'>
                      <IconButton size='small' onClick={() => shiftWeek(-1)}>
                        <i className='ri-arrow-left-s-line' />
                      </IconButton>
                    </Tooltip>
                    <Typography variant='body2' sx={{ minWidth: 130, textAlign: 'center' }}>
                      {new Date(`${weekStart}T00:00:00`).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short'
                      })}
                      {' - '}
                      {new Date(`${addDays(weekStart, 6)}T00:00:00`).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </Typography>
                    <Tooltip title='Next week'>
                      <IconButton size='small' onClick={() => shiftWeek(1)}>
                        <i className='ri-arrow-right-s-line' />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ) : (
                  <Stack direction='row' alignItems='center' gap={1}>
                    <Typography variant='body2' color='text.secondary'>
                      Date:
                    </Typography>
                    {blackoutDates.has(selectedDate) && <Chip label='Blocked' size='small' color='error' />}
                  </Stack>
                )}
              </Stack>

              <Stack direction='row' alignItems='center' gap={1} flexWrap='wrap'>
                <Button
                  size='small'
                  variant='outlined'
                  color='primary'
                  startIcon={isGenerating ? <CircularProgress size={14} /> : <i className='ri-refresh-line' />}
                  onClick={handleGenerateSlots}
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Generating...' : 'Generate Slots'}
                </Button>
                <Button
                  size='small'
                  variant={showBlackoutPanel ? 'contained' : 'outlined'}
                  color='warning'
                  startIcon={<i className='ri-calendar-close-line' />}
                  onClick={() => setShowBlackoutPanel(v => !v)}
                >
                  Blackout Dates
                </Button>
                {!calendarItemId && (
                  <FormControlLabel
                    control={
                      <Switch checked={resourceView} onChange={e => setResourceView(e.target.checked)} size='small' />
                    }
                    label='Resource timeline'
                    sx={{ mb: 0 }}
                  />
                )}
              </Stack>
            </Stack>

            {showBlackoutPanel && hotelId && (
              <BlackoutDatesPanel hotelId={hotelId} selectedDate={selectedDate} onBlackoutsChange={fetchBlackouts} />
            )}

            {calendarItemId ? (
              hotelId && <ItemAvailabilityCalendar hotelId={hotelId} itemId={calendarItemId} weekStart={weekStart} />
            ) : resourceView ? (
              hotelId && <ResourceCalendar hotelId={hotelId} selectedDate={selectedDate} slots={slots} />
            ) : (
              <>
                {slots.length === 0 && (
                  <Alert severity='info' sx={{ mb: 2 }}>
                    No slots for {selectedDate}. Select a service above to see its week view, or click &quot;Generate
                    Slots&quot; to create them.
                  </Alert>
                )}
                <Stack spacing={1}>
                  {slots.map((slot: ITimeSlot) => {
                    const startStr = formatBookingTime(slot.startTime)
                    const endStr = formatBookingTime(slot.endTime)
                    const available = !slot.isBlocked && slot.bookedPersons < slot.maxPersons

                    return (
                      <Stack
                        key={slot.id}
                        direction='row'
                        alignItems='center'
                        spacing={2}
                        sx={{
                          p: 1.5,
                          borderRadius: 1,
                          bgcolor: slot.isBlocked
                            ? 'action.disabledBackground'
                            : available
                              ? 'success.light'
                              : 'warning.light'
                        }}
                      >
                        <Typography sx={{ minWidth: 110 }}>
                          {startStr}-{endStr}
                        </Typography>
                        <Typography sx={{ flex: 1 }}>{itemName(slot.itemId)}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {slot.bookedPersons}/{slot.maxPersons}
                        </Typography>
                        <Chip
                          label={slot.isBlocked ? 'Blocked' : available ? 'Available' : 'Full'}
                          color={slot.isBlocked ? 'default' : available ? 'success' : 'warning'}
                          size='small'
                        />
                        {slot.isBlocked ? (
                          <Tooltip title='Unblock slot'>
                            <IconButton size='small' onClick={() => handleUnblock(slot.id)}>
                              <i className='ri-lock-unlock-line' />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip
                            title={slot.bookedPersons > 0 ? 'Cannot block - active bookings exist' : 'Block slot'}
                          >
                            <span>
                              <IconButton
                                size='small'
                                onClick={() => handleBlock(slot.id)}
                                disabled={slot.bookedPersons > 0}
                              >
                                <i className='ri-lock-line' />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </Stack>
                    )
                  })}
                </Stack>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {view === 'list' && (
        <Stack spacing={3}>
          {listLoading ? (
            <Box textAlign='center' py={8}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Card>
                <CardContent>
                  <Stack spacing={1}>
                    <Typography variant='h6' fontWeight={700}>
                      Recent booking activity
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Last 7 days through {formatBookingDateHeading(selectedDate)}.
                    </Typography>
                  </Stack>

                  {recentBookings.length === 0 ? (
                    <Typography color='text.secondary' py={3}>
                      No recent bookings in the last 7 days.
                    </Typography>
                  ) : (
                    <Table sx={{ mt: 2 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Ref</TableCell>
                          <TableCell>Room</TableCell>
                          <TableCell>Service</TableCell>
                          <TableCell>Start</TableCell>
                          <TableCell>Created</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentBookings.map(booking => (
                          <TableRow key={booking.id}>
                            <TableCell>
                              <Typography fontWeight={600}>{booking.bookingRef}</Typography>
                            </TableCell>
                            <TableCell>{booking.guestRoomNumber}</TableCell>
                            <TableCell>{itemName(booking.itemId)}</TableCell>
                            <TableCell>{formatBookingDateTime(booking.startTime)}</TableCell>
                            <TableCell>{formatBookingDateTime(booking.createdAt)}</TableCell>
                            <TableCell>
                              <Chip
                                label={STATUS_LABELS[booking.status] ?? booking.status}
                                color={STATUS_COLORS[booking.status] ?? 'default'}
                                size='small'
                              />
                            </TableCell>
                            <TableCell>{renderActions(booking)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Stack spacing={1} mb={2}>
                    <Typography variant='h6' fontWeight={700}>
                      Upcoming 7-day booking plan
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      From {formatBookingDateHeading(selectedDate)} to {formatBookingDateHeading(upcomingTo)}.
                    </Typography>
                  </Stack>

                  {upcomingGroups.length === 0 ? (
                    <Typography color='text.secondary' py={3}>
                      No bookings scheduled in the next 7 days.
                    </Typography>
                  ) : (
                    <Stack spacing={2}>
                      {upcomingGroups.map(([date, bookings], index) => (
                        <Box key={date}>
                          {index > 0 && <Divider sx={{ mb: 2 }} />}
                          <Typography variant='subtitle1' fontWeight={700} mb={1.5}>
                            {formatBookingDateHeading(date)}
                          </Typography>
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell>Ref</TableCell>
                                <TableCell>Room</TableCell>
                                <TableCell>Service</TableCell>
                                <TableCell>Time</TableCell>
                                <TableCell>Party</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>{bookings.map(renderBookingRow)}</TableBody>
                          </Table>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </Stack>
      )}
    </Box>
  )
}
