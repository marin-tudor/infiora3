'use client'

import { HelpOutline } from '@mui/icons-material'
import { IconButton, Stack, Tooltip, Typography } from '@mui/material'

type Props = {
  label: string
  helpText: string
}

export default function FormFieldHelp({ label, helpText }: Props) {
  return (
    <Stack direction='row' alignItems='center' gap={0.5}>
      <Typography variant='body2' fontWeight={600}>
        {label}
      </Typography>
      <Tooltip title={helpText} placement='top' arrow>
        <IconButton size='small' sx={{ p: 0.25 }}>
          <HelpOutline fontSize='inherit' />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}
