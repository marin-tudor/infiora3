import { createApi } from '@reduxjs/toolkit/query/react'

import customFetchBase from './customFetchBase'
import type { FormData } from '@/views/Login'
import type { IUser } from '@/types'

interface GenericResponse {
  status: string
  message: string
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: customFetchBase,
  endpoints: builder => ({
    login: builder.mutation<IUser, FormData>({
      query(data) {
        return {
          url: '/v1/auth/login',
          method: 'POST',
          body: data
        }
      }
    }),
    verifyEmail: builder.mutation<GenericResponse, string>({
      query(token) {
        return {
          url: '/v1/auth/verify-email',
          method: 'POST',
          params: { token }
        }
      }
    }),
    forgotPassword: builder.mutation<GenericResponse, { email: string }>({
      query(body) {
        return {
          url: `/v1/auth/forgot-password`,
          method: 'POST',
          body
        }
      }
    }),
    resetPassword: builder.mutation<GenericResponse, { resetToken: string; password: string }>({
      query({ resetToken, password }) {
        return {
          url: '/v1/auth/reset-password',
          method: 'POST',
          params: { token: resetToken },
          body: { password }
        }
      }
    })
  })
})

export const { useLoginMutation, useVerifyEmailMutation, useForgotPasswordMutation, useResetPasswordMutation } =
  authApi as any
