import { createApi } from '@reduxjs/toolkit/query/react'

import customFetchBase from './customFetchBase'

export interface IHousekeepingRequest {
  id: string
  hotel: string
  room: string
  roomNumber?: string
  type: string
  typeLabel?: string
  note?: string
  guestRoomNumber?: string
  reservationCode?: string
  reservationCodeStatus?: 'not_provided' | 'matched' | 'unmatched'
  roomNumberStatus?: 'not_provided' | 'matched' | 'unmatched' | 'unknown'
  proofStatus?: 'not_provided' | 'matched' | 'unmatched' | 'unknown'
  status: 'pending' | 'in_progress' | 'done' | 'cancelled'
  createdAt: string
}

export const housekeepingApi = createApi({
  reducerPath: 'housekeepingApi',
  baseQuery: customFetchBase,
  tagTypes: ['Housekeeping'],
  endpoints: builder => ({
    getHousekeepingRequests: builder.query<
      { results: IHousekeepingRequest[]; totalResults: number },
      { hotelId: string; status?: string; limit?: number; page?: number }
    >({
      query({ hotelId, ...params }) {
        return { url: `/v1/housekeeping/hotels/${hotelId}`, params, credentials: 'include' }
      },
      providesTags: [{ type: 'Housekeeping', id: 'LIST' }]
    }),
    getHousekeepingPendingCount: builder.query<{ count: number }, string>({
      query(hotelId) {
        return { url: `/v1/housekeeping/hotels/${hotelId}/pending-count`, credentials: 'include' }
      },
      providesTags: [{ type: 'Housekeeping', id: 'COUNT' }]
    }),
    updateHousekeepingStatus: builder.mutation<IHousekeepingRequest, { id: string; status: string }>({
      query({ id, status }) {
        return { url: `/v1/housekeeping/${id}/status`, method: 'PATCH', body: { status }, credentials: 'include' }
      },
      invalidatesTags: [
        { type: 'Housekeeping', id: 'LIST' },
        { type: 'Housekeeping', id: 'COUNT' }
      ]
    })
  })
})

export const {
  useGetHousekeepingRequestsQuery,
  useGetHousekeepingPendingCountQuery,
  useUpdateHousekeepingStatusMutation
} = housekeepingApi as any
