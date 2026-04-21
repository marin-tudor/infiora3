'use client'

import { useState } from 'react'

import {
  Badge,
  Box,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'

import Loader from '@/components/common/Loader'
import FeatureLocked from '@/components/common/FeatureLocked'
import { useAuthUser } from '@/hooks/useAuthUser'
import {
  useGetHousekeepingRequestsQuery,
  useGetHousekeepingPendingCountQuery,
  useUpdateHousekeepingStatusMutation,
  type IHousekeepingRequest,
} from '@/redux/api/housekeepingApi'

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  pending: 'warning',
  in_progress: 'info',
  done: 'success',
  cancelled: 'error',
}

const STATUS_LABELS: Record<string, string> = {
  '': 'All',
  pending: 'Pending',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
}

const reservationCodeColor = (status?: string): 'default' | 'success' | 'warning' =>
  status === 'matched' ? 'success' : status === 'unmatched' ? 'warning' : 'default'

const TYPE_ICONS: Record<string, string> = {
  cleaning: '🧹',
  towels: '🛁',
  pillows: '🛏',
  amenities: '🧴',
  do_not_disturb: '🔕',
  extra_bed: '🛋',
  other: '💬',
}

export default function HousekeepingPage() {
  const authUser = useAuthUser()
  const hotelId = (authUser as any)?.hotel?.id
  const [statusFilter, setStatusFilter] = useState('pending')

  const isFeatureLocked = (authUser as any)?.hotel?.features?.housekeepingEnabled === false

  const { data, isLoading } = useGetHousekeepingRequestsQuery(
    { hotelId, status: statusFilter || undefined, limit: 50 },
    { skip: !hotelId || isFeatureLocked, pollingInterval: 30000 }
  )

  const { data: pendingData } = useGetHousekeepingPendingCountQuery(hotelId, {
    skip: !hotelId || isFeatureLocked,
    pollingInterval: 30000,
  })

  const { data: pendingOnlyData } = useGetHousekeepingRequestsQuery(
    { hotelId, status: 'pending', limit: 1 },
    { skip: !hotelId || isFeatureLocked, pollingInterval: 30000 }
  )

  const [updateStatus] = useUpdateHousekeepingStatusMutation()

  const handleStatus = async (id: string, status: string) => {
    await updateStatus({ id, status })
  }

  if (isFeatureLocked) {
    return <FeatureLocked featureName='Housekeeping' />
  }

  if (isLoading) return <Loader center />

  const requests: IHousekeepingRequest[] = data?.results ?? []
  const unsolvedCount = pendingData?.count ?? 0
  const pendingOnlyCount = pendingOnlyData?.totalResults ?? 0

  return (
    <Box p={3}>
      <Stack direction='row' justifyContent='space-between' alignItems='center' mb={3}>
        <Badge badgeContent={unsolvedCount || undefined} color='error'>
          <Typography variant='h5' fontWeight={700} sx={{ pr: unsolvedCount ? 1 : 0 }}>
            Housekeeping Requests
          </Typography>
        </Badge>
        <Select
          size='small'
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          sx={{ minWidth: 150 }}
          displayEmpty
          renderValue={value => STATUS_LABELS[String(value)] ?? 'All'}
        >
          <MenuItem value=''>All</MenuItem>
          <MenuItem value='pending'>
            <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ width: '100%' }}>
              <span>Pending</span>
              {pendingOnlyCount > 0 && <Chip label={pendingOnlyCount} color='error' size='small' />}
            </Stack>
          </MenuItem>
          <MenuItem value='in_progress'>In Progress</MenuItem>
          <MenuItem value='done'>Done</MenuItem>
          <MenuItem value='cancelled'>Cancelled</MenuItem>
        </Select>
      </Stack>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Room</TableCell>
                <TableCell>Request</TableCell>
                <TableCell>Note</TableCell>
                <TableCell>Proof</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Time</TableCell>
                <TableCell align='right'>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align='center' sx={{ py: 4, color: 'text.secondary' }}>
                    No requests found
                  </TableCell>
                </TableRow>
              ) : (
                requests.map(req => (
                  <TableRow key={req.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{req.guestRoomNumber || req.roomNumber || req.room}</Typography>
                      {req.guestRoomNumber && req.roomNumber && (
                        <Typography variant='caption' color='text.secondary'>
                          QR room {req.roomNumber}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction='row' alignItems='center' gap={1}>
                        <span>{TYPE_ICONS[req.type] ?? '📋'}</span>
                        <Typography variant='body2' sx={{ textTransform: 'capitalize' }}>
                          {req.typeLabel || req.type.replace('_', ' ')}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary' noWrap sx={{ maxWidth: 200 }}>
                        {req.note || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {req.reservationCode ? (
                        <Chip
                          label={`${req.reservationCode} ${req.reservationCodeStatus === 'matched' ? '✓' : '!'}`}
                          color={reservationCodeColor(req.reservationCodeStatus)}
                          size='small'
                          variant='outlined'
                        />
                      ) : (
                        <Typography variant='caption' color='text.secondary'>â€”</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={req.status.replace('_', ' ')}
                        color={STATUS_COLORS[req.status]}
                        size='small'
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant='caption' color='text.secondary'>
                        {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <br />
                        {new Date(req.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Stack direction='row' justifyContent='flex-end' gap={0.5}>
                        {req.status === 'pending' && (
                          <Tooltip title='Mark In Progress'>
                            <IconButton size='small' color='info' onClick={() => handleStatus(req.id, 'in_progress')}>
                              <HourglassEmptyIcon fontSize='small' />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(req.status === 'pending' || req.status === 'in_progress') && (
                          <>
                            <Tooltip title='Mark Done'>
                              <IconButton size='small' color='success' onClick={() => handleStatus(req.id, 'done')}>
                                <CheckCircleOutlineIcon fontSize='small' />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title='Cancel'>
                              <IconButton size='small' color='error' onClick={() => handleStatus(req.id, 'cancelled')}>
                                <CancelOutlinedIcon fontSize='small' />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  )
}
