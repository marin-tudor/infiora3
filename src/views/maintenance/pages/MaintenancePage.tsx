'use client'

import { useState } from 'react'

import {
  Badge,
  Box,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
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
import ImageIcon from '@mui/icons-material/Image'

import Loader from '@/components/common/Loader'
import FeatureLocked from '@/components/common/FeatureLocked'
import { useDictionary } from '@/contexts/DictionaryContext'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useGetHotelQuery } from '@/redux/api/hotelApi'
import {
  useGetMaintenanceIssuesQuery,
  useGetMaintenancePendingCountQuery,
  useUpdateMaintenanceStatusMutation,
  type IMaintenanceIssue,
} from '@/redux/api/maintenanceApi'

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  pending: 'warning',
  in_progress: 'info',
  done: 'success',
  cancelled: 'error',
}

const reservationCodeColor = (status?: string): 'default' | 'success' | 'warning' =>
  status === 'matched' ? 'success' : status === 'unmatched' ? 'warning' : 'default'

const TYPE_ICONS: Record<string, string> = {
  ac: 'âť„ď¸Ź',
  plumbing: 'đźšż',
  electrical: 'âšˇ',
  tv: 'đź“ş',
  wifi: 'đź“¶',
  furniture: 'đźŞ‘',
  other: 'đź”§',
}

export default function MaintenancePage() {
  const dictionary: any = useDictionary()
  const t = dictionary.pages?.maintenance || {}
  const authUser = useAuthUser()
  const hotelId = (authUser as any)?.hotel?.id
  const { data: liveHotel } = useGetHotelQuery(hotelId!, { skip: !hotelId })
  const [statusFilter, setStatusFilter] = useState('pending')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  const hotelFeatures = ((liveHotel as any) ?? (authUser as any)?.hotel)?.features
  const isFeatureLocked = hotelFeatures?.maintenanceEnabled === false

  const statusLabels: Record<string, string> = {
    '': t.statusAll || 'All',
    pending: t.statusPending || 'Pending',
    in_progress: t.statusInProgress || 'In Progress',
    done: t.statusDone || 'Done',
    cancelled: t.statusCancelled || 'Cancelled',
  }

  const { data, isLoading } = useGetMaintenanceIssuesQuery(
    { hotelId, status: statusFilter || undefined, limit: 50 },
    { skip: !hotelId || isFeatureLocked, pollingInterval: 30000 }
  )

  const { data: pendingData } = useGetMaintenancePendingCountQuery(hotelId, {
    skip: !hotelId || isFeatureLocked,
    pollingInterval: 30000,
  })

  const { data: pendingOnlyData } = useGetMaintenanceIssuesQuery(
    { hotelId, status: 'pending', limit: 1 },
    { skip: !hotelId || isFeatureLocked, pollingInterval: 30000 }
  )

  const [updateStatus] = useUpdateMaintenanceStatusMutation()

  const handleStatus = async (id: string, status: string) => {
    await updateStatus({ id, status })
  }

  if (isFeatureLocked) {
    return <FeatureLocked featureName='Maintenance' />
  }

  if (isLoading) return <Loader center />

  const issues: IMaintenanceIssue[] = data?.results ?? []
  const unsolvedCount = pendingData?.count ?? 0
  const pendingOnlyCount = pendingOnlyData?.totalResults ?? 0

  return (
    <Box p={3}>
      <Stack direction='row' justifyContent='space-between' alignItems='center' mb={3}>
        <Badge badgeContent={unsolvedCount || undefined} color='error'>
          <Typography variant='h5' fontWeight={700} sx={{ pr: unsolvedCount ? 1 : 0 }}>
            {t.title || 'Maintenance Issues'}
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
                <TableCell>{t.colIssue || 'Issue'}</TableCell>
                <TableCell>{t.colDescription || 'Description'}</TableCell>
                <TableCell>{t.colProof || 'Proof'}</TableCell>
                <TableCell>{t.colPhoto || 'Photo'}</TableCell>
                <TableCell>{t.colStatus || 'Status'}</TableCell>
                <TableCell>{t.colTime || 'Time'}</TableCell>
                <TableCell align='right'>{t.colActions || 'Actions'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {issues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align='center' sx={{ py: 4, color: 'text.secondary' }}>
                    {t.empty || 'No issues found'}
                  </TableCell>
                </TableRow>
              ) : (
                issues.map(issue => (
                  <TableRow key={issue.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{issue.guestRoomNumber || issue.roomNumber || issue.room}</Typography>
                      {issue.guestRoomNumber && issue.roomNumber && (
                        <Typography variant='caption' color='text.secondary'>
                          {(t.qrRoomPrefix || 'QR room')} {issue.roomNumber}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction='row' alignItems='center' gap={1}>
                        <span>{TYPE_ICONS[issue.type] ?? 'đź”§'}</span>
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
                      {issue.reservationCode ? (
                        <Chip
                          label={`${issue.reservationCode} ${issue.reservationCodeStatus === 'matched' ? 'âś“' : '!'}`}
                          color={reservationCodeColor(issue.reservationCodeStatus)}
                          size='small'
                          variant='outlined'
                        />
                      ) : (
                        <Typography variant='caption' color='text.secondary'>Ă˘â‚¬â€ť</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {issue.photo ? (
                        <Tooltip title={t.actionViewPhoto || 'View photo'}>
                          <IconButton size='small' onClick={() => setPhotoUrl(issue.photo!)}>
                            <ImageIcon fontSize='small' color='primary' />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Typography variant='caption' color='text.secondary'>â€”</Typography>
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
                          <Tooltip title={t.actionMarkInProgress || 'Mark In Progress'}>
                            <IconButton size='small' color='info' onClick={() => handleStatus(issue.id, 'in_progress')}>
                              <HourglassEmptyIcon fontSize='small' />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(issue.status === 'pending' || issue.status === 'in_progress') && (
                          <>
                            <Tooltip title={t.actionMarkDone || 'Mark Done'}>
                              <IconButton size='small' color='success' onClick={() => handleStatus(issue.id, 'done')}>
                                <CheckCircleOutlineIcon fontSize='small' />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t.actionCancel || 'Cancel'}>
                              <IconButton size='small' color='error' onClick={() => handleStatus(issue.id, 'cancelled')}>
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
          {photoUrl && (
            <img src={photoUrl} alt={t.photoAlt || 'Maintenance photo'} style={{ maxWidth: '100%', display: 'block' }} />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  )
}
