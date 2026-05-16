// React imports
import React from 'react'

// MUI imports
import { Button, Dialog, DialogActions, DialogContent, IconButton, Stack, Typography } from '@mui/material'
import { Close } from '@mui/icons-material'

// Validation imports
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

// Other imports
import { toast } from 'react-toastify'

// Custom imports
import { LoadingButton } from '@mui/lab'

import { stringRequiredMax255 } from '@/utils/validationSchemas'
import InputField from '@/components/common/InputField'
import { useCreateTicketMutation } from '@/redux/api/ticketApi'
import { useDictionary } from '@/contexts/DictionaryContext'

interface RequestFeatureDialogProps {
  onClose: any
}

const schema = yup.object().shape({
  message: stringRequiredMax255
})

export type FormData = yup.InferType<typeof schema>

const RequestFeatureDialog: React.FC<RequestFeatureDialogProps> = ({ onClose }) => {
  const dictionary = useDictionary()
  const t: any = dictionary.pages?.support || {}
  const [createTicket, { isLoading }] = useCreateTicketMutation()

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({
    resolver: yupResolver(schema)
  })

  const onSubmit = async (data: any) => {
    try {
      await createTicket({ ...data, subject: 'Feature Request', category: 'feature' }).unwrap()
      toast.success(t.requestSent || 'Your request has been sent successfully.')
      handleCancel()
    } catch (error: any) {
      toast.error(error?.data?.message || error.message)
    }
  }

  const handleCancel = () => {
    reset()
    onClose()
  }

  return (
    <Dialog fullWidth open={true} maxWidth='sm' scroll='paper' onClose={handleCancel}>
      <form noValidate autoComplete='off' onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <IconButton sx={{ position: 'absolute', top: 0, right: 0, padding: 5 }} onClick={handleCancel}>
            <Close />
          </IconButton>
          <Stack gap={2}>
            <Typography variant='h5'>{dictionary.dialogs.requestFeature.title}</Typography>
            <Typography variant='body1'>{dictionary.dialogs.requestFeature.message}</Typography>
            <InputField
              name='message'
              label={dictionary.message + ' *'}
              control={control}
              errors={errors}
              multiline
              minRows={5}
              style={{ marginTop: 5 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant='outlined' onClick={handleCancel}>
            {dictionary.cancel}
          </Button>
          <LoadingButton loading={isLoading} variant='contained' type='submit' autoFocus disabled={isLoading}>
            {dictionary.sendFeedback}
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default RequestFeatureDialog
