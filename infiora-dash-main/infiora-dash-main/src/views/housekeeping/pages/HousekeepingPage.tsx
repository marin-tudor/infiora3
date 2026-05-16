'use client'

import { useState } from 'react'

import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'

import FeatureLocked from '@/components/common/FeatureLocked'
import Loader from '@/components/common/Loader'
import { useDictionary } from '@/contexts/DictionaryContext'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useGetHotelQuery } from '@/redux/api/hotelApi'
import {
  type IHousekeepingRequest,
  useGetHousekeepingPendingCountQuery,
  useGetHousekeepingRequestsQuery,
  useUpdateHousekeepingStatusMutation
} from '@/redux/api/housekeepingApi'

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  pending: 'warning',
  in_progress: 'info',
  done: 'success',
  cancelled: 'error'
}

const proofColor = (status?: string): 'default' | 'success' | 'warning' =>
  status === 'matched' ? 'success' : status === 'unmatched' ? 'warning' : 'default'

const TYPE_LABELS: Record<string, string> = {
  cleaning: 'clean',
  towels: 'towels',
  pillows: 'pillows',
  amenities: 'kit',
  do_not_disturb: 'dnd',
  extra_bed: 'bed',
  other: 'misc'
}

export default function HousekeepingPage() {
  const dictionary: any = useDictionary()
  const pageText = dictionary.pages?.housekeeping || {}
  const authUser = useAuthUser()
  const hotelId = (authUser as any)?.hotel?.id
  const { data: liveHotel } = useGetHotelQuery(hotelId!, { skip: !hotelId })
  const [statusFilter, setStatusFilter] = useState('pending')

  const hotelFeatures = ((liveHotel as any) ?? (authUser as any)?.hotel)?.features
  const isFeatureLocked = hotelFeatures?.housekeepingEnabled === false

  const statusLabels: Record<string, string> = {
    '': pageText.statusAll || 'All',
    pending: pageText.statusPending || 'Pending',
    in_progress: pageText.statusInProgress || 'In Progress',
    done: pageText.statusDone || 'Done',
    cancelled: pageText.statusCancelled || 'Cancelled'
  }

  const { data, isLoading } = useGetHousekeepingRequestsQuery(
    { hotelId, status: statusFilter || undefined, limit: 50 },
    { skip: !hotelId || isFeatureLocked, pollingInterval: 30000 }
  )

  const { data: pendingData } = useGetHousekeepingPendingCountQuery(hotelId, {
    skip: !hotelId || isFeatureLocked,
    pollingInterval: 30000
  })

  const { data: pendingOnlyData } = useGetHousekeepingRequestsQuery(
    { hotelId, status: 'pending', limit: 1 },
    { skip: !hotelId || isFeatureLocked, pollingInterval: 30000 }
  )

  const [updateStatus] = useUpdateHousekeepingStatusMutation()

  if (isFeatureLocked) {
    return <FeatureLocked featureName='Housekeeping' />
  }

  if (isLoading) {
    return <Loader center />
  }

  const requests: IHousekeepingRequest[] = data?.results ?? []
  const unsolvedCount = pendingData?.count ?? 0
  const pendingOnlyCount = pendingOnlyData?.totalResults ?? 0

  return (
    <Box p={3}>
      <Stack direction='row' justifyContent='space-between' alignItems='center' mb={3}>
        <Badge badgeContent={unsolvedCount || undefined} color='error'>
          <Typography variant='h5' fontWeight={700} sx={{ pr: unsolvedCount ? 1 : 0 }}>
            {pageText.title || 'Housekeeping Requests'}
          </Typography>
        </Badge>
        <Select
          size='small'
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value)}
          sx={{ minWidth: 150 }}
          displayEmpty
          renderValue={value => statusLabels[String(value)] ?? (pageText.statusAll || 'All')}
        >
          <MenuItem value=''>{pageText.statusAll || 'All'}</MenuItem>
          <MenuItem value='pending'>
            <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ width: '100%' }}>
              <span>{pageText.statusPending || 'Pending'}</span>
              {pendingOnlyCount > 0 && <Chip label={pendingOnlyCount} color='error' size='small' />}
            </Stack>
          </MenuItem>
          <MenuItem value='in_progress'>{pageText.statusInProgress || 'In Progress'}</MenuItem>
          <MenuItem value='done'>{pageText.statusDone || 'Done'}</MenuItem>
          <MenuItem value='cancelled'>{pageText.statusCancelled || 'Cancelled'}</MenuItem>
        </Select>
      </Stack>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{pageText.colRoom || 'Room'}</TableCell>
                <TableCell>{pageText.colRequest || 'Request'}</TableCell>
                <TableCell>{pageText.colNote || 'Note'}</TableCell>
                <TableCell>{pageText.colProof || 'Proof'}</TableCell>
                <TableCell>{pageText.colStatus || 'Status'}</TableCell>
                <TableCell>{pageText.colTime || 'Time'}</TableCell>
                <TableCell align='right'>{pageText.colActions || 'Actions'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align='center' sx={{ py: 4, color: 'text.secondary' }}>
                    {pageText.empty || 'No requests found'}
                  </TableCell>
                </TableRow>
              ) : (
                requests.map(request => (
                  <TableRow key={request.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{request.guestRoomNumber || request.roomNumber || request.room}</Typography>
                      {request.guestRoomNumber && request.roomNumber && (
                        <Typography variant='caption' color='text.secondary'>
                          {pageText.qrRoomPrefix || 'QR room'} {request.roomNumber}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction='row' alignItems='center' gap={1}>
                        <span>{TYPE_LABELS[request.type] ?? 'item'}</span>
                        <Typography variant='body2' sx={{ textTransform: 'capitalize' }}>
                          {request.typeLabel || request.type.replace('_', ' ')}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary' noWrap sx={{ maxWidth: 200 }}>
                        {request.note || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction='row' gap={0.5} flexWrap='wrap'>
                        {request.guestRoomNumber && (
                          <Chip
                            label={`Room ${request.guestRoomNumber} ${request.roomNumberStatus === 'matched' ? 'OK' : request.roomNumberStatus === 'unmatched' ? '!' : '?'}`}
                            color={proofColor(request.roomNumberStatus)}
                            size='small'
                            variant='outlined'
                          />
                        )}
                        {request.reservationCode && (
                          <Chip
                            label={`${request.reservationCode} ${request.reservationCodeStatus === 'matched' ? 'OK' : '!'}`}
                            color={proofColor(request.reservationCodeStatus)}
                            size='small'
                            variant='outlined'
                          />
                        )}
                        {!request.guestRoomNumber && !request.reservationCode && (
                          <Typography variant='caption' color='text.secondary'>
                            -
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusLabels[request.status] || request.status.replace('_', ' ')}
                        color={STATUS_COLORS[request.status]}
                        size='small'
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant='caption' color='text.secondary'>
                        {new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <br />
                        {new Date(request.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Stack direction='row' justifyContent='flex-end' gap={0.5}>
                        {request.status === 'pending' && (
                          <Tooltip title={pageText.actionMarkInProgress || 'Mark In Progress'}>
                            <IconButton size='small' color='info' onClick={() => updateStatus({ id: request.id, status: 'in_progress' })}>
                              <HourglassEmptyIcon fontSize='small' />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(request.status === 'pending' || request.status === 'in_progress') && (
                          <>
                            <Tooltip title={pageText.actionMarkDone || 'Mark Done'}>
                              <IconButton size='small' color='success' onClick={() => updateStatus({ id: request.id, status: 'done' })}>
                                <CheckCircleOutlineIcon fontSize='small' />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={pageText.actionCancel || 'Cancel'}>
                              <IconButton size='small' color='error' onClick={() => updateStatus({ id: request.id, status: 'cancelled' })}>
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
