'use client'
import { useState } from 'react'

import {
  Card,
  CardContent,
  Stack,
  Typography,
  Chip,
  Box,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material'

import { toast } from 'react-toastify'

import { useAcceptOrderMutation, useAdvanceOrderMutation, useCancelOrderMutation } from '@/redux/api/ordersApi'
import type { IGuestOrder, OrderStatus } from '@/types'
import { useDictionary } from '@/contexts/DictionaryContext'

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: 'warning' | 'info' | 'primary' | 'success' | 'error' | 'default' }
> = {
  'Awaiting confirmation': { label: 'Awaiting', color: 'warning' },
  Processing: { label: 'Processing', color: 'info' },
  'On the way': { label: 'On the way', color: 'primary' },
  Completed: { label: 'Completed', color: 'success' },
  Cancelled: { label: 'Cancelled', color: 'error' }
}

const NEXT_STATUS: Partial<Record<OrderStatus, string>> = {
  'Awaiting confirmation': 'Accept',
  Processing: 'Mark On the Way',
  'On the way': 'Mark Completed'
}

const ETA_PRESETS = [15, 20, 30, 45]

const normalizeRoom = (value?: string) => value?.trim().toLowerCase() || ''

const getRoomMatchState = (order: IGuestOrder) => {
  if (!order.guestRoomNumber?.trim()) return { label: 'Guest room missing', color: 'default' as const }

  if (normalizeRoom(order.guestRoomNumber) === normalizeRoom(order.roomNumber)) {
    return { label: 'Rooms match', color: 'success' as const }
  }

  return { label: 'Room mismatch', color: 'warning' as const }
}

