import React, { useState } from 'react'

import { Box, Button, Divider, Grid, Stack, Typography, useTheme } from '@mui/material'
import * as yup from 'yup'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { toast } from 'react-toastify'

import { LoadingButton } from '@mui/lab'

import { useUpdateGroupMutation } from '@/redux/api/groupApi'
import { useGetHotelQuery } from '@/redux/api/hotelApi'
import type { ILink, IGroup } from '@/types'
import InputField from '@/components/common/InputField'
import { stringMax255, stringRequiredMax50 } from '@/utils/validationSchemas'
import { useDictionary } from '@/contexts/DictionaryContext'
import GroupPreview from '@/views/shared/RoomPreview'
import ButtonSettings from '@/views/shared/ButtonSettings'
import FontSettings from '@/views/shared/FontSettings'
import BackgroundSettings from '@/views/shared/BackgroundSettings'

interface GroupDetailTabProps {
  group: IGroup
  links: ILink[]
}

const schema = yup.object().shape({
  title: stringRequiredMax50,
  description: stringMax255
})

export type FormData = yup.InferType<typeof schema>

const GroupDetailTab: React.FC<GroupDetailTabProps> = ({ group, links }) => {
  const dictionary = useDictionary()
  const theme = useTheme()

  const [background, setBackground] = useState(group.background)
  const [font, setFont] = useState(group.font)
  const [button, setButton] = useState(group.button)

  const hotelId =
    (group?.hotel as any)?.id ||
    (group?.hotel as any)?._id ||
    (typeof group?.hotel === 'string' ? group.hotel : undefined)

  const { data: hotelData } = useGetHotelQuery(hotelId, { skip: !hotelId })

  const [updateGroup, { isLoading: isUpdating }] = useUpdateGroupMutation()

  const defaultValues = {
    title: group.title || '',
    description: group.description || ''
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
      await updateGroup({
        id: group.id,
        group: { ...data, background, font, button }
      }).unwrap()
      toast.success(dictionary.messages.updateGroupSuccess)
    } catch (error: any) {
      toast.error(error?.data?.message || error.message)
    }
  }

  const handleCancel = () => reset(group)

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} gap={5}>
      <form noValidate autoComplete='off' style={{ flex: 1 }}>
        <Stack gap={0} flex={1} height={{ md: 550 }} sx={{ position: 'relative' }}>
          <Typography variant='h5'>{dictionary.detail}</Typography>
          <Grid
            container
            spacing={2}
            sx={{
              overflowY: 'auto',
              scrollbarWidth: 'none',
              mt: 2,
              pb: 80
            }}
          >
            <Grid item xs={12}>
              <InputField name='title' label={dictionary.title} control={control} errors={errors} />
            </Grid>
            <Grid item xs={12}>
              <InputField
                name='description'
                label={dictionary.description}
                multiline
                rows={4}
                control={control}
                errors={errors}
              />
            </Grid>
            <Grid item xs={12}>
              <BackgroundSettings background={background} setBackground={setBackground} />
            </Grid>
            <Grid item xs={12}>
              <FontSettings font={font} setFont={setFont} />
            </Grid>
            <Grid item xs={12}>
              <ButtonSettings button={button} setButton={setButton} />
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
      <GroupPreview room={{ ...group, ...watchedValues, background, font, button, hotel: hotelData || group.hotel }} links={links} />
    </Stack>
  )
}

export default GroupDetailTab
