import { createApi } from '@reduxjs/toolkit/query/react'

import { setConfig } from '../features/configSlice'
import customFetchBase from './customFetchBase'

export const configApi = createApi({
  reducerPath: 'configApi',
  baseQuery: customFetchBase,
  endpoints: builder => ({
    getConfig: builder.query<any, null>({
      query() {
        return {
          url: '/v1/config'
        }
      },
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          const { data }: any = await queryFulfilled

          dispatch(setConfig(data))
        } catch (error) {}
      }
    })
  })
})

export const { useGetConfigQuery } = configApi as any
