import { createApi } from '@reduxjs/toolkit/query/react'
import { toFormData } from 'axios'

import customFetchBase from './customFetchBase'
import type { GenericResultResponse, IHotel, IInsights } from '@/types'

export const hotelApi = createApi({
  reducerPath: 'hotelApi',
  baseQuery: customFetchBase,
  tagTypes: ['Hotels'],
  endpoints: builder => ({
    getHotel: builder.query<IHotel, string>({
      query(id) {
        return {
          url: `/v1/hotels/${id}`
        }
      },
      providesTags: (_result, _error, id) => [{ type: 'Hotels', id }]
    }),
    getHotels: builder.query<
      GenericResultResponse<IHotel>,
      { user?: string; search: string; page?: number; limit?: number }
    >({
      query(params) {
        return {
          url: `/v1/hotels`,
          params
        }
      },
      providesTags: result =>
        result
          ? [
              ...result.results.map(({ id }) => ({
                type: 'Hotels' as const,
                id
              })),
              { type: 'Hotels', id: 'LIST' }
            ]
          : [{ type: 'Hotels', id: 'LIST' }]
    }),
    createHotel: builder.mutation<IHotel, FormData>({
      query(hotel) {
        return {
          url: '/v1/hotels',
          method: 'POST',
          body: toFormData(hotel)
        }
      },
      invalidatesTags: [{ type: 'Hotels', id: 'LIST' }]
    }),
    updateHotel: builder.mutation<IHotel, { id: string; hotel: FormData }>({
      query({ id, hotel }) {
        return {
          url: `/v1/hotels/${id}`,
          method: 'PATCH',
          body: toFormData(hotel)
        }
      },
      invalidatesTags: (result, _error, { id }) =>
        result
          ? [
              { type: 'Hotels', id },
              { type: 'Hotels', id: 'LIST' }
            ]
          : [{ type: 'Hotels', id: 'LIST' }]
    }),
    deleteHotel: builder.mutation<IHotel, string>({
      query(id) {
        return {
          url: `/v1/hotels/${id}`,
          method: 'Delete'
        }
      },
      invalidatesTags: [{ type: 'Hotels', id: 'LIST' }]
    }),
    exportHotels: builder.query<string, { role: string }>({
      query(params) {
        return {
          url: `/v1/hotels/export`,
          method: 'GET',
          params,
          responseHandler: 'text'
        }
      }
    }),
    getHotelInsights: builder.query<IInsights, { hotel: string; params: any }>({
      query({ hotel, params }) {
        return {
          url: `/v1/hotels/${hotel}/insights`,
          params
        }
      }
    }),
    generateDeviceToken: builder.mutation<{ token: string }, string>({
      query(hotelId) {
        return {
          url: `/v1/hotels/${hotelId}/device-token`,
          method: 'POST'
        }
      }
    }),
    duplicateGroupToHotel: builder.query<IInsights, { hotel: string; params: any }>({
      query({ hotel, ...params }) {
        return {
          url: `/v1/hotels/${hotel}/dupicate-group`,
          params
        }
      }
    })
  })
})

export const {
  useGetHotelQuery,
  useGetHotelsQuery,
  useCreateHotelMutation,
  useUpdateHotelMutation,
  useDeleteHotelMutation,
  useLazyExportHotelsQuery,
  useGetHotelInsightsQuery,
  useGenerateDeviceTokenMutation,
  duplicateGroupToHotelQuery
} = hotelApi as any
