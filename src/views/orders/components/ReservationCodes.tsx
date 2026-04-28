'use client'
import { useState } from 'react'

import {
  Stack, Typography, Button, Card, Box, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material'

import { toast } from 'react-toastify'

import { format } from 'date-fns'

import {
  useGetReservationCodesQuery,
  useCreateReservationCodeMutation,
  useUpdateReservationCodeMutation,
  useDeleteReservationCodeMutation
} from '@/redux/api/ordersApi'
import Loader from '@/components/common/Loader'
import { useDictionary } from '@/contexts/DictionaryContext'


import type { IReservationCode } from '@/types'


interface CodeDialogProps {
  open: boolean
  onClose: () => void
  hotelId: string
  code?: IReservationCode | null
}

function CodeDialog({ open, onClose, hotelId, code }: CodeDialogProps) {
  const dictionary: any = useDictionary()
  const t = dictionary.pages?.reservationCodes || {}
  const today = new Date().toISOString().split('T')[0]
  const [guestName, setGuestName] = useState(code?.guestName || '')
  const [codeVal, setCodeVal] = useState(code?.code || '')
  const [checkIn, setCheckIn] = useState(code?.checkIn ? code.checkIn.split('T')[0] : today)
  const [checkOut, setCheckOut] = useState(code?.checkOut ? code.checkOut.split('T')[0] : '')

  const [createCode, { isLoading: creating }] = useCreateReservationCodeMutation()
  const [updateCode, { isLoading: updating }] = useUpdateReservationCodeMutation()
  const loading = creating || updating

  const reset = () => {
    setGuestName(code?.guestName || '')
    setCodeVal(code?.code || '')
    setCheckIn(code?.checkIn ? code.checkIn.split('T')[0] : today)
    setCheckOut(code?.checkOut ? code.checkOut.split('T')[0] : '')
  }

  const handleSave = async () => {
    if (!guestName || !codeVal || !checkIn || !checkOut) {
      toast.error(t.fillAllFields || 'Please fill all fields')
      
return
    }

    try {
      const payload = {
        hotelId,
        guestName,
        code: codeVal.toUpperCase().replace(/\s/g, ''),
        checkIn: new Date(checkIn).toISOString(),
        checkOut: new Date(checkOut).toISOString()
      }

      if (code) {
        await updateCode({ codeId: code.id, ...payload }).unwrap()
        toast.success(t.codeUpdated || 'Code updated')
      } else {
        await createCode(payload as any).unwrap()
        toast.success(t.codeCreated || 'Code created')
      }

      onClose()
    } catch (e: any) {
      toast.error(e?.data?.message || t.saveCodeFailed || 'Failed to save code')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth
      TransitionProps={{ onEnter: () => reset() }}>
      <DialogTitle>{code ? (t.editCode || 'Edit Code') : (t.newReservationCode || 'New Reservation Code')}</DialogTitle>
      <DialogContent>
        <Stack gap={2} mt={1}>
          <Stack gap={0.75}>
            <Typography variant='caption' color='text.secondary' fontWeight={600}>
              {t.guestName || 'Guest Name'}
            </Typography>
            <TextField
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              fullWidth
              autoFocus
              placeholder='e.g. John Smith'
            />
          </Stack>
          <Stack gap={0.75}>
            <Typography variant='caption' color='text.secondary' fontWeight={600}>
              {t.reservationCode || 'Reservation Code'}
            </Typography>
            <TextField
              value={codeVal}
              onChange={e => setCodeVal(e.target.value.toUpperCase().replace(/\s/g, ''))}
              fullWidth
              placeholder='e.g. SMITH2025'
              helperText='Guest enters this when placing an order'
              inputProps={{ style: { fontFamily: 'monospace', letterSpacing: 2, fontSize: 18 } }}
            />
          </Stack>
          <Stack direction='row' gap={1}>
            <Stack gap={0.75} flex={1}>
              <Typography variant='caption' color='text.secondary' fontWeight={600}>
                {t.checkIn || 'Check-in'}
              </Typography>
              <TextField
                type='date'
                value={checkIn}
                onChange={e => setCheckIn(e.target.value)}
                fullWidth
              />
            </Stack>
            <Stack gap={0.75} flex={1}>
              <Typography variant='caption' color='text.secondary' fontWeight={600}>
                {t.checkOut || 'Check-out'}
              </Typography>
              <TextField
                type='date'
                value={checkOut}
                onChange={e => setCheckOut(e.target.value)}
                fullWidth
              />
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>{dictionary.cancel}</Button>
        <Button variant='contained' onClick={handleSave} disabled={loading}>
          {loading ? (t.saving || 'Saving...') : dictionary.save}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function ReservationCodes({ hotelId }: { hotelId: string }) {
  const dictionary: any = useDictionary()
  const t = dictionary.pages?.reservationCodes || {}
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editCode, setEditCode] = useState<IReservationCode | null>(null)

  const { data, isLoading } = useGetReservationCodesQuery(hotelId)
  const [deleteCode] = useDeleteReservationCodeMutation()

  const codesList: IReservationCode[] = Array.isArray(data) ? data : (data as any)?.results || []

  const handleDelete = async (code: IReservationCode) => {
    if (!confirm(`Delete code "${code.code}" for ${code.guestName}?`)) return

    try {
      await deleteCode({ hotelId, codeId: code.id }).unwrap()
      toast.success(t.codeDeleted || 'Code deleted')
    } catch {
      toast.error(t.deleteCodeFailed || 'Failed to delete code')
    }
  }

  const isExpired = (checkOut: string) => new Date(checkOut) < new Date()

  const openNew = () => { setEditCode(null); setDialogOpen(true) }
  const openEdit = (c: IReservationCode) => { setEditCode(c); setDialogOpen(true) }

  return (
    <Stack gap={2}>
      <Stack direction='row' alignItems='center' justifyContent='space-between'>
        <Box>
          <Typography variant='subtitle1' fontWeight={700}>{t.title || 'Reservation Codes'}</Typography>
          <Typography variant='caption' color='text.secondary'>
            {t.subtitle || 'Guests enter their code when ordering. Valid between check-in and check-out dates.'}
          </Typography>
        </Box>
        <Button variant='contained' startIcon={<i className='ri-add-line' />} onClick={openNew}>
          {t.addCode || 'Add Code'}
        </Button>
      </Stack>

      {isLoading ? <Loader /> : (
        <Card variant='outlined'>
          <Box sx={{ display: 'grid', gridTemplateColumns: '130px 1fr 180px 90px 80px', px: 2, py: 1.5, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
            {['Code', 'Guest', 'Stay', 'Status', ''].map(h => (
              <Typography key={h} variant='caption' color='text.secondary' fontWeight={600} textTransform='uppercase' letterSpacing={0.5}>
                {h}
              </Typography>
            ))}
          </Box>

          {codesList.length === 0 ? (
            <Box textAlign='center' py={6}>
              <Typography fontSize={36} mb={1}>🔑</Typography>
              <Typography color='text.secondary'>No codes yet — add your first reservation code</Typography>
            </Box>
          ) : (
            codesList.map((code, idx) => (
              <Box
                key={code.id}
                sx={{
                  display: 'grid', gridTemplateColumns: '130px 1fr 180px 90px 80px',
                  px: 2, py: 1.5, alignItems: 'center',
                  borderBottom: idx < codesList.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  opacity: isExpired(code.checkOut) ? 0.5 : 1
                }}
              >
                <Typography variant='body2' fontWeight={700} fontFamily='monospace' letterSpacing={1} color='primary.main'>
                  {code.code}
                </Typography>
                <Typography variant='body2'>{code.guestName}</Typography>
                <Typography variant='caption' color='text.secondary'>
                  {format(new Date(code.checkIn), 'dd.MM.yyyy')} → {format(new Date(code.checkOut), 'dd.MM.yyyy')}
                </Typography>
                <Chip
                  label={isExpired(code.checkOut) ? (t.expired || 'Expired') : dictionary.active}
                  size='small'
                  color={isExpired(code.checkOut) ? 'default' : 'success'}
                />
                <Stack direction='row' gap={0.5}>
                  <IconButton size='small' onClick={() => openEdit(code)}>
                    <i className='ri-edit-line' style={{ fontSize: 16 }} />
                  </IconButton>
                  <IconButton size='small' color='error' onClick={() => handleDelete(code)}>
                    <i className='ri-delete-bin-line' style={{ fontSize: 16 }} />
                  </IconButton>
                </Stack>
              </Box>
            ))
          )}
        </Card>
      )}

      <CodeDialog open={dialogOpen} onClose={() => setDialogOpen(false)} hotelId={hotelId} code={editCode} />
    </Stack>
  )
}
