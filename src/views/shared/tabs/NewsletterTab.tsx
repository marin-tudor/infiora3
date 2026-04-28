import React from 'react'

import { Box, Button, Card, CardContent, Divider, Grid, Stack, TextField, Typography, useTheme } from '@mui/material'
import * as yup from 'yup'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { toast } from 'react-toastify'

import { LoadingButton } from '@mui/lab'

import IconPicker from 'react-icons-picker'

import { useUpdateRoomMutation } from '@/redux/api/roomApi'
import type { IGroup, ILink, IRoom } from '@/types'
import InputField from '@/components/common/InputField'
import { useDictionary } from '@/contexts/DictionaryContext'
import RoomPreview from '@/views/shared/RoomPreview'
import { stringMax20, stringMax255, stringMax50 } from '@/utils/validationSchemas'
import ImagePicker from '@/components/widgets/ImagePicker'
import ColorPicker from '@/components/widgets/ColorPicker'
import { useUpdateGroupMutation } from '@/redux/api/groupApi'

interface NewsletterTabProps {
  room?: IRoom
  group?: IGroup
  links: ILink[]
}

const schema = yup.object().shape({
  isActive: yup.boolean().default(false),
  message: stringMax255,
  successMessage: stringMax255,
  buttonText: stringMax20,
  mainButtonText: stringMax20,
  type: stringMax50,
  color: stringMax50,
  image: yup.mixed(),
  imageType: yup.string().oneOf(['none', 'image', 'icon', 'url']).default('none')
})

export type FormData = yup.InferType<typeof schema>

const NewsletterTab: React.FC<NewsletterTabProps> = ({ room, group, links }) => {
  const s = room || group
  const dictionary = useDictionary()
  const theme = useTheme()

  const [updateRoom, { isLoading: isUpdatingRoom }] = useUpdateRoomMutation()
  const [updateGroup, { isLoading: isUpdatingGroup }] = useUpdateGroupMutation()

  const defaultValues = {
    isActive: s?.newsletter?.isActive || false,
    message: s?.newsletter?.message || '',
    successMessage: s?.newsletter?.successMessage || '',
    buttonText: s?.newsletter?.buttonText || '',
    mainButtonText: s?.newsletter?.mainButtonText || '',
    type: s?.newsletter?.type || 'popup',
    color: s?.newsletter?.color || '',
    image: s?.newsletter?.image || '',
    imageType: s?.newsletter?.imageType || 'none'
  }

  const {
    reset,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues,
    resolver: yupResolver(schema)
  })

  const watchValues = watch()

  const onSubmit = async (data: FormData) => {
    try {
      if (room) {
        await updateRoom({
          id: room.id,
          room: { newsletter: data }
        }).unwrap()
        toast.success(dictionary.messages.updateRoomSuccess)
      } else if (group) {
        await updateGroup({
          id: group.id,
          group: { newsletter: data }
        }).unwrap()
        toast.success(dictionary.messages.updateGroupSuccess)
      }
    } catch (error: any) {
      toast.error(error?.data?.message || error.message)
    }
  }

  const handleCancel = () => {
    reset(defaultValues)
  }

  const renderImagePicker = () => {
    switch (watchValues.imageType) {
      case 'icon':
        return (
          <Stack gap={1}>
            <Typography variant='body2'>{dictionary.icon}</Typography>
            <Stack direction='row' alignItems='center' gap={2}>
              <IconPicker
                value={watchValues.image || 'TiCancel'}
                onChange={(value: string) => setValue('image', value)}
              />
              {watchValues.image && (
                <Button color='error' onClick={() => setValue('image', '')}>
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
            image={watchValues.image}
            setImage={(value: string) => setValue('image', value)}
          />
        )
      case 'url':
        return (
          <TextField
            variant='standard'
            size='small'
            InputLabelProps={{ shrink: true }}
            label={dictionary.imageUrl}
            value={watchValues.image}
            onChange={e => setValue('image', e.target.value)}
            fullWidth
          />
        )
      default:
        return <></>
    }
  }

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} gap={5}>
      <form noValidate autoComplete='off' style={{ flex: 1 }}>
        <Stack gap={0} flex={1} height={{ md: 550 }} sx={{ position: 'relative' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ sm: 'center' }}>
            <Typography variant='h5'>Newsletter</Typography>
            <InputField name='isActive' type='switch' control={control} errors={errors} />
          </Stack>
          <Grid
            container
            spacing={2}
            sx={{
              overflowY: 'auto',
              scrollbarWidth: 'none',
              mt: 2,
              pb: 20
            }}
          >
            <Grid item xs={12}>
              <InputField
                name='type'
                label='Type'
                type='toggle'
                options={[
                  { value: 'button', label: 'Button' },
                  { value: 'popup', label: 'Popup' }
                ]}
                control={control}
                errors={errors}
              />
            </Grid>
            <Grid item xs={12}>
              <Stack>
                <Typography variant='body2'>{dictionary.popup}</Typography>
                <Card>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <InputField name='message' label='Message' control={control} errors={errors} />
                      </Grid>
                      <Grid item xs={12}>
                        <InputField name='buttonText' label='Button Text' control={control} errors={errors} />
                      </Grid>
                      <Grid item xs={12}>
                        <InputField name='successMessage' label='Success Message' control={control} errors={errors} />
                      </Grid>
                      <Grid item xs={12}>
                        <Stack gap={1}>
                          <Typography variant='body2'>{dictionary.color}</Typography>
                          <ColorPicker
                            setValue={(value: string) => setValue('color', value)}
                            value={watchValues.color || ''}
                          />
                        </Stack>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Stack>
            </Grid>
            {watchValues.type === 'button' && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant='h6' sx={{ mb: 2 }}>
                      Button Settings
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <InputField name='mainButtonText' label='Button Text' control={control} errors={errors} />
                      </Grid>
                      <Grid item xs={12}>
                        <InputField
                          name='imageType'
                          label='Image Type'
                          type='toggle'
                          options={[
                            { label: 'None', value: 'none' },
                            { label: 'Icon', value: 'icon' },
                            { label: 'Image', value: 'image' },
                            { label: 'URL', value: 'url' }
                          ]}
                          control={control}
                          errors={errors}
                        />
                      </Grid>
                      {watchValues.imageType !== 'none' && (
                        <Grid item xs={12}>
                          {renderImagePicker()}
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
          <Stack
            sx={{
              position: 'absolute',
              zIndex: 10,
              bottom: 0,
              width: '100%'
            }}
          >
            <Box
              sx={{
                height: 50,
                width: '100%',
                background: `linear-gradient(transparent, ${theme.palette.background.default})`
              }}
            />
            <Stack direction='row' justifyContent='end' gap={2} sx={{ background: theme.palette.background.default }}>
              <Button variant='outlined' onClick={handleCancel}>
                {dictionary.cancel}
              </Button>
              <LoadingButton
                loading={isUpdatingRoom || isUpdatingGroup}
                onClick={handleSubmit(onSubmit)}
                variant='contained'
                disabled={isUpdatingRoom || isUpdatingGroup}
              >
                {dictionary.save}
              </LoadingButton>
            </Stack>
          </Stack>
        </Stack>
      </form>
      <Divider orientation='vertical' flexItem />
      <RoomPreview room={{ ...s, newsletter: watchValues }} links={links} showNewsletter={true} />
    </Stack>
  )
}

export default NewsletterTab
