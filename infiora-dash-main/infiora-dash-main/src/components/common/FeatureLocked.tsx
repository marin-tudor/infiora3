'use client'

import { Box, Button, Stack, Typography } from '@mui/material'
import { Lock } from '@mui/icons-material'

import useDialog from '@/@core/hooks/useDialog'
import { useDictionary } from '@/contexts/DictionaryContext'
import RequestFeatureDialog from '@/views/support/components/RequestFeatureDialog'

interface FeatureLockedProps {
  featureName: string
}

export default function FeatureLocked({ featureName }: FeatureLockedProps) {
  const dialog = useDialog()
  const dictionary: any = useDictionary()

  const disabledTitle =
    featureName === 'Orders'
      ? dictionary.orderingDisabledTitle
      : featureName === 'Housekeeping'
        ? dictionary.housekeepingDisabledTitle
        : featureName === 'Maintenance'
          ? dictionary.maintenanceDisabledTitle
          : `${featureName} ${dictionary.featureDisabledSuffix}`

  return (
    <Box display='flex' justifyContent='center' alignItems='center' minHeight='60vh'>
      <Stack alignItems='center' gap={3} textAlign='center' maxWidth={420}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Lock sx={{ fontSize: 40, color: 'text.disabled' }} />
        </Box>
        <Stack gap={1}>
          <Typography variant='h5' fontWeight={600}>
            {disabledTitle}
          </Typography>
          <Typography color='text.secondary' variant='body2'>
            {dictionary.featureDisabledDescription}
          </Typography>
        </Stack>
        <Button variant='contained' onClick={() => dialog.open()}>
          {dictionary.contactSalesperson}
        </Button>
      </Stack>
      {dialog.isOpen && <RequestFeatureDialog onClose={dialog.close} />}
    </Box>
  )
}
