'use client'

import { useEffect, useState } from 'react'

import { Alert, Button, Card, CardContent, CardHeader, Chip, Stack, Switch, Typography } from '@mui/material'
import { toast } from 'react-toastify'

import Loader from '@/components/common/Loader'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useGetHotelPremiumModulesQuery, useUpdateHotelPremiumModulesMutation } from '@/redux/api/hotelApi'
import type { IHotelPremiumModules } from '@/types'

const LABELS: Record<keyof IHotelPremiumModules, string> = {
  analytics: 'Operations analytics',
  automation: 'SLA automation',
  upsells: 'Upsell campaigns',
  multilingualContent: 'Multilingual content',
  auditLogs: 'Staff audit logs',
  integrations: 'Integrations',
}

export default function PremiumModulesSettings() {
  const authUser = useAuthUser()
  const hotelId = (authUser as any)?.hotel?.id as string | undefined
  const { data, isLoading } = useGetHotelPremiumModulesQuery(hotelId!, { skip: !hotelId })
  const [updateModules, { isLoading: isSaving }] = useUpdateHotelPremiumModulesMutation()
  const [form, setForm] = useState<IHotelPremiumModules>({})

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  if (!hotelId || isLoading) return <Loader center />

  const handleSave = async () => {
    try {
      await updateModules({ hotelId, body: form }).unwrap()
      toast.success('Premium modules updated.')
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to update premium modules.')
    }
  }

  return (
    <Stack gap={3}>
      <Alert severity='info'>
        These toggles define which advanced hotel modules are enabled and ready for packaging into paid plans.
      </Alert>

      <Card variant='outlined'>
        <CardHeader title='Premium Modules' />
        <CardContent>
          <Stack gap={2}>
            {(Object.keys(LABELS) as Array<keyof IHotelPremiumModules>).map(key => (
              <Stack key={key} direction='row' justifyContent='space-between' alignItems='center'>
                <Stack gap={0.5}>
                  <Typography fontWeight={600}>{LABELS[key]}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {form[key] ? 'Enabled for this hotel plan.' : 'Disabled until included in the hotel plan.'}
                  </Typography>
                </Stack>
                <Switch
                  checked={Boolean(form[key])}
                  onChange={event => setForm(prev => ({ ...prev, [key]: event.target.checked }))}
                />
              </Stack>
            ))}
            <Button variant='contained' onClick={handleSave} disabled={isSaving}>
              Save Premium Modules
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card variant='outlined'>
        <CardHeader title='Enabled Summary' />
        <CardContent>
          <Stack direction='row' gap={1} flexWrap='wrap'>
            {(Object.keys(LABELS) as Array<keyof IHotelPremiumModules>).map(key => (
              <Chip
                key={key}
                label={`${LABELS[key]}: ${form[key] ? 'on' : 'off'}`}
                color={form[key] ? 'success' : 'default'}
                variant={form[key] ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
