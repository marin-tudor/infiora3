import { createApi } from '@reduxjs/toolkit/query/react'
import { toFormData } from 'axios'

import customFetchBase from './customFetchBase'
import type {
  GenericResultResponse,
  IHotel,
  IHotelOperationsOverview,
  IHotelPremiumModules,
  IHotelSecuritySettings,
  IInsights,
  ITranslationCacheReview
} from '@/types'

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
    getHotelOperationsOverview: builder.query<IHotelOperationsOverview, string>({
      query(hotelId) {
        return {
          url: `/v1/hotels/${hotelId}/operations-overview`
        }
      }
    }),
    getHotelSecuritySettings: builder.query<IHotelSecuritySettings, string>({
      query(hotelId) {
        return {
          url: `/v1/hotels/${hotelId}/security-settings`
        }
      }
    }),
    updateHotelSecuritySettings: builder.mutation<
      IHotelSecuritySettings,
      { hotelId: string; body: Partial<IHotelSecuritySettings> & { rotateDeviceToken?: boolean } }
    >({
      query({ hotelId, body }) {
        return {
          url: `/v1/hotels/${hotelId}/security-settings`,
          method: 'PATCH',
          body
        }
      }
    }),
    getHotelPremiumModules: builder.query<IHotelPremiumModules, string>({
      query(hotelId) {
        return {
          url: `/v1/hotels/${hotelId}/premium-modules`
        }
      }
    }),
    updateHotelPremiumModules: builder.mutation<
      IHotelPremiumModules,
      { hotelId: string; body: Partial<IHotelPremiumModules> }
    >({
      query({ hotelId, body }) {
        return {
          url: `/v1/hotels/${hotelId}/premium-modules`,
          method: 'PATCH',
          body
        }
      }
    }),
    getTranslationCacheReview: builder.query<ITranslationCacheReview, string>({
      query(hotelId) {
        return {
          url: `/v1/hotels/${hotelId}/translation-cache-review`
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
  useGetHotelOperationsOverviewQuery,
  useGetHotelSecuritySettingsQuery,
  useUpdateHotelSecuritySettingsMutation,
  useGetHotelPremiumModulesQuery,
  useUpdateHotelPremiumModulesMutation,
  useGetTranslationCacheReviewQuery,
  duplicateGroupToHotelQuery
} = hotelApi as any
