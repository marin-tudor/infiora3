import { createApi } from '@reduxjs/toolkit/query/react'

import customFetchBase from './customFetchBase'

export interface IBooking {
  id: string
  bookingRef: string
  hotelId: string
  roomId: string
  guestEmail: string
  guestRoomNumber: string
  itemId: { id: string; name: string } | string
  startTime: string
  endTime: string
  partySize: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  payment: string
  total: number
  note?: string
  staffNote?: string
  staffMemberId?: { id: string; name: string } | null
  createdAt: string
}

export interface ITimeSlot {
  id: string
  itemId: { id: string; name: string } | string
  startTime: string
  endTime: string
  maxPersons: number
  bookedPersons: number
  isBlocked: boolean
}

export const bookingApi = createApi({
  reducerPath: 'bookingApi',
  baseQuery: customFetchBase,
  tagTypes: ['Booking', 'TimeSlot'],
  endpoints: builder => ({
    getBookings: builder.query<
      { results: IBooking[]; totalResults: number },
      { hotelId: string; status?: string; itemId?: string; date?: string; page?: number; limit?: number }
    >({
      query({ hotelId, ...params }) {
        return { url: `/v1/hotels/${hotelId}/bookings`, params, credentials: 'include' }
      },
      providesTags: [{ type: 'Booking', id: 'LIST' }],
    }),
    getTimeSlots: builder.query<
      ITimeSlot[],
      { hotelId: string; itemId?: string; from?: string; to?: string }
    >({
      query({ hotelId, ...params }) {
        return { url: `/v1/hotels/${hotelId}/bookings/timeslots`, params, credentials: 'include' }
      },
      providesTags: [{ type: 'TimeSlot', id: 'LIST' }],
    }),
    updateBooking: builder.mutation<IBooking, { hotelId: string; bookingId: string; body: Partial<IBooking> }>({
      query({ hotelId, bookingId, body }) {
        return { url: `/v1/hotels/${hotelId}/bookings/${bookingId}`, method: 'PATCH', body, credentials: 'include' }
      },
      invalidatesTags: [{ type: 'Booking', id: 'LIST' }],
    }),
    cancelBooking: builder.mutation<IBooking, { hotelId: string; bookingId: string }>({
      query({ hotelId, bookingId }) {
        return {
          url: `/v1/hotels/${hotelId}/bookings/${bookingId}/cancel`,
          method: 'PATCH',
          params: { by: 'staff' },
          credentials: 'include',
        }
      },
      invalidatesTags: [{ type: 'Booking', id: 'LIST' }],
    }),
    blockSlot: builder.mutation<ITimeSlot, { hotelId: string; slotId: string }>({
      query({ hotelId, slotId }) {
        return {
          url: `/v1/hotels/${hotelId}/bookings/timeslots/${slotId}/block`,
          method: 'PATCH',
          credentials: 'include',
        }
      },
      invalidatesTags: [{ type: 'TimeSlot', id: 'LIST' }],
    }),
    unblockSlot: builder.mutation<ITimeSlot, { hotelId: string; slotId: string }>({
      query({ hotelId, slotId }) {
        return {
          url: `/v1/hotels/${hotelId}/bookings/timeslots/${slotId}/unblock`,
          method: 'PATCH',
          credentials: 'include',
        }
      },
      invalidatesTags: [{ type: 'TimeSlot', id: 'LIST' }],
    }),
    generateSlots: builder.mutation<{ message: string }, { hotelId: string }>({
      query({ hotelId }) {
        return { url: `/v1/hotels/${hotelId}/timeslots/generate`, method: 'POST', credentials: 'include' }
      },
      invalidatesTags: [{ type: 'TimeSlot', id: 'LIST' }],
    }),
  }),
})

export const {
  useGetBookingsQuery,
  useGetTimeSlotsQuery,
  useUpdateBookingMutation,
  useCancelBookingMutation,
  useBlockSlotMutation,
  useUnblockSlotMutation,
  useGenerateSlotsMutation,
} = bookingApi as any
