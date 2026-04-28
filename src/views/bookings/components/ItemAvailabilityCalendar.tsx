'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import {
  useGetTimeSlotsQuery,
  useBlockSlotMutation,
  useUnblockSlotMutation,
  type ITimeSlot,
} from '@/redux/api/bookingApi'

interface Props {
  hotelId: string
  itemId: string
  weekStart: string // YYYY-MM-DD — Monday of displayed week
}

function addDays(base: string, n: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function ItemAvailabilityCalendar({ hotelId, itemId, weekStart }: Props) {
  const weekEnd = addDays(weekStart, 7)

  const { data: rawSlots, isFetching, refetch } = useGetTimeSlotsQuery(
    { hotelId, itemId, from: weekStart, to: weekEnd },
    { skip: !hotelId || !itemId }
  )
  const [blockSlot] = useBlockSlotMutation()
  const [unblockSlot] = useUnblockSlotMutation()

  const slots: ITimeSlot[] = (rawSlots as any) ?? []

  // Group slots by YYYY-MM-DD
  const byDay: Record<string, ITimeSlot[]> = {}
  for (let i = 0; i < 7; i++) {
    byDay[addDays(weekStart, i)] = []
  }
  for (const slot of slots) {
    const day = slot.startTime.slice(0, 10)
    if (byDay[day]) byDay[day].push(slot)
  }

  const handleBlock = async (slotId: string) => {
    const result = await blockSlot({ hotelId, slotId })
    if ((result as any).error?.status === 409) {
      alert((result as any).error?.data?.message ?? 'Slot has active bookings.')
    }
    refetch()
  }

  const handleUnblock = async (slotId: string) => {
    await unblockSlot({ hotelId, slotId })
    refetch()
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Collect all unique start times across the week (for row headers)
  const allTimes = Array.from(
    new Set(slots.map(s => s.startTime.slice(11, 16)))
  ).sort()

  if (isFetching) {
    return <Box display='flex' justifyContent='center' py={4}><CircularProgress size={28} /></Box>
  }

  if (slots.length === 0) {
    return (
      <Typography color='text.secondary' sx={{ py: 3, textAlign: 'center' }}>
        No slots generated for this week. Click "Generate Slots" to create them.
      </Typography>
    )
  }

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ width: 60, padding: '6px 8px', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>
              <Typography variant='caption' color='text.secondary'>Time</Typography>
            </th>
            {days.map((day, i) => {
              const isToday = day === new Date().toISOString().slice(0, 10)
              const d = new Date(day)
              return (
                <th key={day} style={{ padding: '6px 4px', textAlign: 'center', borderBottom: '2px solid #e0e0e0', background: isToday ? 'rgba(25,118,210,0.06)' : undefined }}>
                  <Typography variant='caption' color={isToday ? 'primary' : 'text.secondary'} fontWeight={isToday ? 700 : 400}>
                    {DAY_LABELS[i]}
                  </Typography>
                  <Typography variant='caption' display='block' color={isToday ? 'primary' : 'text.secondary'}>
                    {d.getDate()}/{d.getMonth() + 1}
                  </Typography>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {allTimes.map(time => (
            <tr key={time}>
              <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' }}>
                <Typography variant='caption' color='text.secondary' fontWeight={600}>{time}</Typography>
              </td>
              {days.map(day => {
                const slot = byDay[day]?.find(s => s.startTime.slice(11, 16) === time)
                if (!slot) {
                  return <td key={day} style={{ padding: '4px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}><Box sx={{ height: 36 }} /></td>
                }
                const available = !slot.isBlocked && slot.bookedPersons < slot.maxPersons
                const full = !slot.isBlocked && slot.bookedPersons >= slot.maxPersons
                return (
                  <td key={day} style={{ padding: '4px', borderBottom: '1px solid #f0f0f0', textAlign: 'center', verticalAlign: 'middle', background: day === new Date().toISOString().slice(0, 10) ? 'rgba(25,118,210,0.03)' : undefined }}>
                    <Stack direction='row' alignItems='center' justifyContent='center' gap={0.5}>
                      <Chip
                        size='small'
                        label={`${slot.bookedPersons}/${slot.maxPersons}`}
                        color={slot.isBlocked ? 'default' : full ? 'warning' : available ? 'success' : 'default'}
                        sx={{ fontSize: 11, height: 22, cursor: 'default' }}
                      />
                      <Tooltip title={slot.isBlocked ? 'Unblock slot' : slot.bookedPersons > 0 ? 'Has bookings — cannot block' : 'Block slot'}>
                        <span>
                          <IconButton
                            size='small'
                            sx={{ width: 20, height: 20 }}
                            disabled={!slot.isBlocked && slot.bookedPersons > 0}
                            onClick={() => slot.isBlocked ? handleUnblock(slot.id) : handleBlock(slot.id)}
                          >
                            <i className={slot.isBlocked ? 'ri-lock-unlock-line' : 'ri-lock-line'} style={{ fontSize: 12 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  )
}
