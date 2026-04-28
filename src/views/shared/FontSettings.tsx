import React from 'react'

import { Box, Stack, Typography, MenuItem, Select, IconButton, Card, CardContent } from '@mui/material'

import { toast } from 'react-toastify'

import { RestartAlt } from '@mui/icons-material'

import ColorPicker from '@/components/widgets/ColorPicker'
import { useDictionary } from '@/contexts/DictionaryContext'
import { getLockMessage } from '@/utils/miscUtils'

const FontSettings = ({ font, setFont, lockState }: any) => {
  const dictionary = useDictionary()

  const fonts = [
    { name: 'Arial', value: 'Arial' },
    { name: 'Roboto', value: 'Roboto' },
    { name: 'Times New Roman', value: 'Times New Roman' },
    { name: 'Verdana', value: 'Verdana' },
    { name: 'Georgia', value: 'Georgia' },
    { name: 'Helvetica', value: 'Helvetica' },
    { name: 'Montserrat', value: 'Montserrat' }
  ]

  return (
    <Stack position='relative'>
      <Stack direction='row' alignItems='center'>
        <Typography variant='body2'>{dictionary.fonts}</Typography>{' '}
        <IconButton onClick={() => setFont(null)} size='small'>
          <RestartAlt />
        </IconButton>
      </Stack>
      <Card>
        <CardContent>
          <Stack gap={2}>
            <Stack gap={1}>
              <Typography variant='body2'>{dictionary.fontFamily}</Typography>
              <Select
                size='small'
                value={font?.family || ''}
                onChange={e =>
                  setFont((prev: any) => ({
                    ...prev,
                    family: e.target.value
                  }))
                }
                displayEmpty
                fullWidth
              >
                <MenuItem value='' disabled>
                  {dictionary.selectFont}
                </MenuItem>
                {fonts.map(font => (
                  <MenuItem key={font.name} value={font.value} sx={{ fontFamily: font.value }}>
                    {font.name}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
            <Stack gap={1}>
              <Typography variant='body2'>{dictionary.fontColor}</Typography>
              <ColorPicker
                setValue={(value: any) =>
                  setFont((prev: any) => ({
                    ...prev,
                    color: value
                  }))
                }
                value={font?.color}
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>
      {!!lockState && (
        <Box
          onClick={() => {
            toast.info(getLockMessage(dictionary, lockState))
          }}
          sx={{ position: 'absolute', zIndex: 10, top: 0, right: 0, bottom: 0, left: 0 }}
        />
      )}
    </Stack>
  )
}

export default FontSettings
