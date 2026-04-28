import React from 'react'

import {
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material'
import { toast } from 'react-toastify'

import { RestartAlt } from '@mui/icons-material'

import IconPicker from 'react-icons-picker'

import { useDictionary } from '@/contexts/DictionaryContext'
import { getLockMessage } from '@/utils/miscUtils'
import ColorPicker from '@/components/widgets/ColorPicker'
import ImagePicker from '@/components/widgets/ImagePicker'
import ButtonGroupSelector from '@/components/common/ButtonGroupSelector'
import type { INewsletter } from '@/types'

interface NewsletterFormProps {
  newsletter: INewsletter | null
  setNewsletter: React.Dispatch<React.SetStateAction<INewsletter | null>>
  lockState?: any
}

const NewsletterSettings = ({ newsletter, setNewsletter, lockState }: NewsletterFormProps) => {
  const dictionary = useDictionary()

  const fields = [
    { label: 'Message', key: 'message' },
    { label: 'Success Message', key: 'successMessage' },
    { label: 'Button Text', key: 'buttonText' }
  ] as const

  const renderImagePicker = (type: 'none' | 'icon' | 'url' | 'image') => {
    switch (type) {
      case 'icon':
        return (
          <Stack gap={1}>
            <Typography variant='body2'>{dictionary.icon}</Typography>
            <Stack direction='row' alignItems='center' gap={2}>
              <IconPicker
                value={newsletter?.image || 'TiCancel'}
                onChange={(value: string) => setNewsletter(prev => ({ ...prev, image: value }))}
              />
              {newsletter?.image && (
                <Button color='error' onClick={() => setNewsletter(prev => ({ ...prev, image: undefined }))}>
                  {dictionary.remove}
                </Button>
              )}
            </Stack>
          </Stack>
        )
      case 'image':
        return (
          <ImagePicker
            id='image'
            label={dictionary.image}
            description={dictionary.linkColor}
            image={newsletter?.image}
            setImage={(value: string) => setNewsletter(prev => ({ ...prev, image: value }))}
          />
        )
      case 'url':
        return (
          <TextField
            variant='standard'
            size='small'
            InputLabelProps={{ shrink: true }}
            label={dictionary.imageUrl}
            value={newsletter?.image}
            onChange={e => setNewsletter(prev => ({ ...prev, image: e.target.value }))}
            fullWidth
          />
        )
      default:
        return <></>
    }
  }

  return (
    <Stack position='relative'>
      <Stack direction='row' alignItems='center' justifyContent='space-between'>
        <Stack direction='row' alignItems='center'>
          <Typography variant='body2'>{dictionary.newsletter}</Typography>
          <IconButton onClick={() => setNewsletter(null)} size='small'>
            <RestartAlt />
          </IconButton>
        </Stack>
        <Switch
          checked={newsletter?.isActive}
          onChange={(e, c) => {
            setNewsletter((prev: any) => ({
              ...prev,
              isActive: c
            }))
          }}
        />
      </Stack>
      <Card>
        <CardContent>
          <Stack gap={2}>
            {fields.map(f => (
              <TextField
                key={f.key}
                variant='standard'
                size='small'
                label={f.label}
                InputLabelProps={{ shrink: true }}
                value={newsletter?.[f.key] || ''}
                onChange={e =>
                  setNewsletter(prev => ({
                    ...prev,
                    [f.key]: e.target.value
                  }))
                }
                fullWidth
              />
            ))}
            <Stack gap={1}>
              <Typography variant='body2'>{dictionary.color}</Typography>
              <ColorPicker
                setValue={(value: any) =>
                  setNewsletter((prev: any) => ({
                    ...prev,
                    color: value
                  }))
                }
                value={newsletter?.color}
              />
            </Stack>
            <Stack gap={1}>
              <Typography variant='body2'>{dictionary.type}</Typography>
              <RadioGroup
                row
                value={newsletter?.type}
                onChange={e =>
                  setNewsletter((prev: any) => ({
                    ...prev,
                    type: e.target.value
                  }))
                }
              >
                <FormControlLabel value='button' control={<Radio />} label='Button' />
                <FormControlLabel value='popup' control={<Radio />} label='Popup' />
              </RadioGroup>
            </Stack>
            {newsletter?.type === 'button' && (
              <>
                <Stack gap={1}>
                  <Typography variant='body2'>{dictionary.mainButtonText}</Typography>
                  <TextField
                    variant='standard'
                    size='small'
                    InputLabelProps={{
                      shrink: true
                    }}
                    value={newsletter?.mainButtonText}
                    onChange={e => setNewsletter({ ...newsletter, mainButtonText: e.target.value })}
                    fullWidth
                  />
                </Stack>
                <Stack gap={2}>
                  <Typography variant='body2'>{dictionary.imageType}</Typography>
                  <ButtonGroupSelector
                    options={[
                      { label: 'None', value: 'none' },
                      { label: 'Icon', value: 'icon' },
                      { label: 'Image', value: 'image' },
                      { label: 'URL', value: 'url' }
                    ]}
                    selectedValue={newsletter.imageType || 'none'}
                    onValueChange={newValue => {
                      setNewsletter(prev => ({
                        ...prev,
                        imageType: newValue,
                        image: undefined
                      }))
                    }}
                  />
                  {renderImagePicker(newsletter.imageType || 'none')}
                </Stack>
              </>
            )}
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

export default NewsletterSettings
