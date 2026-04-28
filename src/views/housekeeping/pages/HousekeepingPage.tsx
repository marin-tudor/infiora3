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
import { useDictionary } from '@/contexts/DictionaryContext'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useGetHotelQuery } from '@/redux/api/hotelApi'
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

const reservationCodeColor = (status?: string): 'default' | 'success' | 'warning' =>
  status === 'matched' ? 'success' : status === 'unmatched' ? 'warning' : 'default'

const TYPE_ICONS: Record<string, string> = {
  cleaning: 'đź§ą',
  towels: 'đź›',
  pillows: 'đź›Ź',
  amenities: 'đź§´',
  do_not_disturb: 'đź”•',
  extra_bed: 'đź›‹',
  other: 'đź’¬',
}

export default function HousekeepingPage() {
  const dictionary: any = useDictionary()
  const t = dictionary.pages?.housekeeping || {}
  const authUser = useAuthUser()
  const hotelId = (authUser as any)?.hotel?.id
  const { data: liveHotel } = useGetHotelQuery(hotelId!, { skip: !hotelId })
  const [statusFilter, setStatusFilter] = useState('pending')

  const hotelFeatures = ((liveHotel as any) ?? (authUser as any)?.hotel)?.features
  const isFeatureLocked = hotelFeatures?.housekeepingEnabled === false

  const statusLabels: Record<string, string> = {
    '': t.statusAll || 'All',
    pending: t.statusPending || 'Pending',
    in_progress: t.statusInProgress || 'In Progress',
    done: t.statusDone || 'Done',
    cancelled: t.statusCancelled || 'Cancelled',
  }

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
            {t.title || 'Housekeeping Requests'}
          </Typography>
        </Badge>
        <Select
          size='small'
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          sx={{ minWidth: 150 }}
          displayEmpty
          renderValue={value => statusLabels[String(value)] ?? (t.statusAll || 'All')}
        >
          <MenuItem value=''>{t.statusAll || 'All'}</MenuItem>
          <MenuItem value='pending'>
            <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ width: '100%' }}>
              <span>{t.statusPending || 'Pending'}</span>
              {pendingOnlyCount > 0 && <Chip label={pendingOnlyCount} color='error' size='small' />}
            </Stack>
          </MenuItem>
          <MenuItem value='in_progress'>{t.statusInProgress || 'In Progress'}</MenuItem>
          <MenuItem value='done'>{t.statusDone || 'Done'}</MenuItem>
          <MenuItem value='cancelled'>{t.statusCancelled || 'Cancelled'}</MenuItem>
        </Select>
      </Stack>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t.colRoom || 'Room'}</TableCell>
                <TableCell>{t.colRequest || 'Request'}</TableCell>
                <TableCell>{t.colNote || 'Note'}</TableCell>
                <TableCell>{t.colProof || 'Proof'}</TableCell>
                <TableCell>{t.colStatus || 'Status'}</TableCell>
                <TableCell>{t.colTime || 'Time'}</TableCell>
                <TableCell align='right'>{t.colActions || 'Actions'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align='center' sx={{ py: 4, color: 'text.secondary' }}>
                    {t.empty || 'No requests found'}
                  </TableCell>
                </TableRow>
              ) : (
                requests.map(req => (
                  <TableRow key={req.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{req.guestRoomNumber || req.roomNumber || req.room}</Typography>
                      {req.guestRoomNumber && req.roomNumber && (
                        <Typography variant='caption' color='text.secondary'>
                          {(t.qrRoomPrefix || 'QR room')} {req.roomNumber}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction='row' alignItems='center' gap={1}>
                        <span>{TYPE_ICONS[req.type] ?? 'đź“‹'}</span>
                        <Typography variant='body2' sx={{ textTransform: 'capitalize' }}>
                          {req.typeLabel || req.type.replace('_', ' ')}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary' noWrap sx={{ maxWidth: 200 }}>
                        {req.note || 'â€”'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {req.reservationCode ? (
                        <Chip
                          label={`${req.reservationCode} ${req.reservationCodeStatus === 'matched' ? 'âś“' : '!'}`}
                          color={reservationCodeColor(req.reservationCodeStatus)}
                          size='small'
                          variant='outlined'
                        />
                      ) : (
                        <Typography variant='caption' color='text.secondary'>Ă˘â‚¬â€ť</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusLabels[req.status] || req.status.replace('_', ' ')}
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
                          <Tooltip title={t.actionMarkInProgress || 'Mark In Progress'}>
                            <IconButton size='small' color='info' onClick={() => handleStatus(req.id, 'in_progress')}>
                              <HourglassEmptyIcon fontSize='small' />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(req.status === 'pending' || req.status === 'in_progress') && (
                          <>
                            <Tooltip title={t.actionMarkDone || 'Mark Done'}>
                              <IconButton size='small' color='success' onClick={() => handleStatus(req.id, 'done')}>
                                <CheckCircleOutlineIcon fontSize='small' />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t.actionCancel || 'Cancel'}>
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
