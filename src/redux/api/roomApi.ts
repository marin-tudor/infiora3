import { createApi } from '@reduxjs/toolkit/query/react'
import { toFormData } from 'axios'

import customFetchBase from './customFetchBase'
import type { GenericResultResponse, IFeedback, IFeedbackSubmission, IRoom } from '@/types'

export const roomApi = createApi({
  reducerPath: 'roomApi',
  baseQuery: customFetchBase,
  tagTypes: ['Rooms'],
  endpoints: builder => ({
    getRoom: builder.query<IRoom, string>({
      query(id) {
        return {
          url: `/v1/rooms/${id}`,
          credentials: 'include'
        }
      },
      providesTags: (_result, _error, id) => [{ type: 'Rooms', id }]
    }),
    getRooms: builder.query<
      GenericResultResponse<IRoom>,
      { user?: string; search: string; page?: number; limit?: number }
    >({
      query(params) {
        return {
          url: `/v1/rooms`,
          params,
          credentials: 'include'
        }
      },
      providesTags: result =>
        result
          ? [
              ...result.results.map(({ id }) => ({
                type: 'Rooms' as const,
                id
              })),
              { type: 'Rooms', id: 'LIST' }
            ]
          : [{ type: 'Rooms', id: 'LIST' }]
    }),
    createRoom: builder.mutation<IRoom, FormData>({
      query(room) {
        return {
          url: '/v1/rooms',
          method: 'POST',
          credentials: 'include',
          body: room
        }
      },
      invalidatesTags: [{ type: 'Rooms', id: 'LIST' }]
    }),
    updateRoom: builder.mutation<IRoom, { id: string; room: FormData }>({
      query({ id, room }) {
        return {
          url: `/v1/rooms/${id}`,
          method: 'PATCH',
          credentials: 'include',
          body: toFormData(room)
        }
      },
      invalidatesTags: (result, _error, { id }) =>
        result
          ? [
              { type: 'Rooms', id },
              { type: 'Rooms', id: 'LIST' }
            ]
          : [{ type: 'Rooms', id: 'LIST' }]
    }),
    updateRoomJson: builder.mutation<IRoom, { id: string; data: Record<string, any> }>({
      query({ id, data }) {
        return {
          url: `/v1/rooms/${id}`,
          method: 'PATCH',
          credentials: 'include',
          body: data
        }
      },
      invalidatesTags: (result, _error, { id }) =>
        result
          ? [
              { type: 'Rooms', id },
              { type: 'Rooms', id: 'LIST' }
            ]
          : [{ type: 'Rooms', id: 'LIST' }]
    }),
    deleteRoom: builder.mutation<IRoom, string>({
      query(id) {
        return {
          url: `/v1/rooms/${id}`,
          method: 'Delete',
          credentials: 'include'
        }
      },
      invalidatesTags: [{ type: 'Rooms', id: 'LIST' }]
    }),
    exportRooms: builder.query<string, { role: string }>({
      query(params) {
        return {
          url: `/v1/rooms/export`,
          method: 'GET',
          params,
          credentials: 'include',
          responseHandler: 'text'
        }
      }
    }),
    duplicateRoom: builder.mutation<IRoom, string>({
      query(id) {
        return {
          url: `/v1/rooms/duplicate/${id}`,
          method: 'POST'
        }
      },
      invalidatesTags: [{ type: 'Rooms', id: 'LIST' }]
    }),
    getFeedbacks: builder.query<
      GenericResultResponse<IFeedbackSubmission>,
      { hotel?: string; room?: string; search?: string; page?: number; limit?: number; startDate?: string; endDate?: string }
    >({
      query(params) {
        return {
          url: `/v1/rooms/feedback`,
          params,
          credentials: 'include'
        }
      }
    }),
    getHotelFeedbacks: builder.query<
      GenericResultResponse<IFeedbackSubmission>,
      { hotel: string; startDate?: string; endDate?: string; limit?: number }
    >({
      query(params) {
        return {
          url: `/v1/rooms/feedback`,
          params,
          credentials: 'include'
        }
      }
    })
  })
})

export const {
  useGetRoomQuery,
  useGetRoomsQuery,
  useCreateRoomMutation,
  useUpdateRoomMutation,
  useUpdateRoomJsonMutation,
  useDeleteRoomMutation,
  useLazyExportRoomsQuery,
  useDuplicateRoomMutation,
  useGetFeedbacksQuery,
  useGetHotelFeedbacksQuery
} = roomApi as any
