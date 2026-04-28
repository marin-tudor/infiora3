'use client'

// Next Imports
import { useState } from 'react'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

// MUI Imports
import Typography from '@mui/material/Typography'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'

// Third-party Imports
import { signIn } from 'next-auth/react'
import classnames from 'classnames'

// Validation imports
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

// Type Imports
import { toast } from 'react-toastify'

import { LoadingButton } from '@mui/lab'

import type { Locale } from '@/configs/i18n'

// Component Imports
import Logo from '@components/layout/shared/Logo'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'

// Util Imports
import { getLocalizedUrl } from '@/utils/i18n'
import InputField from '@/components/common/InputField'
import { useDictionary } from '@/contexts/DictionaryContext'
import { useLoginMutation } from '@/redux/api/authApi'
import { emailValidation, passwordValidation, stringRequired } from '@/utils/validationSchemas'

const schema = yup.object().shape({
  email: emailValidation.clone().concat(stringRequired),
  password: passwordValidation.concat(stringRequired)
})

export type FormData = yup.InferType<typeof schema>

const Login = () => {
  // Hooks
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang: locale } = useParams()
  const { settings } = useSettings()
  const dictionary = useDictionary()

  const [isLoading, setIsLoading] = useState(false)

  const [login] = useLoginMutation()

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({
    resolver: yupResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true)

      const res = await login({
        email: data.email,
        password: data.password
      }).unwrap()

      const signInResult = await signIn('credentials', {
        data: JSON.stringify(res),
        redirect: false
      })

      if (signInResult?.error) {
        throw new Error(signInResult.error)
      }

      if (signInResult?.ok) {
        const redirectURL = searchParams.get('redirectTo') ?? '/'

        router.replace(getLocalizedUrl(redirectURL, locale as Locale))
      }
    } catch (error: any) {
      toast.error(error.data?.message || error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='flex bs-full justify-center'>
      <div
        className={classnames(
          'flex bs-full items-center justify-center flex-1 min-bs-[100dvh] relative p-6 max-md:hidden',
          {
            'border-ie': settings.skin === 'bordered'
          }
        )}
      ></div>
      <div className='flex justify-center items-center bs-full !min-is-full p-6 md:!min-is-[unset] md:p-12 md:is-[480px]'>
        <div className='absolute block-start-5 sm:block-start-[38px] inline-start-6 sm:inline-start-[38px]'>
          <Logo />
        </div>
        <div className='flex flex-col gap-5 is-full sm:is-auto md:is-full sm:max-is-[400px] md:max-is-[unset]'>
          <div>
            <Typography variant='h4'>{`Welcome to ${themeConfig.templateName}!👋🏻`}</Typography>
            <Typography>Please sign-in to your account and start the adventure</Typography>
          </div>

          <form
            noValidate
            action={() => {}}
            autoComplete='off'
            onSubmit={handleSubmit(onSubmit)}
            className='flex flex-col gap-5'
          >
            <InputField control={control} name='email' label={dictionary.email} errors={errors} />
            <InputField control={control} name='password' label={dictionary.password} type='password' errors={errors} />
            <div className='flex justify-between items-center flex-wrap gap-x-3 gap-y-1'>
              <FormControlLabel control={<Checkbox defaultChecked />} label={dictionary.rememberMe} />
              <Typography
                className='text-end'
                color='primary'
                component={Link}
                href={getLocalizedUrl('/forgot-password', locale as Locale)}
              >
                {dictionary.forgotPassword}?
              </Typography>
            </div>
            <LoadingButton fullWidth variant='contained' type='submit' disabled={isLoading} loading={isLoading}>
              {dictionary.login}
            </LoadingButton>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
