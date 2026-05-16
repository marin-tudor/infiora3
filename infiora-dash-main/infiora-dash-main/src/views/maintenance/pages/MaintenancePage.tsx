'use client'

import { useState } from 'react'

import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
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
import ImageIcon from '@mui/icons-material/Image'

import FeatureLocked from '@/components/common/FeatureLocked'
import Loader from '@/components/common/Loader'
import { useDictionary } from '@/contexts/DictionaryContext'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useGetHotelQuery } from '@/redux/api/hotelApi'
import {
  type IMaintenanceIssue,
  useGetMaintenanceIssuesQuery,
  useGetMaintenancePendingCountQuery,
  useUpdateMaintenanceStatusMutation
} from '@/redux/api/maintenanceApi'
import { resolveAssetUrl } from '@/utils/imageUrlUtils'

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  pending: 'warning',
  in_progress: 'info',
  done: 'success',
  cancelled: 'error'
}

const proofColor = (status?: string): 'default' | 'success' | 'warning' =>
  status === 'matched' ? 'success' : status === 'unmatched' ? 'warning' : 'default'

const TYPE_LABELS: Record<string, string> = {
  ac: 'AC',
  plumbing: 'pipe',
  electrical: 'power',
  tv: 'TV',
  wifi: 'WiFi',
  furniture: 'furn',
  other: 'misc'
}

