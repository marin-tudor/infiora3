import React from 'react'

import { Box, Button, Card, CardContent, IconButton, Stack, Typography } from '@mui/material'

import { toast } from 'react-toastify'

import { RestartAlt } from '@mui/icons-material'

import ColorPicker from '@/components/widgets/ColorPicker'
import { useDictionary } from '@/contexts/DictionaryContext'
import { getLockMessage } from '@/utils/miscUtils'

const ButtonSettings = ({ button, setButton, lockState }: any) => {
  const dictionary = useDictionary()

  return (
    <Stack position='relative'>
      <Stack direction='row' alignItems='center'>
        <Typography variant='body2'>{dictionary.buttons}</Typography>{' '}
        <IconButton onClick={() => setButton(null)} size='small'>
          <RestartAlt />
        </IconButton>
      </Stack>
      <Card>
        <CardContent>
          <Stack gap={2}>
            {['contained', 'outlined'].map(variant => (
              <Stack key={variant} gap={2}>
                <Typography variant='body2'>{variant.charAt(0).toUpperCase() + variant.slice(1)}</Typography>
                <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
                  {[0, 10, 30].map(radius => (
                    <Box
                      key={`${variant}-${radius}`}
                      onClick={() =>
                        setButton((prev: any) => ({
                          ...prev,
                          variant,
                          borderRadius: `${radius}px`
                        }))
                      }
                      sx={{
                        border:
                          button?.variant === variant && button?.borderRadius === `${radius}px`
                            ? '1px solid grey'
                            : '1px solid transparent',
                        padding: 1,
                        borderRadius: 1,
                        flex: 1
                      }}
                    >
                      <Button
                        fullWidth
                        variant={variant as 'contained' | 'outlined'}
                        sx={{ height: '30px', borderRadius: `${radius}px` }}
                      />
                    </Box>
                  ))}
                </Stack>
              </Stack>
            ))}
            <Stack gap={1}>
              <Typography variant='body2'>{dictionary.buttonColor}</Typography>
              <ColorPicker
                setValue={(value: any) =>
                  setButton((prev: any) => ({
                    ...prev,
                    backgroundColor: value
                  }))
                }
                value={button?.backgroundColor}
              />
            </Stack>
            <Stack gap={1}>
              <Typography variant='body2'>{dictionary.buttonTextColor}</Typography>
              <ColorPicker
                setValue={(value: any) =>
                  setButton((prev: any) => ({
                    ...prev,
                    color: value
                  }))
                }
                value={button?.color}
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

export default ButtonSettings
