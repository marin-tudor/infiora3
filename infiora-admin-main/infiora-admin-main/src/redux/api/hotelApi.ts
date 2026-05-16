import { createApi } from '@reduxjs/toolkit/query/react';
import customFetchBase from './customFetchBase';
import type {
  GenericResultResponse,
  IHotel,
  IInsights,
} from '@/types';
import { FormData } from '@/views/hotel/components/HotelForm';

export const hotelApi = createApi({
  reducerPath: 'hotelApi',
  baseQuery: customFetchBase,
  tagTypes: ['Hotels'],
  endpoints: (builder) => ({
    getHotel: builder.query<IHotel, string>({
      query(id) {
        return {
          url: `/v1/hotels/${id}`,
          credentials: 'include',
        };
      },
      providesTags: (_result, _error, id) => [{ type: 'Hotels', id }],
    }),
    getHotels: builder.query<
      GenericResultResponse<IHotel>,
      { user?: string; search: string; page?: number; limit?: number }
    >({
      query(params) {
        return {
          url: `/v1/hotels`,
          params,
          credentials: 'include',
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.results.map(({ id }) => ({
                type: 'Hotels' as const,
                id,
              })),
              { type: 'Hotels', id: 'LIST' },
            ]
          : [{ type: 'Hotels', id: 'LIST' }],
    }),
    createHotel: builder.mutation<IHotel, FormData>({
      query(hotel) {
        return {
          url: '/v1/hotels',
          method: 'POST',
          credentials: 'include',
          body: hotel,
        };
      },
      invalidatesTags: [{ type: 'Hotels', id: 'LIST' }],
    }),
    updateHotel: builder.mutation<
      IHotel,
      { id: string; hotel: FormData }
    >({
      query({ id, hotel }) {
        return {
          url: `/v1/hotels/${id}`,
          method: 'PATCH',
          credentials: 'include',
          body: hotel,
        };
      },
      invalidatesTags: (result, _error, { id }) =>
        result
          ? [
              { type: 'Hotels', id },
              { type: 'Hotels', id: 'LIST' },
            ]
          : [{ type: 'Hotels', id: 'LIST' }],
    }),
    updateHotelJson: builder.mutation<IHotel, { id: string; data: Record<string, any> }>({
      query({ id, data }) {
        return {
          url: `/v1/hotels/${id}`,
          method: 'PATCH',
          credentials: 'include',
          body: data,
        };
      },
      invalidatesTags: (result, _error, { id }) =>
        result
          ? [{ type: 'Hotels', id }, { type: 'Hotels', id: 'LIST' }]
          : [{ type: 'Hotels', id: 'LIST' }],
    }),
    deleteHotel: builder.mutation<IHotel, string>({
      query(id) {
        return {
          url: `/v1/hotels/${id}`,
          method: 'Delete',
          credentials: 'include',
        };
      },
      invalidatesTags: [{ type: 'Hotels', id: 'LIST' }],
    }),
    exportHotels: builder.query<string, { role: string }>({
      query(params) {
        return {
          url: `/v1/hotels/export`,
          method: 'GET',
          params,
          credentials: 'include',
          responseHandler: 'text',
        };
      },
    }),
    getHotelInsights: builder.query<
      IInsights,
      { hotel: string; params: any }
    >({
      query({ hotel, params }) {
        return {
          url: `/v1/hotels/${hotel}/insights`,
          params,
        };
      },
    }),
  }),
});

export const {
  useGetHotelQuery,
  useGetHotelsQuery,
  useCreateHotelMutation,
  useUpdateHotelMutation,
  useUpdateHotelJsonMutation,
  useDeleteHotelMutation,
  useLazyExportHotelsQuery,
  useGetHotelInsightsQuery,
} = hotelApi as any;
