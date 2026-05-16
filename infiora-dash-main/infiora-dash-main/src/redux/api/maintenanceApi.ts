import { createApi } from '@reduxjs/toolkit/query/react'

import customFetchBase from './customFetchBase'

export interface IMaintenanceIssue {
  id: string
  hotel: string
  room: string
  roomNumber?: string
  type: string
  typeLabel?: string
  description: string
  photo?: string
  guestRoomNumber?: string
  reservationCode?: string
  reservationCodeStatus?: 'not_provided' | 'matched' | 'unmatched'
  roomNumberStatus?: 'not_provided' | 'matched' | 'unmatched' | 'unknown'
  proofStatus?: 'not_provided' | 'matched' | 'unmatched' | 'unknown'
  status: 'pending' | 'in_progress' | 'done' | 'cancelled'
  createdAt: string
}

export const maintenanceApi = createApi({
  reducerPath: 'maintenanceApi',
  baseQuery: customFetchBase,
  tagTypes: ['Maintenance'],
  endpoints: builder => ({
    getMaintenanceIssues: builder.query<
      { results: IMaintenanceIssue[]; totalResults: number },
      { hotelId: string; status?: string; limit?: number; page?: number }
    >({
      query({ hotelId, ...params }) {
        return { url: `/v1/maintenance/hotels/${hotelId}`, params, credentials: 'include' }
      },
      providesTags: [{ type: 'Maintenance', id: 'LIST' }]
    }),
    getMaintenancePendingCount: builder.query<{ count: number }, string>({
      query(hotelId) {
        return { url: `/v1/maintenance/hotels/${hotelId}/pending-count`, credentials: 'include' }
      },
      providesTags: [{ type: 'Maintenance', id: 'COUNT' }]
    }),
    updateMaintenanceStatus: builder.mutation<IMaintenanceIssue, { id: string; status: string }>({
      query({ id, status }) {
        return { url: `/v1/maintenance/${id}/status`, method: 'PATCH', body: { status }, credentials: 'include' }
      },
      invalidatesTags: [
        { type: 'Maintenance', id: 'LIST' },
        { type: 'Maintenance', id: 'COUNT' }
      ]
    })
  })
})

export const { useGetMaintenanceIssuesQuery, useGetMaintenancePendingCountQuery, useUpdateMaintenanceStatusMutation } =
  maintenanceApi as any
