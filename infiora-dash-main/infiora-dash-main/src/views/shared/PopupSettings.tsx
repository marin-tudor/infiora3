import React from 'react'

import { Box, Card, CardContent, IconButton, Stack, Switch, TextField, Typography } from '@mui/material'
import { toast } from 'react-toastify'

import { RestartAlt } from '@mui/icons-material'

import { useDictionary } from '@/contexts/DictionaryContext'
import { getLockMessage } from '@/utils/miscUtils'
import ColorPicker from '@/components/widgets/ColorPicker'

const PopupSettings = ({ popup, setPopup, lockState }: any) => {
  const dictionary = useDictionary()

  return (
    <Stack position='relative'>
      <Stack direction='row' alignItems='center' justifyContent='space-between'>
        <Stack direction='row' alignItems='center'>
          <Typography variant='body2'>{dictionary.popup}</Typography>
          <IconButton onClick={() => setPopup(null)} size='small'>
            <RestartAlt />
          </IconButton>
        </Stack>
        <Switch
          checked={popup?.isActive}
          onChange={(e, c) => {
            setPopup((prev: any) => ({
              ...prev,
              isActive: c
            }))
          }}
        />
      </Stack>
      <Card>
        <CardContent>
          <Stack gap={2}>
            {[
              { label: 'Message', key: 'message' },
              { label: 'Button Text', key: 'buttonText' },
              { label: 'Link', key: 'link' }
            ].map(f => (
              <TextField
                variant='standard'
                size='small'
                InputLabelProps={{
                  shrink: true
                }}
                key={f.key}
                label={f.label}
                value={popup?.[f.key] || ''}
                onChange={e => setPopup({ ...popup, [f.key]: e.target.value })}
                fullWidth
              />
            ))}
            <Stack gap={1}>
              <Typography variant='body2'>{dictionary.color}</Typography>
              <ColorPicker
                setValue={(value: any) =>
                  setPopup((prev: any) => ({
                    ...prev,
                    color: value
                  }))
                }
                value={popup?.color}
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>
      {!!lockState && (
        <Box
          onClick={() => toast.info(getLockMessage(dictionary, lockState))}
          sx={{ position: 'absolute', zIndex: 10, top: 0, right: 0, bottom: 0, left: 0 }}
        />
      )}
    </Stack>
  )
}

export default PopupSettings
