'use client'

import { useEffect, useState } from 'react'

import { Alert, Box, Button, Card, CardContent, CardHeader, List, ListItem, ListItemText, Stack, Switch, TextField, Typography } from '@mui/material'
import { toast } from 'react-toastify'

import Loader from '@/components/common/Loader'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useGetHotelSecuritySettingsQuery, useUpdateHotelSecuritySettingsMutation } from '@/redux/api/hotelApi'

export default function SecuritySettings() {
  const authUser = useAuthUser()
  const hotelId = (authUser as any)?.hotel?.id as string | undefined
  const { data, isLoading } = useGetHotelSecuritySettingsQuery(hotelId!, { skip: !hotelId })
  const [updateSettings, { isLoading: isSaving }] = useUpdateHotelSecuritySettingsMutation()

  const [trustedDomains, setTrustedDomains] = useState('')
  const [pinSessionHours, setPinSessionHours] = useState(8)
  const [auditLogRetentionDays, setAuditLogRetentionDays] = useState(90)
  const [allowSharedDevices, setAllowSharedDevices] = useState(true)
  const [requireStrongPin, setRequireStrongPin] = useState(true)

  useEffect(() => {
    if (!data) return
    setTrustedDomains((data.trustedDomains || []).join(', '))
    setPinSessionHours(data.pinSessionHours ?? 8)
    setAuditLogRetentionDays(data.auditLogRetentionDays ?? 90)
    setAllowSharedDevices(data.allowSharedDevices ?? true)
    setRequireStrongPin(data.requireStrongPin ?? true)
  }, [data])

  if (!hotelId || isLoading) return <Loader center />

  const handleSave = async () => {
    try {
      await updateSettings({
        hotelId,
        body: {
          trustedDomains: trustedDomains
            .split(',')
            .map(domain => domain.trim())
            .filter(Boolean),
          pinSessionHours,
          auditLogRetentionDays,
          allowSharedDevices,
          requireStrongPin,
        },
      }).unwrap()
      toast.success('Security settings updated.')
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to update security settings.')
    }
  }

  const handleRotate = async () => {
    try {
      await updateSettings({ hotelId, body: { rotateDeviceToken: true } }).unwrap()
      toast.success('Device tokens rotated. Old tablet tokens are now invalid.')
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to rotate device tokens.')
    }
  }

  return (
    <Stack gap={3}>
      <Alert severity='info'>
        Manage PIN session policy, trusted domains, shared-device behavior, and tablet token rotation from one place.
      </Alert>

      <Card variant='outlined'>
        <CardHeader title='Access Policy' />
        <CardContent>
          <Stack gap={2}>
            <Stack gap={0.5}>
              <Typography variant='caption' color='text.secondary' fontWeight={600} sx={{ pl: 0.5 }}>
                Trusted domains
              </Typography>
              <TextField
                value={trustedDomains}
                onChange={event => setTrustedDomains(event.target.value)}
                helperText='Comma-separated domains allowed to embed or launch hotel staff tooling.'
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
              <Stack gap={0.5} flex={1}>
                <Typography variant='caption' color='text.secondary' fontWeight={600} sx={{ pl: 0.5 }}>
                  PIN session hours
                </Typography>
                <TextField
                  type='number'
                  value={pinSessionHours}
                  onChange={event => setPinSessionHours(Number(event.target.value))}
                  helperText='How many hours a staff PIN login stays active before requiring re-entry. E.g. 8 = staff re-PIN once per shift.'
                  fullWidth
                />
              </Stack>
              <Stack gap={0.5} flex={1}>
                <Typography variant='caption' color='text.secondary' fontWeight={600} sx={{ pl: 0.5 }}>
                  Audit retention days
                </Typography>
                <TextField
                  type='number'
                  value={auditLogRetentionDays}
                  onChange={event => setAuditLogRetentionDays(Number(event.target.value))}
                  helperText='How many days audit log entries are kept before being automatically deleted. E.g. 90 = last 3 months.'
                  fullWidth
                />
              </Stack>
            </Stack>
            <Stack direction='row' justifyContent='space-between' alignItems='center'>
              <Typography>Allow shared tablets</Typography>
              <Switch checked={allowSharedDevices} onChange={event => setAllowSharedDevices(event.target.checked)} />
            </Stack>
            <Stack direction='row' justifyContent='space-between' alignItems='center'>
              <Typography>Require strong PIN policy</Typography>
              <Switch checked={requireStrongPin} onChange={event => setRequireStrongPin(event.target.checked)} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
              <Button variant='contained' onClick={handleSave} disabled={isSaving}>
                Save Security Settings
              </Button>
              <Button variant='outlined' color='warning' onClick={handleRotate} disabled={isSaving}>
                Rotate Device Tokens
              </Button>
            </Stack>
            <Typography variant='caption' color='text.secondary'>
              Current tablet token version: {data?.deviceTokenVersion ?? 1}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card variant='outlined'>
        <CardHeader title='Recent Audit Events' />
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ maxHeight: 360, overflowY: 'auto', px: 2, py: 1 }}>
            <List dense disablePadding>
              {(data?.recentAuditLogs || []).length > 0 ? (
                data!.recentAuditLogs!.map((entry: { id: string; summary: string; actorType: string; createdAt: string }) => (
                  <ListItem key={entry.id} disableGutters divider>
                    <ListItemText
                      primary={entry.summary}
                      secondary={`${entry.actorType} · ${new Date(entry.createdAt).toLocaleString()}`}
                    />
                  </ListItem>
                ))
              ) : (
                <Typography color='text.secondary' sx={{ py: 2 }}>No recent audit events.</Typography>
              )}
            </List>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  )
}
