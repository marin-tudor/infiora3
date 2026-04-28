'use client'

import { useState, useEffect, useCallback } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

interface BlackoutEntry {
  _id: string
  date: string
  itemId?: string
  reason?: string
}

interface Props {
  hotelId: string
  selectedDate: string
  onBlackoutsChange: () => void
}

export default function BlackoutDatesPanel({ hotelId, selectedDate, onBlackoutsChange }: Props) {
  const API = process.env.NEXT_PUBLIC_API_URL ?? ''

  const [blackouts, setBlackouts] = useState<BlackoutEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [formDate, setFormDate] = useState(selectedDate)
  const [formReason, setFormReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Keep formDate in sync when selectedDate changes (but don't overwrite user edits)
  useEffect(() => {
    setFormDate(selectedDate)
  }, [selectedDate])

  const fetchBlackouts = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch from the first day of the month of selectedDate
      const d = new Date(selectedDate)
      const firstDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      const res = await fetch(`${API}/v1/hotels/${hotelId}/bookings/blackout?from=${firstDay}`)
      if (res.ok) {
        const data = await res.json()
        setBlackouts(Array.isArray(data) ? data : [])
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [API, hotelId, selectedDate])

  // Refetch when selectedDate month changes
  useEffect(() => {
    fetchBlackouts()
  }, [fetchBlackouts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formDate) return
    setSubmitting(true)
    try {
      await fetch(`${API}/v1/hotels/${hotelId}/bookings/blackout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: formDate, reason: formReason || undefined }),
      })
      setFormReason('')
      await fetchBlackouts()
      onBlackoutsChange()
    } catch {
      // silently ignore
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (blackoutId: string) => {
    try {
      await fetch(`${API}/v1/hotels/${hotelId}/bookings/blackout/${blackoutId}`, {
        method: 'DELETE',
      })
      await fetchBlackouts()
      onBlackoutsChange()
    } catch {
      // silently ignore
    }
  }

  return (
    <Card variant='outlined' sx={{ mb: 2 }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Typography variant='subtitle2' fontWeight={700} mb={1.5}>
          Manage Blackout Dates
        </Typography>

        {/* Block a Date form */}
        <Stack component='form' onSubmit={handleSubmit} direction='row' spacing={1} alignItems='flex-start' flexWrap='wrap'>
          <TextField
            type='date'
            size='small'
            label='Date'
            value={formDate}
            onChange={e => setFormDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            sx={{ minWidth: 150 }}
          />
          <TextField
            size='small'
            label='Reason (optional)'
            value={formReason}
            onChange={e => setFormReason(e.target.value)}
            sx={{ flex: 1, minWidth: 180 }}
          />
          <Button
            type='submit'
            variant='contained'
            color='warning'
            size='small'
            disabled={submitting || !formDate}
            sx={{ whiteSpace: 'nowrap', alignSelf: 'center' }}
          >
            Block Date
          </Button>
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        {/* Blackout list */}
        {loading ? (
          <Typography variant='body2' color='text.secondary'>Loading…</Typography>
        ) : blackouts.length === 0 ? (
          <Typography variant='body2' color='text.secondary'>No blackout dates set.</Typography>
        ) : (
          <List dense disablePadding>
            {blackouts.map((b, idx) => (
              <>
                <ListItem
                  key={b._id}
                  disablePadding
                  sx={{ py: 0.25 }}
                  secondaryAction={
                    <Tooltip title='Remove blackout'>
                      <IconButton size='small' color='error' edge='end' onClick={() => handleDelete(b._id)}>
                        <i className='ri-delete-bin-line' style={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemText
                    primary={b.date}
                    secondary={b.reason || 'No reason'}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
                {idx < blackouts.length - 1 && <Divider component='li' key={`div-${b._id}`} />}
              </>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  )
}
