'use client'

import { useState, useEffect, useCallback } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'

import FeatureLocked from '@/components/common/FeatureLocked'
import { useAuthUser } from '@/hooks/useAuthUser'
import BlackoutDatesPanel from '@/views/bookings/components/BlackoutDatesPanel'
import ResourceCalendar from '@/views/bookings/components/ResourceCalendar'
import ResourcesTab from '@/views/bookings/components/ResourcesTab'
import { useGetHotelQuery } from '@/redux/api/hotelApi'
import {
  useGetBookingsQuery,
  useGetTimeSlotsQuery,
  useUpdateBookingMutation,
  useCancelBookingMutation,
  useBlockSlotMutation,
  useUnblockSlotMutation,
  type IBooking,
  type ITimeSlot,
} from '@/redux/api/bookingApi'

const STATUS_COLORS: Record<string, any> = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'error',
  completed: 'default',
  no_show: 'error',
}

const itemName = (item: any) => (typeof item === 'string' ? item : item?.name ?? '—')

export default function BookingsPage() {
  const authUser = useAuthUser()
  const hotelId = (authUser as any)?.hotel?.id
  const { data: liveHotel } = useGetHotelQuery(hotelId!, { skip: !hotelId })
  const hotelFeatures = ((liveHotel as any) ?? (authUser as any)?.hotel)?.features
  const isFeatureLocked = hotelFeatures?.bookableServicesEnabled === false

  const [view, setView] = useState<'list' | 'calendar' | 'resources'>('list')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [statusFilter, setStatusFilter] = useState('')
  const [escalatedIds, setEscalatedIds] = useState<Set<string>>(new Set())
  const [resourceView, setResourceView] = useState(false)
  const [blackoutDates, setBlackoutDates] = useState<Set<string>>(new Set())
  const [showBlackoutPanel, setShowBlackoutPanel] = useState(false)

  // SSE — listen for escalation alerts
  useEffect(() => {
    if (!hotelId) return
    const evtSource = new EventSource(`/api/v1/hotels/${hotelId}/events`, { withCredentials: true })
    evtSource.addEventListener('escalation_alert', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      if (data.bookingId) setEscalatedIds(prev => new Set(prev).add(data.bookingId))
    })
    return () => evtSource.close()
  }, [hotelId])

  const fetchBlackouts = useCallback(async () => {
    if (!hotelId) return
    const API = process.env.NEXT_PUBLIC_API_URL ?? ''
    try {
      const data = await fetch(`${API}/v1/hotels/${hotelId}/bookings/blackout`).then(r => r.json())
      const dates = new Set<string>((data as any[]).map((b: any) => b.date))
      setBlackoutDates(dates)
    } catch {}
  }, [hotelId])

  useEffect(() => { fetchBlackouts() }, [fetchBlackouts])

  const { data: bookingsData, isLoading, refetch: refetchBookings } = useGetBookingsQuery(
    { hotelId, status: statusFilter || undefined, date: selectedDate, limit: 50 },
    { skip: !hotelId || isFeatureLocked }
  )

  const nextDay = new Date(selectedDate)
  nextDay.setDate(nextDay.getDate() + 1)
  const { data: slotsData, refetch: refetchSlots } = useGetTimeSlotsQuery(
    { hotelId, from: selectedDate, to: nextDay.toISOString().slice(0, 10) },
    { skip: !hotelId || isFeatureLocked || view !== 'calendar' }
  )

  const [updateBooking] = useUpdateBookingMutation()
  const [cancelBooking] = useCancelBookingMutation()
  const [blockSlot] = useBlockSlotMutation()
  const [unblockSlot] = useUnblockSlotMutation()

  const handleConfirm = async (bookingId: string) => {
    await updateBooking({ hotelId, bookingId, body: { status: 'confirmed' } as any })
    refetchBookings()
  }

  const handleComplete = async (bookingId: string) => {
    await updateBooking({ hotelId, bookingId, body: { status: 'completed' } as any })
    refetchBookings()
  }

  const handleCancel = async (bookingId: string) => {
    await cancelBooking({ hotelId, bookingId })
    refetchBookings()
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

  if (isFeatureLocked) return <FeatureLocked featureName='Bookings' />

  const bookings: IBooking[] = (bookingsData as any)?.results ?? []
  const slots: ITimeSlot[] = (slotsData as any) ?? []

  return (
    <Box p={3}>
      <Stack direction='row' justifyContent='space-between' alignItems='center' mb={3}>
        <Typography variant='h5' fontWeight={700}>Bookings</Typography>
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

      {/* RESOURCES VIEW */}
      {view === 'resources' && hotelId && <ResourcesTab hotelId={hotelId} />}

      {/* Date + status filters — only shown for list/calendar views */}
      {view !== 'resources' && <Stack direction='row' spacing={2} mb={2} flexWrap='wrap'>
        <TextField
          type='date'
          size='small'
          label='Date'
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        {view === 'list' && (
          <Select
            size='small'
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            displayEmpty
            sx={{ minWidth: 150 }}
          >
            <MenuItem value=''>All statuses</MenuItem>
            <MenuItem value='pending'>Pending</MenuItem>
            <MenuItem value='confirmed'>Confirmed</MenuItem>
            <MenuItem value='completed'>Completed</MenuItem>
            <MenuItem value='cancelled'>Cancelled</MenuItem>
            <MenuItem value='no_show'>No Show</MenuItem>
          </Select>
        )}
      </Stack>}

      {/* CALENDAR VIEW — time slots grid or resource timeline */}
      {view === 'calendar' && (
        <Card>
          <CardContent>
            <Stack direction='row' alignItems='center' justifyContent='space-between' mb={2} flexWrap='wrap' gap={1}>
              <Stack direction='row' alignItems='center' gap={1}>
                <Typography variant='subtitle1'>Time Slots — {selectedDate}</Typography>
                {blackoutDates.has(selectedDate) && (
                  <Chip label='Blocked' size='small' color='error' />
                )}
              </Stack>
              <Stack direction='row' alignItems='center' gap={1} flexWrap='wrap'>
                <Button
                  size='small'
                  variant={showBlackoutPanel ? 'contained' : 'outlined'}
                  color='warning'
                  startIcon={<i className='ri-calendar-close-line' />}
                  onClick={() => setShowBlackoutPanel(v => !v)}
                >
                  Blackout Dates
                </Button>
                <FormControlLabel
                  control={<Switch checked={resourceView} onChange={e => setResourceView(e.target.checked)} size='small' />}
                  label='Resource timeline'
                  sx={{ mb: 0 }}
                />
              </Stack>
            </Stack>

            {showBlackoutPanel && hotelId && (
              <BlackoutDatesPanel
                hotelId={hotelId}
                selectedDate={selectedDate}
                onBlackoutsChange={fetchBlackouts}
              />
            )}

            {resourceView ? (
              hotelId && (
                <ResourceCalendar hotelId={hotelId} selectedDate={selectedDate} slots={slots} />
              )
            ) : (
              <>
                {slots.length === 0 && (
                  <Typography color='text.secondary'>No slots generated for this date. Check that bookable items have a weekly schedule configured.</Typography>
                )}
                <Stack spacing={1}>
                  {slots.map((slot: ITimeSlot) => {
                    const startStr = new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    const endStr = new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
                            : 'warning.light',
                        }}
                      >
                        <Typography sx={{ minWidth: 110 }}>{startStr}–{endStr}</Typography>
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
                          <Tooltip title={slot.bookedPersons > 0 ? 'Cannot block — active bookings exist' : 'Block slot'}>
                            <span>
                              <IconButton size='small' onClick={() => handleBlock(slot.id)} disabled={slot.bookedPersons > 0}>
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

      {/* LIST VIEW — bookings table */}
      {view === 'list' && (
        isLoading ? (
          <CircularProgress />
        ) : (
          <Card>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ref</TableCell>
                  <TableCell>Room</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Start</TableCell>
                  <TableCell>Party</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align='center'>
                      <Typography color='text.secondary'>No bookings found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {bookings.map((b: IBooking) => {
                  const isEscalated = escalatedIds.has(b.id)
                  return (
                    <TableRow key={b.id}>
                      <TableCell>
                        <Stack direction='row' alignItems='center' spacing={0.5}>
                          <span>{b.bookingRef}</span>
                          {isEscalated && (
                            <Tooltip title='Escalated — needs attention'>
                              <i className='ri-alarm-warning-line' style={{ color: 'red', fontSize: 16 }} />
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>{b.guestRoomNumber}</TableCell>
                      <TableCell>{itemName(b.itemId)}</TableCell>
                      <TableCell>{new Date(b.startTime).toLocaleString()}</TableCell>
                      <TableCell>{b.partySize}</TableCell>
                      <TableCell>
                        <Chip label={b.status} color={STATUS_COLORS[b.status] ?? 'default'} size='small' />
                      </TableCell>
                      <TableCell>
                        <Stack direction='row' spacing={0.5}>
                          {b.status === 'pending' && (
                            <Tooltip title='Confirm booking'>
                              <IconButton size='small' color='success' onClick={() => handleConfirm(b.id)}>
                                <i className='ri-check-line' />
                              </IconButton>
                            </Tooltip>
                          )}
                          {b.status === 'confirmed' && (
                            <Tooltip title='Mark completed'>
                              <IconButton size='small' color='info' onClick={() => handleComplete(b.id)}>
                                <i className='ri-checkbox-circle-line' />
                              </IconButton>
                            </Tooltip>
                          )}
                          {['pending', 'confirmed'].includes(b.status) && (
                            <Tooltip title='Cancel booking'>
                              <IconButton size='small' color='error' onClick={() => handleCancel(b.id)}>
                                <i className='ri-close-circle-line' />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )
      )}
    </Box>
  )
}