export default function MaintenancePage() {
  const dictionary: any = useDictionary()
  const pageText = dictionary.pages?.maintenance || {}
  const authUser = useAuthUser()
  const hotelId = (authUser as any)?.hotel?.id
  const { data: liveHotel } = useGetHotelQuery(hotelId!, { skip: !hotelId })
  const [statusFilter, setStatusFilter] = useState('pending')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  const hotelFeatures = ((liveHotel as any) ?? (authUser as any)?.hotel)?.features
  const isFeatureLocked = hotelFeatures?.maintenanceEnabled === false

  const statusLabels: Record<string, string> = {
    '': pageText.statusAll || 'All',
    pending: pageText.statusPending || 'Pending',
    in_progress: pageText.statusInProgress || 'In Progress',
    done: pageText.statusDone || 'Done',
    cancelled: pageText.statusCancelled || 'Cancelled'
  }

  const { data, isLoading } = useGetMaintenanceIssuesQuery(
    { hotelId, status: statusFilter || undefined, limit: 50 },
    { skip: !hotelId || isFeatureLocked, pollingInterval: 30000 }
  )

  const { data: pendingData } = useGetMaintenancePendingCountQuery(hotelId, {
    skip: !hotelId || isFeatureLocked,
    pollingInterval: 30000
  })

  const { data: pendingOnlyData } = useGetMaintenanceIssuesQuery(
    { hotelId, status: 'pending', limit: 1 },
    { skip: !hotelId || isFeatureLocked, pollingInterval: 30000 }
  )

  const [updateStatus] = useUpdateMaintenanceStatusMutation()

  if (isFeatureLocked) {
    return <FeatureLocked featureName='Maintenance' />
  }

  if (isLoading) {
    return <Loader center />
  }

  const issues: IMaintenanceIssue[] = data?.results ?? []
  const unsolvedCount = pendingData?.count ?? 0
  const pendingOnlyCount = pendingOnlyData?.totalResults ?? 0

  return (
    <Box p={3}>
      <Stack direction='row' justifyContent='space-between' alignItems='center' mb={3}>
        <Badge badgeContent={unsolvedCount || undefined} color='error'>
          <Typography variant='h5' fontWeight={700} sx={{ pr: unsolvedCount ? 1 : 0 }}>
            {pageText.title || 'Maintenance Issues'}
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
                <TableCell>{pageText.colIssue || 'Issue'}</TableCell>
                <TableCell>{pageText.colDescription || 'Description'}</TableCell>
                <TableCell>{pageText.colProof || 'Proof'}</TableCell>
                <TableCell>{pageText.colPhoto || 'Photo'}</TableCell>
                <TableCell>{pageText.colStatus || 'Status'}</TableCell>
                <TableCell>{pageText.colTime || 'Time'}</TableCell>
                <TableCell align='right'>{pageText.colActions || 'Actions'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {issues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align='center' sx={{ py: 4, color: 'text.secondary' }}>
                    {pageText.empty || 'No issues found'}
                  </TableCell>
                </TableRow>
              ) : (
                issues.map(issue => (
                  <TableRow key={issue.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{issue.guestRoomNumber || issue.roomNumber || issue.room}</Typography>
                      {issue.guestRoomNumber && issue.roomNumber && (
                        <Typography variant='caption' color='text.secondary'>
                          {pageText.qrRoomPrefix || 'QR room'} {issue.roomNumber}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction='row' alignItems='center' gap={1}>
                        <span>{TYPE_LABELS[issue.type] ?? 'misc'}</span>
                        <Typography variant='body2' sx={{ textTransform: 'capitalize' }}>
                          {issue.typeLabel || issue.type.replace('_', ' ')}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary' noWrap sx={{ maxWidth: 200 }}>
                        {issue.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction='row' gap={0.5} flexWrap='wrap'>
                        {issue.guestRoomNumber && (
                          <Chip
                            label={`Room ${issue.guestRoomNumber} ${issue.roomNumberStatus === 'matched' ? 'OK' : issue.roomNumberStatus === 'unmatched' ? '!' : '?'}`}
                            color={proofColor(issue.roomNumberStatus)}
                            size='small'
                            variant='outlined'
                          />
                        )}
                        {issue.reservationCode && (
                          <Chip
                            label={`${issue.reservationCode} ${issue.reservationCodeStatus === 'matched' ? 'OK' : '!'}`}
                            color={proofColor(issue.reservationCodeStatus)}
                            size='small'
                            variant='outlined'
                          />
                        )}
                        {!issue.guestRoomNumber && !issue.reservationCode && (
                          <Typography variant='caption' color='text.secondary'>
                            -
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {issue.photo ? (
                        <Tooltip title={pageText.actionViewPhoto || 'View photo'}>
                          <IconButton size='small' onClick={() => setPhotoUrl(resolveAssetUrl(issue.photo!))}>
                            <ImageIcon fontSize='small' color='primary' />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Typography variant='caption' color='text.secondary'>
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusLabels[issue.status] || issue.status.replace('_', ' ')}
                        color={STATUS_COLORS[issue.status]}
                        size='small'
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant='caption' color='text.secondary'>
                        {new Date(issue.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <br />
                        {new Date(issue.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Stack direction='row' justifyContent='flex-end' gap={0.5}>
                        {issue.status === 'pending' && (
                          <Tooltip title={pageText.actionMarkInProgress || 'Mark In Progress'}>
                            <IconButton size='small' color='info' onClick={() => updateStatus({ id: issue.id, status: 'in_progress' })}>
                              <HourglassEmptyIcon fontSize='small' />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(issue.status === 'pending' || issue.status === 'in_progress') && (
                          <>
                            <Tooltip title={pageText.actionMarkDone || 'Mark Done'}>
                              <IconButton size='small' color='success' onClick={() => updateStatus({ id: issue.id, status: 'done' })}>
                                <CheckCircleOutlineIcon fontSize='small' />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={pageText.actionCancel || 'Cancel'}>
                              <IconButton size='small' color='error' onClick={() => updateStatus({ id: issue.id, status: 'cancelled' })}>
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

      <Dialog open={!!photoUrl} onClose={() => setPhotoUrl(null)} maxWidth='md'>
        <DialogContent sx={{ p: 1 }}>
          {photoUrl && <img src={photoUrl} alt={pageText.photoAlt || 'Maintenance photo'} style={{ maxWidth: '100%', display: 'block' }} />}
        </DialogContent>
      </Dialog>
    </Box>
  )
}
