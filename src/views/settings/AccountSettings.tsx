'use client'

import { Button, Card, CardContent, Stack, Typography } from '@mui/material'
import * as yup from 'yup'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { toast } from 'react-toastify'
import { useSession } from 'next-auth/react'

import { emailValidation, passwordValidation, stringRequired, stringRequiredMax50 } from '@/utils/validationSchemas'
import InputField from '@/components/common/InputField'
import Loader from '@/components/common/Loader'
import { useUpdateUserMutation } from '@/redux/api/userApi'
import { useDictionary } from '@/contexts/DictionaryContext'
import { isNullOrEmpty } from '@/utils/miscUtils'

const schema = yup.object().shape({
  name: stringRequiredMax50,
  email: emailValidation.clone().concat(stringRequired),
  password: passwordValidation,
  language: stringRequired
})

export type FormData = yup.InferType<typeof schema>

const AccountSettings = ({ authUser }: any) => {
  const dictionary = useDictionary()
  const { update } = useSession()

  const [updateUser, { isLoading }] = useUpdateUserMutation()

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      name: authUser.name || '',
      email: authUser.email || '',
      language: authUser.language || 'hr'
    },
    resolver: yupResolver(schema)
  })

  const onSubmit = async (data: any) => {
    try {
      if (isNullOrEmpty(data.password)) delete data.password
      const user = await updateUser({ id: authUser.id, user: data }).unwrap()

      await update(user)
      toast.success(dictionary.messages.updateUserSuccess)
    } catch (error: any) {
      toast.error(error?.data?.message || error.message)
    }
  }

  const handleCancel = () => {
    reset({ email: authUser.email || '' })
  }

  return (
    <Card>
      <CardContent>
        <form noValidate autoComplete='off' onSubmit={handleSubmit(onSubmit)} style={{ flex: 1 }}>
          <Stack gap={5} sx={{ maxWidth: { md: '50%' }, minHeight: '80vh', margin: 'auto' }}>
            <Typography variant='h4'>{dictionary.accountSettings}</Typography>
            <Stack gap={4}>
              <InputField name='name' label={dictionary.name} control={control} errors={errors} />
              <InputField name='email' label={dictionary.email} control={control} errors={errors} />
              <InputField name='password' label={dictionary.password} control={control} errors={errors} />
              <InputField
                name='language'
                label={dictionary.language}
                type='select'
                options={[
                  { label: 'English', value: 'en' },
                  { label: 'Croatian', value: 'hr' }
                ]}
                control={control}
                errors={errors}
              />
            </Stack>
            <Stack direction='row' gap={2} sx={{ ml: 'auto' }}>
              <Button variant='outlined' color='secondary' onClick={handleCancel}>
                {dictionary.cancel}
              </Button>
              <Button type='submit' variant='contained' disabled={isLoading}>
                {isLoading ? <Loader /> : dictionary.save}
              </Button>
            </Stack>
          </Stack>
        </form>
      </CardContent>
    </Card>
  )
}

export default AccountSettings
