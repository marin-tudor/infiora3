'use client'
import { useState } from 'react'
import {
  Box, Stack, Typography, Button, Card, IconButton, Chip, Switch,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, FormControlLabel,
  CircularProgress, Tooltip
} from '@mui/material'
import { toast } from 'react-toastify'
import { format } from 'date-fns'
import {
  useGetICalSourcesQuery,
  useCreateICalSourceMutation,
  useUpdateICalSourceMutation,
  useDeleteICalSourceMutation,
  useSyncICalSourceMutation,
  useSyncAllICalSourcesMutation,
} from '@/redux/api/ordersApi'
import type { IICalSource, ICalPlatform } from '@/types'

const PLATFORMS: { value: ICalPlatform; label: string; helpUrl: string }[] = [
  { value: 'booking', label: 'Booking.com', helpUrl: 'https://partner.booking.com/en-us/help/reservations/ical-export' },
  { value: 'airbnb', label: 'Airbnb', helpUrl: 'https://www.airbnb.com/help/article/99' },
  { value: 'vrbo', label: 'Vrbo', helpUrl: 'https://help.vrbo.com/en-us/articles/115003986886' },
  { value: 'agoda', label: 'Agoda', helpUrl: 'https://ycs.agoda.com/en-us/help' },
  { value: 'tripadvisor', label: 'TripAdvisor', helpUrl: 'https://www.tripadvisor.com/help' },
  { value: 'custom', label: 'Custom iCal URL', helpUrl: '' },
]

const STATUS_COLOR: Record<string, 'success' | 'error' | 'default'> = {
  success: 'success',
  error: 'error',
}

interface AddDialogProps {
  open: boolean
  onClose: () => void
  hotelId: string
}

function AddDialog({ open, onClose, hotelId }: AddDialogProps) {
  const [platform, setPlatform] = useState<ICalPlatform>('booking')
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [create, { isLoading }] = useCreateICalSourceMutation()

  const selectedPlatform = PLATFORMS.find(p => p.value === platform)!

  const handleSubmit = async () => {
    if (!url.trim()) { toast.error('iCal URL is required'); return }
    try {
      await create({ hotelId, platform, label: label || selectedPlatform.label, url: url.trim(), enabled }).unwrap()
      toast.success('iCal source added')
      onClose()
      setUrl('')
      setLabel('')
    } catch { toast.error('Failed to add iCal source') }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Add iCal Source</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Platform</InputLabel>
            <Select value={platform} label='Platform' onChange={e => setPlatform(e.target.value as ICalPlatform)}>
              {PLATFORMS.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
            </Select>
          </FormControl>
          {platform === 'custom' && (
            <TextField label='Label' value={label} onChange={e => setLabel(e.target.value)} fullWidth />
          )}
          <TextField
            label='iCal URL'
            value={url}
            onChange={e => setUrl(e.target.value)}
            fullWidth
            placeholder='https://...'
            helperText={selectedPlatform.helpUrl
              ? <><a href={selectedPlatform.helpUrl} target='_blank' rel='noreferrer'>Where to find your iCal URL →</a></>
              : undefined}
          />
          <FormControlLabel
            control={<Switch checked={enabled} onChange={e => setEnabled(e.target.checked)} />}
            label='Enable auto-sync'
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant='contained' onClick={handleSubmit} disabled={isLoading}>Add</Button>
      </DialogActions>
    </Dialog>
  )
}

interface Props { hotelId: string }

export default function ICalSources({ hotelId }: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const { data: sources = [], isLoading } = useGetICalSourcesQuery(hotelId)
  const [deleteSource] = useDeleteICalSourceMutation()
  const [updateSource] = useUpdateICalSourceMutation()
  const [syncOne, { isLoading: syncingOne }] = useSyncICalSourceMutation()
  const [syncAll, { isLoading: syncingAll }] = useSyncAllICalSourcesMutation()

  const handleToggle = async (source: IICalSource) => {
    try {
      await updateSource({ hotelId, sourceId: source.id, enabled: !source.enabled }).unwrap()
    } catch { toast.error('Failed to update') }
  }

  const handleDelete = async (sourceId: string) => {
    if (!confirm('Remove this iCal source?')) return
    try {
      await deleteSource({ hotelId, sourceId }).unwrap()
      toast.success('Removed')
    } catch { toast.error('Failed to remove') }
  }

  const handleSync = async (sourceId: string) => {
    try {
      const result = await syncOne({ hotelId, sourceId }).unwrap()
      toast.success(`Synced ${result.synced} reservation codes`)
    } catch { toast.error('Sync failed') }
  }

  const handleSyncAll = async () => {
    try {
      const result = await syncAll(hotelId).unwrap()
      toast.success(`Synced ${result.synced} codes from ${result.sources} sources`)
    } catch { toast.error('Sync all failed') }
  }

  if (isLoading) return null

  return (
    <Box>
      <Stack direction='row' justifyContent='space-between' alignItems='center' mb={2}>
        <Typography variant='subtitle2'>iCal Sync</Typography>
        <Stack direction='row' spacing={1}>
          {sources.length > 0 && (
            <Button size='small' variant='outlined' onClick={handleSyncAll} disabled={syncingAll}>
              {syncingAll ? <CircularProgress size={14} sx={{ mr: 1 }} /> : null}
              Sync all
            </Button>
          )}
          <Button size='small' variant='contained' onClick={() => setAddOpen(true)}>
            Add iCal source
          </Button>
        </Stack>
      </Stack>

      {sources.length === 0 && (
        <Typography variant='body2' color='text.secondary'>
          No iCal sources configured. Add a source to automatically import reservation codes from Booking.com, Airbnb, and other platforms.
        </Typography>
      )}

      <Stack spacing={1}>
        {(sources as IICalSource[]).map((source: IICalSource) => (
          <Card key={source.id} variant='outlined' sx={{ p: 2 }}>
            <Stack direction='row' alignItems='center' spacing={2}>
              <Switch checked={source.enabled} onChange={() => handleToggle(source)} size='small' />
              <Box flex={1}>
                <Typography variant='body2' fontWeight={500}>{source.label}</Typography>
                <Typography variant='caption' color='text.secondary' noWrap sx={{ maxWidth: 300, display: 'block' }}>
                  {source.url}
                </Typography>
                {source.lastSyncAt && (
                  <Stack direction='row' spacing={1} alignItems='center' mt={0.5}>
                    <Chip
                      size='small'
                      label={source.lastSyncStatus === 'success' ? 'OK' : 'Error'}
                      color={STATUS_COLOR[source.lastSyncStatus ?? 'default'] ?? 'default'}
                    />
                    <Typography variant='caption' color='text.secondary'>
                      {format(new Date(source.lastSyncAt), 'dd.MM.yyyy HH:mm')}
                    </Typography>
                    {source.lastSyncError && (
                      <Tooltip title={source.lastSyncError}>
                        <Typography variant='caption' color='error' sx={{ cursor: 'help' }}>⚠</Typography>
                      </Tooltip>
                    )}
                  </Stack>
                )}
              </Box>
              <Button size='small' onClick={() => handleSync(source.id)} disabled={syncingOne}>
                Sync now
              </Button>
              <IconButton size='small' color='error' onClick={() => handleDelete(source.id)}>✕</IconButton>
            </Stack>
          </Card>
        ))}
      </Stack>

      <AddDialog open={addOpen} onClose={() => setAddOpen(false)} hotelId={hotelId} />
    </Box>
  )
}
