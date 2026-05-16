import React from 'react'

import { Box, Button, ButtonGroup, Divider, Grid, Stack, Typography, useTheme } from '@mui/material'
import { LoadingButton } from '@mui/lab'

import * as yup from 'yup'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { toast } from 'react-toastify'

import IconPicker from 'react-icons-picker'

import { useUpdateRoomMutation } from '@/redux/api/roomApi'
import type { IGroup, ILink, IRoom } from '@/types'
import InputField from '@/components/common/InputField'
import { useDictionary } from '@/contexts/DictionaryContext'
import RoomPreview from '@/views/shared/RoomPreview'
import { stringMax20, stringMax255, urlValidation } from '@/utils/validationSchemas'
import { useUpdateGroupMutation } from '@/redux/api/groupApi'
import ColorPicker from '@/components/widgets/ColorPicker'
import ImagePicker from '@/components/widgets/ImagePicker'

interface PopupTabProps {
  room?: IRoom
  group?: IGroup
  links: ILink[]
}

const schema = yup.object().shape({
  isActive: yup.boolean().default(false),
  message: stringMax255,
  buttonText: stringMax20,
  link: urlValidation,
  backgroundColor: stringMax20,
  fontColor: stringMax20,
  size: stringMax20,
  position: stringMax20,
  image: yup.mixed(),
  imageType: yup.string()
})

export type FormData = yup.InferType<typeof schema>

const PopupTab: React.FC<PopupTabProps> = ({ room, group, links }) => {
  const s = room || group
  const dictionary: any = useDictionary()
  const theme = useTheme()

  const [updateRoom, { isLoading: isUpdatingRoom }] = useUpdateRoomMutation()
  const [updateGroup, { isLoading: isUpdatingGroup }] = useUpdateGroupMutation()

  const defaultValues = {
    isActive: s?.popup?.isActive || false,
    message: s?.popup?.message || '',
    buttonText: s?.popup?.buttonText || '',
    link: s?.popup?.link || '',
    backgroundColor: s?.popup?.backgroundColor || '',
    fontColor: s?.popup?.fontColor || '',
    size: s?.popup?.size || 'small',
    position: s?.popup?.position || 'bottom',
    image: s?.popup?.image,
    imageType: s?.popup?.imageType || 'none'
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
      console.log(data)

      if (room) {
        await updateRoom({
          id: room.id,
          room: { popup: data }
        }).unwrap()
        toast.success(dictionary.messages.updateRoomSuccess)
      } else if (group) {
        await updateGroup({
          id: group.id,
          group: { popup: data }
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

  const handleSetImageType = (type: string) => {
    setValue('imageType', type)
    setValue('image', room?.popup?.imageType === type ? room?.popup?.image : undefined)
  }

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} gap={5}>
      <form noValidate autoComplete='off' style={{ flex: 1 }}>
        <Stack gap={0} flex={1} height={{ md: 550 }} sx={{ position: 'relative' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ sm: 'center' }}>
            <Typography variant='h5'>{dictionary.popup}</Typography>
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
              <InputField name='message' label='Message' control={control} errors={errors} />
            </Grid>
            <Grid item xs={12}>
              <InputField name='buttonText' label='Button Text' control={control} errors={errors} />
            </Grid>
            <Grid item xs={12}>
              <InputField name='link' label='Link' type='url' control={control} errors={errors} />
            </Grid>
            <Grid item xs={12}>
              <Stack gap={1}>
                <Typography variant='body2'>{dictionary.backgroundColor}</Typography>
                <ColorPicker
                  setValue={(value: string) => setValue('backgroundColor', value)}
                  value={watchValues.backgroundColor || ''}
                />
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Stack gap={1}>
                <Typography variant='body2'>{dictionary.fontColor}</Typography>
                <ColorPicker
                  setValue={(value: string) => setValue('fontColor', value)}
                  value={watchValues.fontColor || ''}
                />
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <InputField
                name='size'
                label='Size'
                type='toggle'
                options={[
                  { value: 'small', label: 'Card' },
                  { value: 'medium', label: 'Banner' },
                  { value: 'fullscreen', label: 'Full Screen' }
                ]}
                control={control}
                errors={errors}
              />
            </Grid>
            <Grid item xs={12}>
              <InputField
                name='position'
                label='Position'
                type='toggle'
                options={[
                  { value: 'top', label: 'Top' },
                  { value: 'center', label: 'Center' },
                  { value: 'bottom', label: 'Bottom' }
                ]}
                control={control}
                errors={errors}
              />
            </Grid>
            <Grid item xs={12}>
              <Stack gap={2}>
                <Typography variant='body2'>{dictionary.imageType}</Typography>
                <ButtonGroup>
                  {['none', 'icon', 'image', 'url'].map(type => (
                    <Button
                      key={type}
                      variant={watchValues.imageType === type ? 'contained' : 'outlined'}
                      onClick={() => handleSetImageType(type)}
                    >
                      {dictionary[type]}
                    </Button>
                  ))}
                </ButtonGroup>

                {watchValues.imageType === 'icon' && (
                  <Stack gap={1}>
                    <Typography variant='body2'>{dictionary.icon}</Typography>
                    <Stack direction='row' alignItems='center' gap={2}>
                      <IconPicker
                        value={watchValues.image || 'TiCancel'}
                        onChange={(value: any) => setValue('image', value)}
                      />
                      {watchValues.image && (
                        <Button color='error' onClick={() => setValue('image', undefined)}>
                          {dictionary.remove}
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                )}

                {watchValues.imageType === 'image' && (
                  <ImagePicker
                    id='image'
                    label={dictionary.image}
                    description={dictionary.linkImageDescription}
                    image={watchValues.image}
                    setImage={(value: any) => setValue('image', value)}
                  />
                )}

                {watchValues.imageType === 'url' && (
                  <InputField name='image' label={dictionary.imageUrl} control={control} errors={errors} />
                )}
              </Stack>
            </Grid>
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
      <RoomPreview room={{ ...s, popup: watchValues }} links={links} showPopup={true} />
    </Stack>
  )
}

export default PopupTab
