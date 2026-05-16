'use client'

import { useEffect } from 'react'

import { useSearchParams } from 'next/navigation'

import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material'

import { toast } from 'react-toastify'

import { useGetStripeStatusQuery, useInitiateStripeOnboardingMutation } from '@/redux/api/ordersApi'

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  pending: 'warning',
  restricted: 'error',
  not_connected: 'default'
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Connected and active',
  pending: 'Onboarding in progress',
  restricted: 'Restricted - action required',
  not_connected: 'Not connected'
}

export default function StripeConnect({ hotelId }: { hotelId: string }) {
  const searchParams = useSearchParams()
  const { data: stripeData, refetch } = useGetStripeStatusQuery(hotelId)
  const [initiateOnboarding, { isLoading }] = useInitiateStripeOnboardingMutation()

  useEffect(() => {
    const stripeParam = searchParams.get('stripe')

    if (stripeParam === 'success') {
      refetch()
      toast.success('Stripe account connected. Activation can take a few minutes.')
    } else if (stripeParam === 'refresh') {
      toast.info('Stripe onboarding was not completed. You can continue setup.')
    }
  }, [searchParams, refetch])

  const handleConnect = async () => {
    try {
      const returnUrl = window.location.href.split('?')[0] || window.location.href
      const { url } = await initiateOnboarding({ hotelId, returnUrl }).unwrap()

      window.location.href = url
    } catch {
      toast.error('Failed to start Stripe onboarding')
    }
  }

  const status = stripeData?.stripeAccountStatus || 'not_connected'

  return (
    <Box>
      <Stack direction='row' alignItems='center' spacing={2} mb={2}>
        <Typography variant='subtitle2'>Stripe Connect</Typography>
        <Chip size='small' label={STATUS_LABELS[status] || status} color={STATUS_COLORS[status] || 'default'} />
      </Stack>

      {status === 'not_connected' && (
        <Alert severity='info' sx={{ mb: 2 }}>
          Connect a Stripe Express account to accept online card payments. Infiora platform fees are deducted
          automatically from each transaction.
        </Alert>
      )}

      {status === 'restricted' && (
        <Alert severity='warning' sx={{ mb: 2 }}>
          Your Stripe account has restrictions. Continue onboarding to restore online payments.
        </Alert>
      )}

      {(status === 'not_connected' || status === 'pending' || status === 'restricted') && (
        <Button variant='contained' onClick={handleConnect} disabled={isLoading}>
          {status === 'not_connected' ? 'Connect Stripe account' : 'Continue Stripe onboarding'}
        </Button>
      )}

      {status === 'active' && (
        <Typography variant='body2' color='text.secondary'>
          Stripe is active. Guests can pay online when online payments are enabled.
        </Typography>
      )}
    </Box>
  )
}
