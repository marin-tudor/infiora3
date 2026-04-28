'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'

import { toast } from 'react-toastify'

import type { ITimeSlot } from '@/redux/api/bookingApi'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''

interface Resource {
  _id: string
  id?: string
  name: string
  type: string
  identifier?: string
  capacity: number
  isActive: boolean
}

interface Booking {
  id: string
  bookingRef: string
  guestRoomNumber: string
  itemId: { id: string; name: string } | string
  startTime: string
  endTime: string
  status: string
  assignedResourceId?: string | null
}

interface Props {
  hotelId: string
  selectedDate: string
  slots: ITimeSlot[]
}

interface PopoverState {
  anchor: HTMLElement
  booking: Booking
  resourceId: string
}

const itemName = (item: any) => (typeof item === 'string' ? item : item?.name ?? '—')

const resourceId = (r: Resource) => r._id ?? r.id ?? ''

export default function ResourceCalendar({ hotelId, selectedDate, slots }: Props) {
  const [resources, setResources] = useState<Resource[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loadingResources, setLoadingResources] = useState(false)
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const [assigning, setAssigning] = useState(false)

  // Stable ref so fetchBookings can be called from handleAssign without stale closure
  const fetchBookingsRef = useRef<() => Promise<void>>()

  const fetchResources = useCallback(async () => {
    setLoadingResources(true)
    try {
      const res = await fetch(`${API}/api/v1/hotels/${hotelId}/bookings/resources`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to load resources')
      const data = await res.json()
      setResources(Array.isArray(data) ? data : data.results ?? [])
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load resources')
    } finally {
      setLoadingResources(false)
    }
  }, [hotelId])

  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true)
    try {
      const res = await fetch(
        `${API}/api/v1/hotels/${hotelId}/bookings?date=${selectedDate}&limit=100`,
        { credentials: 'include' }
      )
      if (!res.ok) throw new Error('Failed to load bookings')
      const data = await res.json()
      const results: Booking[] = Array.isArray(data) ? data : data.results ?? []
      setBookings(results)
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load bookings')
    } finally {
      setLoadingBookings(false)
    }
  }, [hotelId, selectedDate])

  // Keep ref up to date
  fetchBookingsRef.current = fetchBookings

  useEffect(() => {
    fetchResources()
  }, [fetchResources])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  // Derive unique start times from slots (sorted)
  const uniqueStartTimes = Array.from(new Set(slots.map(s => s.startTime))).sort()

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // For a given resource + startTime: find booking, slot state
  const getCell = (resource: Resource, startTime: string) => {
    const slot = slots.find(s => s.startTime === startTime)
    if (!slot) return { kind: 'no-slot' as const }

    const booking = bookings.find(
      b =>
        b.startTime === startTime &&
        b.assignedResourceId === resourceId(resource)
    )

    if (booking) return { kind: 'booked' as const, booking, slot }
    if (slot.isBlocked) return { kind: 'blocked' as const, slot }
    return { kind: 'available' as const, slot }
  }

  const handleAssign = async (bookingId: string, resourceId: string) => {
    setAssigning(true)
    try {
      const res = await fetch(`${API}/api/v1/hotels/${hotelId}/bookings/${bookingId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedResourceId: resourceId }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.message ?? 'Failed to assign resource')
      }
      toast.success('Resource assigned')
      setPopover(null)
      await fetchBookingsRef.current?.()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to assign resource')
    } finally {
      setAssigning(false)
    }
  }

  const isLoading = loadingResources || loadingBookings

  if (isLoading && resources.length === 0) {
    return (
      <Box display='flex' justifyContent='center' py={4}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (!loadingResources && resources.length === 0) {
    return (
      <Typography color='text.secondary' py={2}>
        No resources configured. Go to the Resources tab to add resources.
      </Typography>
    )
  }

  if (uniqueStartTimes.length === 0) {
    return (
      <Typography color='text.secondary' py={2}>
        No time slots available for this date.
      </Typography>
    )
  }

  return (
    <Box sx={{ overflowX: 'auto' }}>
      {isLoading && (
        <Box display='flex' justifyContent='center' py={1}>
          <CircularProgress size={20} />
        </Box>
      )}

      <Table size='small' sx={{ tableLayout: 'fixed', minWidth: 600 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, minWidth: 140, bgcolor: 'background.paper' }}>
              Resource
            </TableCell>
            {uniqueStartTimes.map(st => (
              <TableCell
                key={st}
                align='center'
                sx={{ fontWeight: 600, minWidth: 90, bgcolor: 'background.paper' }}
              >
                {formatTime(st)}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {resources.map(resource => (
            <TableRow key={resource._id} hover>
              <TableCell sx={{ fontWeight: 500, opacity: resource.isActive ? 1 : 0.5 }}>
                <Stack>
                  <Typography variant='body2' fontWeight={600}>{resource.name}</Typography>
                  {resource.identifier && (
                    <Typography variant='caption' color='text.secondary'>{resource.identifier}</Typography>
                  )}
                </Stack>
              </TableCell>
              {uniqueStartTimes.map(st => {
                const cell = getCell(resource, st)

                if (cell.kind === 'no-slot') {
                  return (
                    <TableCell
                      key={st}
                      align='center'
                      sx={{ bgcolor: 'action.disabledBackground', color: 'text.disabled', fontSize: 12 }}
                    >
                      —
                    </TableCell>
                  )
                }

                if (cell.kind === 'blocked') {
                  return (
                    <TableCell
                      key={st}
                      align='center'
                      sx={{
                        bgcolor: 'error.light',
                        color: 'error.contrastText',
                        fontSize: 12,
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.06) 4px, rgba(0,0,0,0.06) 8px)',
                      }}
                    >
                      Blocked
                    </TableCell>
                  )
                }

                if (cell.kind === 'available') {
                  return (
                    <TableCell
                      key={st}
                      align='center'
                      sx={{ bgcolor: 'success.light', color: 'success.contrastText', fontSize: 12 }}
                    >
                      Free
                    </TableCell>
                  )
                }

                // booked
                const b = cell.booking
                const alreadyAssigned = b.assignedResourceId === resourceId(resource)

                return (
                  <Tooltip
                    key={st}
                    title={`${itemName(b.itemId)} — Room ${b.guestRoomNumber} (${b.bookingRef})`}
                  >
                    <TableCell
                      align='center'
                      onClick={e => setPopover({ anchor: e.currentTarget, booking: b, resourceId: resourceId(resource) })}
                      sx={{
                        bgcolor: 'primary.light',
                        color: 'primary.contrastText',
                        fontSize: 12,
                        cursor: 'pointer',
                        '&:hover': { filter: 'brightness(0.92)' },
                      }}
                    >
                      Room {b.guestRoomNumber}
                    </TableCell>
                  </Tooltip>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Booking detail popover */}
      {popover && (
        <Popover
          open
          anchorEl={popover.anchor}
          onClose={() => setPopover(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Box p={2} minWidth={220}>
            <Typography variant='subtitle2' fontWeight={700} mb={1}>
              Booking Details
            </Typography>
            <Typography variant='body2'>Ref: {popover.booking.bookingRef}</Typography>
            <Typography variant='body2'>Room: {popover.booking.guestRoomNumber}</Typography>
            <Typography variant='body2'>Service: {itemName(popover.booking.itemId)}</Typography>
            <Typography variant='body2'>
              Start: {new Date(popover.booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Typography>
            <Typography variant='body2'>Status: {popover.booking.status}</Typography>
            {popover.booking.assignedResourceId !== popover.resourceId && (
              <Button
                size='small'
                variant='contained'
                sx={{ mt: 1.5 }}
                disabled={assigning}
                onClick={() => handleAssign(popover.booking.id, popover.resourceId)}
              >
                {assigning ? 'Assigning…' : 'Assign this resource'}
              </Button>
            )}
          </Box>
        </Popover>
      )}
    </Box>
  )
}
