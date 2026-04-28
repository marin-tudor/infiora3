import React, { useEffect, useState } from 'react'

import { IconButton, InputAdornment, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { Email, Phone } from '@mui/icons-material'

type UrlMode = 'web' | 'email' | 'phone'

const PREFIX: Record<UrlMode, string> = {
  web: '',
  email: 'mailto:',
  phone: 'tel:'
}

const PLACEHOLDER: Record<UrlMode, string> = {
  web: 'https://www.example.com',
  email: 'email@hotel.com',
  phone: '+385...'
}

function detectMode(value: string): UrlMode {
  if (value.startsWith('mailto:')) return 'email'
  if (value.startsWith('tel:')) return 'phone'
  return 'web'
}

function stripPrefix(value: string, mode: UrlMode): string {
  const prefix = PREFIX[mode]
  return prefix && value.startsWith(prefix) ? value.slice(prefix.length) : value
}

interface SmartUrlInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  disabled?: boolean
}

const SmartUrlInput: React.FC<SmartUrlInputProps> = ({ value, onChange, label = 'URL', disabled }) => {
  const [mode, setMode] = useState<UrlMode>(() => detectMode(value || ''))
  const [rawValue, setRawValue] = useState(() => stripPrefix(value || '', detectMode(value || '')))

  // Sync inbound value changes (e.g. form reset)
  useEffect(() => {
    const detectedMode = detectMode(value || '')
    const detectedRaw = stripPrefix(value || '', detectedMode)
    if (PREFIX[detectedMode] + detectedRaw !== PREFIX[mode] + rawValue) {
      setMode(detectedMode)
      setRawValue(detectedRaw)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const handleRawChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setRawValue(raw)
    onChange(raw ? PREFIX[mode] + raw : '')
  }

  const switchMode = (next: UrlMode) => {
    const newMode = mode === next ? 'web' : next
    setMode(newMode)
    onChange(rawValue ? PREFIX[newMode] + rawValue : '')
  }

  return (
    <Stack gap={0.5} width='100%'>
      {label && (
        <Typography variant='body2' color='text.secondary' fontWeight={500}>
          {label}
        </Typography>
      )}
      <TextField
        fullWidth
        size='small'
        variant='outlined'
        value={rawValue}
        onChange={handleRawChange}
        disabled={disabled}
        placeholder={PLACEHOLDER[mode]}
        InputProps={{
        endAdornment: (
          <InputAdornment position='end'>
            <Tooltip title='Email (mailto:)'>
              <IconButton
                aria-label='Email (mailto:)'
                size='small'
                onClick={() => switchMode('email')}
                color={mode === 'email' ? 'primary' : 'default'}
                disabled={disabled}
              >
                <Email fontSize='small' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Phone (tel:)'>
              <IconButton
                aria-label='Phone (tel:)'
                size='small'
                onClick={() => switchMode('phone')}
                color={mode === 'phone' ? 'primary' : 'default'}
                disabled={disabled}
              >
                <Phone fontSize='small' />
              </IconButton>
            </Tooltip>
          </InputAdornment>
        )
      }}
    />
    </Stack>
  )
}

export default SmartUrlInput
