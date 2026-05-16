import { createApi } from '@reduxjs/toolkit/query/react';
import customFetchBase from './customFetchBase';

export const ordersApi = createApi({
  reducerPath: 'ordersApi',
  baseQuery: customFetchBase,
  endpoints: (builder) => ({
    getOrderAnalytics: builder.query<any, { hotelId: string; startDate?: string; endDate?: string }>({
      query: ({ hotelId, ...params }) => ({
        url: `/v1/orders/hotels/${hotelId}/analytics`,
        params,
        credentials: 'include',
      }),
    }),
    getOrderVisitAnalytics: builder.query<
      { totalVisits: number; converted: number; notConverted: number; conversionRate: number },
      { hotelId: string; startDate?: string; endDate?: string }
    >({
      query: ({ hotelId, ...params }) => ({
        url: `/v1/orders/hotels/${hotelId}/visit-analytics`,
        params,
        credentials: 'include',
      }),
    }),
  }),
});

export const {
  useGetOrderAnalyticsQuery,
  useGetOrderVisitAnalyticsQuery,
} = ordersApi as any;
