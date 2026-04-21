'use client'

import { Mail, Lightbulb } from '@mui/icons-material'
import { Box, Button, Card, CardContent, CardHeader, Grid, Stack, Typography } from '@mui/material'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { toast } from 'react-toastify'
import { LoadingButton } from '@mui/lab'

import useDialog from '@/@core/hooks/useDialog'
import EmailDialog from './components/EmailDialog'
import InputField from '@/components/common/InputField'
import { useCreateTicketMutation } from '@/redux/api/ticketApi'
import { useDictionary } from '@/contexts/DictionaryContext'
import { stringRequiredMax255 } from '@/utils/validationSchemas'

const schema = yup.object().shape({
  message: stringRequiredMax255,
})

type FormData = yup.InferType<typeof schema>

const Support = () => {
  const dictionary = useDictionary()
  const emailDialog = useDialog()
  const [createTicket, { isLoading }] = useCreateTicketMutation()

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: yupResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      await createTicket({ ...data, subject: 'Feature Request', category: 'feature' }).unwrap()
      toast.success('Your suggestion has been sent. Thank you!')
      reset()
    } catch (error: any) {
      toast.error(error?.data?.message || error.message)
    }
  }

  return (
    <Stack gap={5}>
      <Typography variant='h4'>{dictionary.pages.support.howCanWeHelp}</Typography>

      <Grid container spacing={3}>
        {/* Contact Us */}
        <Grid item xs={12} md={6}>
          <Card variant='outlined' sx={{ height: '100%' }}>
            <CardHeader
              title={dictionary.pages.support.contactUs}
              subheader={dictionary.pages.support.teamAvailability}
            />
            <CardContent>
              <Stack direction='row' alignItems='center' gap={2}>
                <Mail color='primary' />
                <Stack flex={1}>
                  <Typography fontWeight='bold'>{dictionary.pages.support.emailTeam}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {dictionary.pages.support.averageResponseTime}
                  </Typography>
                </Stack>
                <Button variant='contained' size='small' onClick={emailDialog.open}>
                  {dictionary.sendEmail}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Suggestions */}
        <Grid item xs={12} md={6}>
          <Card variant='outlined' sx={{ height: '100%' }}>
            <CardHeader
              avatar={<Lightbulb color='warning' />}
              title={dictionary.pages.support.requestFeature}
              subheader='Share your ideas and help us improve the platform'
            />
            <CardContent>
              <form noValidate onSubmit={handleSubmit(onSubmit)}>
                <Stack gap={2}>
                  <InputField
                    name='message'
                    label={`${dictionary.message} *`}
                    control={control}
                    errors={errors}
                    multiline
                    minRows={4}
                  />
                  <Box>
                    <LoadingButton loading={isLoading} variant='contained' type='submit' disabled={isLoading}>
                      {dictionary.sendFeedback}
                    </LoadingButton>
                  </Box>
                </Stack>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {emailDialog.isOpen && <EmailDialog onClose={emailDialog.close} />}
    </Stack>
  )
}

export default Support
