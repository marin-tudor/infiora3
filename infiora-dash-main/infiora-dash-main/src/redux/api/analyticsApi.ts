'use client'
import { createApi } from '@reduxjs/toolkit/query/react'

import customFetchBase from './customFetchBase'

export interface IRevenueByCategory {
  _id: string | null
  categoryName?: string
  totalRevenue: number
  orderCount: number
}

export interface IDailyRating {
  _id: string
  avgRating: number
  count: number
}

export interface IHotelAnalytics {
  revenueByCategory: IRevenueByCategory[]
  avgAcceptanceMs: number
  slaBreaches: number
  dailyRatings: IDailyRating[]
  bookings: { total: number; revenue: number }
}

export const analyticsApi = createApi({
  reducerPath: 'analyticsApi',
  baseQuery: customFetchBase,
  tagTypes: ['Analytics'],
  endpoints: builder => ({
    getHotelAnalytics: builder.query<IHotelAnalytics, { hotelId: string; from?: string; to?: string }>({
      query: ({ hotelId, ...params }) => ({
        url: `/v1/hotels/${hotelId}/analytics`,
        params,
        credentials: 'include'
      }),
      providesTags: [{ type: 'Analytics', id: 'HOTEL' }]
    })
  })
})

export const { useGetHotelAnalyticsQuery } = analyticsApi as any
