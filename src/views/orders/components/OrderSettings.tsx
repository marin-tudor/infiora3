'use client'
import { useEffect, useState } from 'react'

import {
  Stack,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Chip,
  Box,
  Divider
} from '@mui/material'

import { toast } from 'react-toastify'

import { useGetOrderSettingsQuery, useUpdateOrderSettingsMutation } from '@/redux/api/ordersApi'
import Loader from '@/components/common/Loader'
import { useDictionary } from '@/contexts/DictionaryContext'
import ICalSources from './ICalSources'

export default function OrderSettings({ hotelId }: { hotelId: string }) {
  const dictionary: any = useDictionary()
  const t = dictionary.pages?.orderSettings || {}
  const { data: settings, isLoading } = useGetOrderSettingsQuery(hotelId)
  const [updateSettings, { isLoading: saving }] = useUpdateOrderSettingsMutation()

  const [enabled, setEnabled] = useState(false)
  const [availableFrom, setAvailableFrom] = useState('00:00')
  const [availableTo, setAvailableTo] = useState('00:00')
  const [currencySymbol, setCurrencySymbol] = useState('€')
  const [processingLabel, setProcessingLabel] = useState('Processing')
  const [onTheWayLabel, setOnTheWayLabel] = useState('On the way')
  const [completedLabel, setCompletedLabel] = useState('Completed')
  const [emails, setEmails] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState('')
  const [paymentCash, setPaymentCash] = useState(true)
  const [paymentCard, setPaymentCard] = useState(true)
  const [paymentOnline, setPaymentOnline] = useState(false)

  const [venueType, setVenueType] = useState<'hotel' | 'restaurant'>('hotel')
  const [requireCode, setRequireCode] = useState(true)
  const [requireLocation, setRequireLocation] = useState(true)
  const [locationLabel, setLocationLabel] = useState('Room number')
  const [tablePin, setTablePin] = useState('')
  const [kioskMode, setKioskMode] = useState(false)

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled)
      setAvailableFrom(settings.availableFrom || '00:00')
      setAvailableTo(settings.availableTo || '00:00')
      setCurrencySymbol(settings.currencySymbol || '€')
      setProcessingLabel(settings.processingLabel || 'Processing')
      setOnTheWayLabel(settings.onTheWayLabel || 'On the way')
      setCompletedLabel(settings.completedLabel || 'Completed')
      setEmails(settings.emails || [])
      const pm = settings.paymentMethods

      if (pm) {
        setPaymentCash(pm.cash ?? true)
        setPaymentCard(pm.card ?? true)
        setPaymentOnline(pm.online ?? false)
      }

      setVenueType(settings.venueType || 'hotel')
      setRequireCode(settings.requireCode ?? true)
      setRequireLocation(settings.requireLocation ?? true)
      setLocationLabel(settings.locationLabel || 'Room number')
      setTablePin(settings.tablePin || '')
      setKioskMode(settings.kioskMode ?? false)
    }
  }, [settings])

  const handleAddEmail = () => {
    const email = emailInput.trim()

    if (!email || emails.includes(email)) return
    setEmails([...emails, email])
    setEmailInput('')
  }

  const handleSave = async () => {
    try {
      await updateSettings({
        hotelId,
        enabled,
        availableFrom,
        availableTo,
        currencySymbol,
        processingLabel,
        onTheWayLabel,
        completedLabel,
        emails,
        paymentMethods: { cash: paymentCash, card: paymentCard, online: paymentOnline },
        venueType,
        requireCode,
        requireLocation,
        locationLabel,
        tablePin: venueType === 'restaurant' ? tablePin : '',
        kioskMode
      } as any).unwrap()
      toast.success(t.settingsSaved || 'Settings saved')
    } catch {
      toast.error(t.saveFailed || 'Failed to save settings')
    }
  }

  if (isLoading) return <Loader />

  return (
    <Stack gap={3}>
      {/* General */}
      <Card variant='outlined'>
        <CardContent>
          <Typography variant='subtitle1' fontWeight={700} mb={2}>
            {t.general || 'General'}
          </Typography>
          <Stack gap={2}>
            <FormControlLabel
              control={<Switch checked={enabled} onChange={e => setEnabled(e.target.checked)} />}
              label={t.enableOrderingSystem || 'Enable ordering system'}
            />
            <Stack direction='row' gap={2} alignItems='flex-start'>
              <Stack gap={0.5} flex={1}>
                <Typography variant='caption' color='text.secondary' fontWeight={600}>
                  {t.availableFrom || 'Available from'}
                </Typography>
                <TextField
                  type='time'
                  value={availableFrom}
                  onChange={e => setAvailableFrom(e.target.value)}
                  size='small'
                  fullWidth
                />
              </Stack>
              <Stack gap={0.5} flex={1}>
                <Typography variant='caption' color='text.secondary' fontWeight={600}>
                  {t.availableTo || 'Available to'}
                </Typography>
                <TextField
                  type='time'
                  value={availableTo}
                  onChange={e => setAvailableTo(e.target.value)}
                  size='small'
                  fullWidth
                />
              </Stack>
              <Stack gap={0.5} sx={{ maxWidth: 110 }}>
                <Typography variant='caption' color='text.secondary' fontWeight={600}>
                  {t.currency || 'Currency'}
                </Typography>
                <TextField value={currencySymbol} onChange={e => setCurrencySymbol(e.target.value)} size='small' />
              </Stack>
            </Stack>
            <Typography variant='caption' color='text.secondary'>
              Set 00:00–00:00 for always available
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card variant='outlined'>
        <CardContent>
          <Typography variant='subtitle1' fontWeight={700} mb={0.5}>
            {t.paymentMethods || 'Payment Methods'}
          </Typography>
          <Typography variant='caption' color='text.secondary' mb={2} display='block'>
            Enable only the payment methods available at your property
          </Typography>
          <Stack gap={1.5}>
            <FormControlLabel
              control={<Switch checked={paymentCash} onChange={e => setPaymentCash(e.target.checked)} />}
              label={
                <Box>
                  <Typography variant='body2' fontWeight={600}>
                    Cash
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Guest pays in cash on delivery
                  </Typography>
                </Box>
              }
            />
            <Divider />
            <FormControlLabel
              control={<Switch checked={paymentCard} onChange={e => setPaymentCard(e.target.checked)} />}
              label={
                <Box>
                  <Typography variant='body2' fontWeight={600}>
                    Card / POS
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Guest pays by card on a POS terminal
                  </Typography>
                </Box>
              }
            />
            <Divider />
            <FormControlLabel
              control={<Switch checked={paymentOnline} onChange={e => setPaymentOnline(e.target.checked)} />}
              label={
                <Box>
                  <Typography variant='body2' fontWeight={600}>
                    Pay at hotel
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Guest pays at checkout or before leaving
                  </Typography>
                </Box>
              }
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Status Labels */}
      <Card variant='outlined'>
        <CardContent>
          <Typography variant='subtitle1' fontWeight={700} mb={0.5}>
            {t.statusLabels || 'Status Labels'}
          </Typography>
          <Typography variant='caption' color='text.secondary' mb={2} display='block'>
            Customize status names shown to guests
          </Typography>
          <Stack gap={2}>
            <Stack gap={0.5}>
              <Typography variant='caption' color='text.secondary' fontWeight={600}>
                Processing label
              </Typography>
              <TextField
                value={processingLabel}
                onChange={e => setProcessingLabel(e.target.value)}
                fullWidth
                size='small'
              />
            </Stack>
            <Stack gap={0.5}>
              <Typography variant='caption' color='text.secondary' fontWeight={600}>
                On the way label
              </Typography>
              <TextField
                value={onTheWayLabel}
                onChange={e => setOnTheWayLabel(e.target.value)}
                fullWidth
                size='small'
              />
            </Stack>
            <Stack gap={0.5}>
              <Typography variant='caption' color='text.secondary' fontWeight={600}>
                Completed label
              </Typography>
              <TextField
                value={completedLabel}
                onChange={e => setCompletedLabel(e.target.value)}
                fullWidth
                size='small'
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card variant='outlined'>
        <CardContent>
          <Typography variant='subtitle1' fontWeight={700} mb={0.5}>
            {t.emailNotifications || 'Email Notifications'}
          </Typography>
          <Typography variant='caption' color='text.secondary' mb={2} display='block'>
            These addresses receive a notification for every new order
          </Typography>
          <Stack gap={2}>
            <Stack direction='row' gap={1}>
              <TextField
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddEmail()}
                type='email'
                fullWidth
                size='small'
                placeholder='email@example.com'
              />
              <Button variant='outlined' onClick={handleAddEmail} disabled={!emailInput.trim()}>
                Add
              </Button>
            </Stack>
            {emails.length > 0 && (
              <Stack direction='row' gap={1} flexWrap='wrap'>
                {emails.map(email => (
                  <Chip
                    key={email}
                    label={email}
                    onDelete={() => setEmails(emails.filter(e => e !== email))}
                    size='small'
                  />
                ))}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card variant='outlined'>
        <CardContent>
          <Typography variant='h6' gutterBottom>
            {t.venue || 'Venue'}
          </Typography>

          <Stack gap={2}>
            <Box>
              <Typography variant='body2' color='text.secondary' gutterBottom>
                Venue type
              </Typography>
              <Stack direction='row' gap={1}>
                {(['hotel', 'restaurant'] as const).map(type => (
                  <Button
                    key={type}
                    variant={venueType === type ? 'contained' : 'outlined'}
                    size='small'
                    onClick={() => {
                      if (type === venueType) return

                      setVenueType(type)

                      if (type === 'hotel') {
                        setRequireCode(true)
                        setRequireLocation(true)
                        setLocationLabel('Room number')
                      } else {
                        setRequireCode(true)
                        setRequireLocation(false)
                        setLocationLabel('Table number')
                      }
                    }}
                    sx={{ textTransform: 'capitalize' }}
                  >
                    {type === 'hotel' ? '🏨 Hotel' : '🍽 Restaurant'}
                  </Button>
                ))}
              </Stack>
            </Box>

            <Divider />

            <FormControlLabel
              control={<Switch checked={requireCode} onChange={e => setRequireCode(e.target.checked)} />}
              label={venueType === 'hotel' ? 'Require reservation code' : 'Require table PIN'}
            />

            <FormControlLabel
              control={<Switch checked={requireLocation} onChange={e => setRequireLocation(e.target.checked)} />}
              label={venueType === 'hotel' ? 'Require room number' : 'Require table number'}
            />

            <Stack gap={0.5}>
              <Typography variant='caption' color='text.secondary' fontWeight={600}>
                Location field label
              </Typography>
              <TextField
                value={locationLabel}
                onChange={e => setLocationLabel(e.target.value)}
                size='small'
                helperText='Shown to guest at checkout (e.g. "Room number", "Table number")'
              />
            </Stack>

            {venueType === 'restaurant' && requireCode && (
              <Box>
                <Typography variant='body2' color='text.secondary' gutterBottom>
                  Table PIN
                </Typography>
                <Stack direction='row' gap={1} alignItems='center'>
                  <TextField
                    value={tablePin}
                    onChange={e => setTablePin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    size='small'
                    inputProps={{ inputMode: 'numeric', style: { letterSpacing: 6, fontWeight: 700, fontSize: 18 } }}
                    placeholder='0000'
                    sx={{ width: 120 }}
                  />
                  <Button
                    size='small'
                    variant='outlined'
                    onClick={() => setTablePin(String(Math.floor(1000 + Math.random() * 9000)))}
                  >
                    Generate
                  </Button>
                  <Button
                    size='small'
                    variant='outlined'
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(tablePin)
                        toast.success('PIN copied to clipboard')
                      } catch {
                        toast.error('Could not copy — please copy manually')
                      }
                    }}
                    disabled={!tablePin}
                  >
                    Copy
                  </Button>
                </Stack>
                <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5, display: 'block' }}>
                  Print this PIN and place it visibly on each table
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Kiosk Mode */}
      <Card variant='outlined'>
        <CardContent>
          <Typography variant='subtitle1' fontWeight={700} mb={0.5}>
            {t.kioskMode || 'Kiosk Mode'}
          </Typography>
          <Typography variant='caption' color='text.secondary' mb={2} display='block'>
            Hide the back button on the guest ordering page. Use this when tablets are mounted as dedicated ordering
            kiosks so guests cannot navigate away.
          </Typography>
          <FormControlLabel
            control={<Switch checked={kioskMode} onChange={e => setKioskMode(e.target.checked)} />}
            label={
              <Box>
                <Typography variant='body2' fontWeight={600}>
                  Enable kiosk mode
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Back button is hidden from guests
                </Typography>
              </Box>
            }
          />
        </CardContent>
      </Card>

      {/* iCal Sync */}
      <Box>
        <Typography variant='subtitle1' fontWeight={700} mb={2}>
          iCal Sync
        </Typography>
        <ICalSources hotelId={hotelId} />
      </Box>

      <Box>
        <Button variant='contained' onClick={handleSave} disabled={saving}>
          {saving ? t.saving || 'Saving...' : t.saveSettings || 'Save Settings'}
        </Button>
      </Box>
    </Stack>
  )
}
