import React, { useState } from 'react'

import { Button, Divider, Grid, Stack, Typography } from '@mui/material'
import { LoadingButton } from '@mui/lab'

import * as yup from 'yup'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { toast } from 'react-toastify'

import { useUpdateRoomMutation } from '@/redux/api/roomApi'
import type { IGroup, ILink, IRoom, ISurvey } from '@/types'
import InputField from '@/components/common/InputField'
import { useDictionary } from '@/contexts/DictionaryContext'
import RoomPreview from '@/views/shared/RoomPreview'
import { emailValidation, urlValidation } from '@/utils/validationSchemas'
import { useUpdateGroupMutation } from '@/redux/api/groupApi'
import SurveyTab from '@/views/shared/tabs/SurveyTab'

interface FeedbackTabProps {
  room?: IRoom
  group?: IGroup
  links: ILink[]
}

const schema = yup.object().shape({
  isActive: yup.boolean().default(false),
  emailRequirement: yup.string().oneOf(['none', 'optional', 'mandatory']).default('none'),
  textRequirement: yup.string().oneOf(['none', 'optional', 'mandatory']).default('none'),
  emails: yup.array().of(emailValidation).default([]),
  googleMapsLink: urlValidation
})

export type FormData = yup.InferType<typeof schema>

const FeedbackTab: React.FC<FeedbackTabProps> = ({ room, group, links }) => {
  const s = room || group
  const dictionary = useDictionary()
  const [updateRoom, { isLoading: isUpdatingRoom }] = useUpdateRoomMutation()
  const [updateGroup, { isLoading: isUpdatingGroup }] = useUpdateGroupMutation()

  const defaultValues = {
    isActive: s?.feedback?.isActive || false,
    emailRequirement: s?.feedback?.emailRequirement || 'none',
    textRequirement: s?.feedback?.textRequirement || 'none',
    emails: s?.feedback?.emails || [],
    googleMapsLink: s?.feedback?.googleMapsLink || ''
  }

  const {
    reset,
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues,
    resolver: yupResolver(schema)
  })

  const watchValues = watch()

  // Live survey state for combined preview
  const [liveSurvey, setLiveSurvey] = useState<ISurvey>(s?.survey ?? { isActive: false, type: 'popup', questions: [] })

  const onSubmit = async (data: FormData) => {
    try {
      if (room) {
        await updateRoom({
          id: room.id,
          room: { feedback: data }
        }).unwrap()
        toast.success(dictionary.messages.updateRoomSuccess)
      } else if (group) {
        await updateGroup({
          id: group.id,
          group: { feedback: data }
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

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} gap={5}>
      {/* Left column: both forms stacked */}
      <Stack
        gap={0}
        flex={1}
        height={{ md: 550 }}
        sx={{ position: 'relative', overflowY: 'auto', scrollbarWidth: 'none' }}
      >
        {/* Section 1: Leave a review pop-up */}
        <form noValidate autoComplete='off'>
          <Stack gap={2} pb={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ sm: 'center' }}>
              <Typography variant='h5'>Leave a review pop-up</Typography>
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <InputField
                  name='isActive'
                  label='Enable "Leave a review" pop-up'
                  type='switch'
                  control={control}
                  errors={errors}
                />
              </Grid>
              <Grid item xs={12}>
                <InputField
                  name='emailRequirement'
                  label='Ask for Email in Feedback'
                  type='toggle'
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'optional', label: 'Optional' },
                    { value: 'mandatory', label: 'Mandatory' }
                  ]}
                  control={control}
                  errors={errors}
                />
              </Grid>
              <Grid item xs={12}>
                <InputField
                  name='textRequirement'
                  label='Ask for Text Feedback'
                  type='toggle'
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'optional', label: 'Optional' },
                    { value: 'mandatory', label: 'Mandatory' }
                  ]}
                  control={control}
                  errors={errors}
                />
              </Grid>
              <Grid item xs={12}>
                <InputField
                  name='emails'
                  label='Email addresses for review notifications'
                  type='multitext'
                  control={control}
                  errors={errors}
                />
              </Grid>
              <Grid item xs={12}>
                <InputField
                  name='googleMapsLink'
                  label='Google Maps Review Link'
                  placeholder='https://maps.google.com/...'
                  control={control}
                  errors={errors}
                />
              </Grid>
            </Grid>
            <Stack direction='row' justifyContent='end' gap={2}>
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
        </form>

        <Divider sx={{ my: 3 }} />

        {/* Section 2: Custom Feedback Form */}
        <SurveyTab room={room} group={group} links={links} noPreview onSurveyChange={setLiveSurvey} />
      </Stack>

      <Divider orientation='vertical' flexItem />

      {/* Right column: ONE shared preview */}
      <RoomPreview room={{ ...s, feedback: watchValues, survey: liveSurvey }} links={links} showFeedback={true} />
    </Stack>
  )
}

export default FeedbackTab
