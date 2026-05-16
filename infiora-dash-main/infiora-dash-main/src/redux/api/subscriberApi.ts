import { createApi } from '@reduxjs/toolkit/query/react'

import customFetchBase from './customFetchBase'
import type { GenericResultResponse, ISubscriber } from '@/types'

export const subscriberApi = createApi({
  reducerPath: 'subscriberApi',
  baseQuery: customFetchBase,
  tagTypes: ['Subscribers'],
  endpoints: builder => ({
    getSubscriber: builder.query<ISubscriber, string>({
      query(id) {
        return {
          url: `/v1/subscribers/${id}`,
          credentials: 'include'
        }
      },
      providesTags: (_result, _error, id) => [{ type: 'Subscribers', id }]
    }),
    getSubscribers: builder.query<
      GenericResultResponse<ISubscriber>,
      { user?: string; search: string; page?: number; limit?: number }
    >({
      query(params) {
        return {
          url: `/v1/subscribers`,
          params,
          credentials: 'include'
        }
      },
      providesTags: result =>
        result
          ? [
              ...result.results.map(({ id }) => ({
                type: 'Subscribers' as const,
                id
              })),
              { type: 'Subscribers', id: 'LIST' }
            ]
          : [{ type: 'Subscribers', id: 'LIST' }]
    }),
    updateSubscriber: builder.mutation<ISubscriber, { id: string; subscriber: FormData }>({
      query({ id, subscriber }) {
        return {
          url: `/v1/subscribers/${id}`,
          method: 'PATCH',
          credentials: 'include',
          body: subscriber
        }
      },
      invalidatesTags: (result, _error, { id }) =>
        result
          ? [
              { type: 'Subscribers', id },
              { type: 'Subscribers', id: 'LIST' }
            ]
          : [{ type: 'Subscribers', id: 'LIST' }]
    }),
    deleteSubscriber: builder.mutation<ISubscriber, string>({
      query(id) {
        return {
          url: `/v1/subscribers/${id}`,
          method: 'Delete',
          credentials: 'include'
        }
      },
      invalidatesTags: [{ type: 'Subscribers', id: 'LIST' }]
    }),
    exportSubscribers: builder.query<string, { role: string }>({
      query(params) {
        return {
          url: `/v1/subscribers/export`,
          method: 'GET',
          params,
          credentials: 'include',
          responseHandler: 'text'
        }
      }
    })
  })
})

export const {
  useGetSubscriberQuery,
  useGetSubscribersQuery,
  useUpdateSubscriberMutation,
  useDeleteSubscriberMutation,
  useLazyExportSubscribersQuery
} = subscriberApi as any
