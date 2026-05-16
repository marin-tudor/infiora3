import React, { useState } from 'react'

import { Box, Button, Divider, Grid, Stack, Typography, useTheme } from '@mui/material'
import * as yup from 'yup'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { toast } from 'react-toastify'

import { LoadingButton } from '@mui/lab'

import { useUpdateRoomMutation } from '@/redux/api/roomApi'
import { useGetHotelQuery } from '@/redux/api/hotelApi'
import type { ILink, IRoom } from '@/types'
import InputField from '@/components/common/InputField'
import { stringMax255, stringRequiredMax50 } from '@/utils/validationSchemas'
import { useDictionary } from '@/contexts/DictionaryContext'
import RoomPreview from '@/views/shared/RoomPreview'
import { getLockState, isNullOrEmpty } from '@/utils/miscUtils'
import BackgroundSettings from '@/views/shared/BackgroundSettings'
import FontSettings from '@/views/shared/FontSettings'
import ButtonSettings from '@/views/shared/ButtonSettings'

interface RoomDetailTabProps {
  room: IRoom
  links: ILink[]
}

const schema = yup.object().shape({
  number: stringRequiredMax50,
  description: stringMax255
})

export type FormData = yup.InferType<typeof schema>

const RoomDetailTab: React.FC<RoomDetailTabProps> = ({ room, links }) => {
  const dictionary = useDictionary()
  const theme = useTheme()

  const [background, setBackground] = useState(room.background)
  const [font, setFont] = useState(room.font)
  const [button, setButton] = useState(room.button)

  const hotelId =
    (room?.hotel as any)?.id || (room?.hotel as any)?._id || (typeof room?.hotel === 'string' ? room.hotel : undefined)

  const { data: hotelData } = useGetHotelQuery(hotelId, { skip: !hotelId })

  const [updateRoom, { isLoading: isUpdating }] = useUpdateRoomMutation()

  const defaultValues = {
    number: room.number || '',
    description: room.description || ''
  }

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<FormData>({
    defaultValues,
    resolver: yupResolver(schema)
  })

  const watchedValues = watch()

  const onSubmit = async (data: any) => {
    try {
      await updateRoom({
        id: room.id,
        room: { ...data, background, button, font }
      }).unwrap()
      toast.success(dictionary.messages.updateRoomSuccess)
    } catch (error: any) {
      toast.error(error?.data?.message || error.message)
    }
  }

  const handleCancel = () => reset(room)

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} gap={5}>
      <form noValidate autoComplete='off' style={{ flex: 1 }}>
        <Stack gap={0} flex={1} height={{ md: 550 }} sx={{ position: 'relative' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ sm: 'center' }}>
            <Typography variant='h5'>{dictionary.detail}</Typography>
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
              <InputField name='number' label={dictionary.number} control={control} errors={errors} />
            </Grid>
            <Grid item xs={12}>
              <InputField
                lockState={getLockState(!isNullOrEmpty(room.group?.description))}
                name='description'
                label={dictionary.description}
                multiline
                rows={4}
                control={control}
                errors={errors}
              />
            </Grid>
            <Grid item xs={12}>
              <BackgroundSettings
                lockState={getLockState(!isNullOrEmpty(room.group?.background))}
                background={background}
                setBackground={setBackground}
              />
            </Grid>
            <Grid item xs={12}>
              <FontSettings lockState={getLockState(!isNullOrEmpty(room.group?.font))} font={font} setFont={setFont} />
            </Grid>
            <Grid item xs={12}>
              <ButtonSettings
                lockState={getLockState(!isNullOrEmpty(room.group?.button))}
                button={button}
                setButton={setButton}
              />
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
                loading={isUpdating}
                onClick={handleSubmit(onSubmit)}
                variant='contained'
                disabled={isUpdating}
              >
                {dictionary.save}
              </LoadingButton>
            </Stack>
          </Stack>
        </Stack>
      </form>
      <Divider orientation='vertical' flexItem />
      <RoomPreview
        room={{ ...room, ...watchedValues, background, font, button, hotel: hotelData || room.hotel }}
        links={links}
      />
    </Stack>
  )
}

export default RoomDetailTab