export default function OrderCard({
  order,
  currency = '€',
  escalated = false
}: {
  order: IGuestOrder
  currency?: string
  escalated?: boolean
}) {
  const dictionary: any = useDictionary()
  const t = dictionary.pages?.orderCard || {}
  const [acceptOrder] = useAcceptOrderMutation()
  const [advanceOrder] = useAdvanceOrderMutation()
  const [cancelOrder] = useCancelOrderMutation()
  const [loading, setLoading] = useState(false)
  const [acceptOpen, setAcceptOpen] = useState(false)
  const [etaPreset, setEtaPreset] = useState<number | null>(20)
  const [customEta, setCustomEta] = useState('')
  const [message, setMessage] = useState('')

  const status = order.status
  const statusConfig = STATUS_CONFIG[status] || { label: status, color: 'default' }
  const total = order.items?.reduce((sum, item) => sum + item.price * item.qty, 0) || 0
  const roomMatch = getRoomMatchState(order)

  const etaValue = etaPreset !== null ? etaPreset : parseInt(customEta) || undefined

  const handleOpenAccept = () => {
    setEtaPreset(20)
    setCustomEta('')
    setMessage('')
    setAcceptOpen(true)
  }

  const handleAccept = async () => {
    setLoading(true)

    try {
      await acceptOrder({ orderId: order.orderId, eta: etaValue, message: message.trim() || undefined }).unwrap()
      toast.success(t.orderAccepted || 'Order accepted')
      setAcceptOpen(false)
    } catch {
      toast.error(t.acceptFailed || 'Failed to accept order')
    }

    setLoading(false)
  }

  const handleAdvance = async () => {
    setLoading(true)

    try {
      await advanceOrder(order.orderId).unwrap()
      toast.success(t.statusUpdated || 'Order status updated')
    } catch {
      toast.error(t.updateFailed || 'Failed to update order')
    }

    setLoading(false)
  }

  const handleCancel = async () => {
    setLoading(true)

    try {
      await cancelOrder({ orderId: order.orderId }).unwrap()
      toast.success(t.orderCancelled || 'Order cancelled')
    } catch {
      toast.error(t.cancelFailed || 'Failed to cancel order')
    }

    setLoading(false)
  }

  return (
    <>
      <Card
        variant='outlined'
        sx={{
          borderColor: status === 'Awaiting confirmation' ? 'warning.main' : 'divider',
          boxShadow: status === 'Awaiting confirmation' ? '0 0 0 2px rgba(255,167,38,0.2)' : 'none'
        }}
      >
        <CardContent>
          <Stack direction='row' alignItems='center' justifyContent='space-between' mb={1.5}>
            <Stack direction='row' alignItems='center' gap={1}>
              <Typography variant='subtitle1' fontWeight={700} color='primary.main'>
                #{order.orderId}
              </Typography>
              <Chip label={`Infiora ${order.roomNumber || 'N/A'}`} size='small' color='primary' variant='tonal' />
              <Chip
                label={`${t.guest || 'Guest'} ${order.guestRoomNumber || t.notProvided || 'Not provided'}`}
                size='small'
                color='secondary'
                variant='tonal'
              />
              <Chip label={roomMatch.label} size='small' color={roomMatch.color as any} variant='outlined' />
              <Chip label={statusConfig.label} size='small' color={statusConfig.color as any} />
              {escalated && <Chip label='Escalated' size='small' color='error' variant='filled' />}
            </Stack>
            <Stack direction='row' alignItems='center' gap={1}>
              <Typography variant='caption' color='text.secondary'>
                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
              <Typography variant='h6' fontWeight={700}>
                {total.toFixed(2)} {currency}
              </Typography>
            </Stack>
          </Stack>

          <Divider sx={{ mb: 1.5 }} />

          <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems='flex-start'>
            <Box flex={1}>
              <Stack gap={0.5}>
                {order.items?.map((item, i) => (
                  <Stack key={i} direction='row' justifyContent='space-between'>
                    <Typography variant='body2'>
                      <span style={{ color: '#9ca3af', marginRight: 6 }}>×{item.qty}</span>
                      {item.name}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {(item.price * item.qty).toFixed(2)} {currency}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
              {order.note && (
                <Typography variant='caption' color='warning.main' mt={1} display='block' fontStyle='italic'>
                  {dictionary.note || 'Note'}: {order.note}
                </Typography>
              )}
              <Stack direction='row' gap={1.5} flexWrap='wrap' mt={1}>
                <Typography variant='caption' color='text.secondary'>
                  {t.infioraSourceRoom || 'Infiora source room'}: <strong>{order.roomNumber || 'N/A'}</strong>
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {t.guestEnteredRoom || 'Guest entered room'}:{' '}
                  <strong>{order.guestRoomNumber || t.notProvided || 'Not provided'}</strong>
                </Typography>
              </Stack>
              {order.guestEmail && (
                <Typography variant='caption' color='text.secondary' mt={0.5} display='block'>
                  {order.guestEmail}
                </Typography>
              )}
              {(order as any).staffMemberId?.name && (
                <Typography variant='caption' color='text.secondary' mt={0.5} display='block'>
                  Handled by: {(order as any).staffMemberId.name}
                </Typography>
              )}
            </Box>

            {(status === 'Awaiting confirmation' || status === 'Processing' || status === 'On the way') && (
              <Stack gap={1} alignItems='flex-end' minWidth={160}>
                {status === 'Awaiting confirmation' ? (
                  <Button
                    variant='contained'
                    size='small'
                    onClick={handleOpenAccept}
                    disabled={loading}
                    fullWidth
                    startIcon={<span>🍴</span>}
                  >
                    {t.acceptOrder || 'Accept Order'}
                  </Button>
                ) : (
                  <Button
                    variant='outlined'
                    color='success'
                    size='small'
                    onClick={handleAdvance}
                    disabled={loading}
                    fullWidth
                  >
                    {NEXT_STATUS[status]}
                  </Button>
                )}
                <Button
                  variant='outlined'
                  color='error'
                  size='small'
                  onClick={handleCancel}
                  disabled={loading}
                  fullWidth
                >
                  {dictionary.cancel}
                </Button>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Accept Dialog */}
      <Dialog open={acceptOpen} onClose={() => setAcceptOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span>🍴</span> {t.acceptOrder || 'Accept Order'}
          <Typography variant='caption' color='text.secondary' ml='auto'>
            #{order.orderId}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack gap={2.5} mt={0.5}>
            {/* Order summary */}
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
                fontWeight={600}
                textTransform='uppercase'
                letterSpacing={0.5}
              >
                {t.orderContents || 'Order contents'}
              </Typography>
              <Box sx={{ mt: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant='body2' color='text.secondary' mb={1}>
                  Infiora room {order.roomNumber || 'N/A'} · Guest room {order.guestRoomNumber || 'Not provided'}
                </Typography>
                <Chip
                  label={roomMatch.label}
                  size='small'
                  color={roomMatch.color as any}
                  variant='outlined'
                  sx={{ mb: 1 }}
                />
                <Stack gap={0.5}>
                  {order.items?.map((item, i) => (
                    <Stack key={i} direction='row' justifyContent='space-between'>
                      <Typography variant='body2'>
                        {item.qty}× {item.name}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {(item.price * item.qty).toFixed(2)} {currency}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Stack direction='row' justifyContent='space-between'>
                  <Typography variant='body2' fontWeight={700}>
                    {t.total || 'Total'}:
                  </Typography>
                  <Typography variant='body2' fontWeight={700}>
                    {total.toFixed(2)} {currency}
                  </Typography>
                </Stack>
              </Box>
            </Box>

            {/* ETA */}
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
                fontWeight={600}
                textTransform='uppercase'
                letterSpacing={0.5}
              >
                {t.estimatedDeliveryTime || 'Estimated delivery time'}
              </Typography>
              <ToggleButtonGroup
                value={etaPreset}
                exclusive
                onChange={(_, v) => {
                  if (v !== null) {
                    setEtaPreset(v)
                    setCustomEta('')
                  }
                }}
                size='small'
                sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}
              >
                {ETA_PRESETS.map(t => (
                  <ToggleButton key={t} value={t} sx={{ minWidth: 64 }}>
                    {t} min
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Stack direction='row' alignItems='center' gap={1} mt={1.5}>
                <Typography variant='caption' color='text.secondary'>
                  {t.custom || 'Custom'}:
                </Typography>
                <TextField
                  type='number'
                  size='small'
                  value={customEta}
                  onChange={e => {
                    setCustomEta(e.target.value)
                    setEtaPreset(null)
                  }}
                  placeholder='--'
                  sx={{ width: 80 }}
                  inputProps={{ min: 1 }}
                />
                <Typography variant='caption' color='text.secondary'>
                  {t.minutes || 'minutes'}
                </Typography>
              </Stack>
            </Box>

            {/* Message */}
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
                fontWeight={600}
                textTransform='uppercase'
                letterSpacing={0.5}
              >
                {t.messageToGuest || 'Message to guest'} ({t.optional || 'optional'})
              </Typography>
              <TextField
                multiline
                rows={2}
                fullWidth
                size='small'
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder='e.g. Your order is being prepared, expect delivery in ~25 minutes...'
                sx={{ mt: 1 }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAcceptOpen(false)} disabled={loading}>
            {dictionary.cancel}
          </Button>
          <Button variant='contained' onClick={handleAccept} disabled={loading} startIcon={<span>✓</span>}>
            {loading ? t.accepting || 'Accepting...' : t.acceptAndNotify || 'Accept & notify guest'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
