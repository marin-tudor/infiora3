import { createApi } from '@reduxjs/toolkit/query/react'

import customFetchBase from './customFetchBase'
import type { IUser } from '@/types'

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: customFetchBase,
  tagTypes: ['Users'],
  endpoints: builder => ({
    getMe: builder.query<IUser, null>({
      query() {
        return {
          url: '/v1/users/me'
        }
      }
    }),
    updateUser: builder.mutation<any, { id: string; user: FormData }>({
      query({ id, user }) {
        return {
          url: `/v1/users/${id}`,
          method: 'PATCH',
          body: user
        }
      }
    })
  })
})

export const { useGetMeQuery, useUpdateUserMutation } = userApi as any
