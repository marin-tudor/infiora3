'use client'
import { createApi } from '@reduxjs/toolkit/query/react'

import customFetchBase from './customFetchBase'
import type {
  IOrderCategory,
  ICatalogItem,
  IGuestOrder,
  IOrderAnalytics,
  IOrderSettings,
  IReservationCode,
  IICalSource,
  ICalPlatform,
  GenericResultResponse,
  IDiscountCode
} from '@/types'

export const ordersApi = createApi({
  reducerPath: 'ordersApi',
  baseQuery: customFetchBase,
  tagTypes: ['Orders', 'Categories', 'Items', 'Settings', 'Codes', 'ICalSources', 'DiscountCodes', 'Stripe'],
  endpoints: builder => ({
    // Orders
    getOrders: builder.query<
      GenericResultResponse<IGuestOrder>,
      {
        hotelId: string
        status?: string
        page?: number
        limit?: number
        startDate?: string
        endDate?: string
        groupId?: string
        scheduled?: boolean
      }
    >({
      query: ({ hotelId, ...params }) => ({ url: `/v1/orders/hotels/${hotelId}`, params }),
      providesTags: [{ type: 'Orders', id: 'LIST' }]
    }),
    acceptOrder: builder.mutation<IGuestOrder, { orderId: string; eta?: number; message?: string }>({
      query: ({ orderId, ...body }) => ({
        url: `/v1/orders/${encodeURIComponent(orderId)}/accept`,
        method: 'POST',
        body
      }),
      invalidatesTags: [{ type: 'Orders', id: 'LIST' }]
    }),
    advanceOrder: builder.mutation<IGuestOrder, string>({
      query: orderId => ({ url: `/v1/orders/${encodeURIComponent(orderId)}/advance`, method: 'POST' }),
      invalidatesTags: [{ type: 'Orders', id: 'LIST' }]
    }),
    cancelOrder: builder.mutation<IGuestOrder, { orderId: string; reason?: string }>({
      query: ({ orderId, ...body }) => ({
        url: `/v1/orders/${encodeURIComponent(orderId)}/cancel`,
        method: 'POST',
        body
      }),
      invalidatesTags: [{ type: 'Orders', id: 'LIST' }]
    }),

    // Analytics
    getOrderAnalytics: builder.query<IOrderAnalytics, { hotelId: string; startDate?: string; endDate?: string }>({
      query: ({ hotelId, ...params }) => ({ url: `/v1/orders/hotels/${hotelId}/analytics`, params })
    }),
    getOrderVisitAnalytics: builder.query<
      { totalVisits: number; converted: number; notConverted: number; conversionRate: number },
      { hotelId: string; startDate?: string; endDate?: string }
    >({
      query: ({ hotelId, ...params }) => ({ url: `/v1/orders/hotels/${hotelId}/visit-analytics`, params })
    }),
    trackCheckinUsage: builder.mutation<{ tracked: boolean; activityId: string }, { hotelId: string }>({
      query: ({ hotelId }) => ({
        url: `/v1/orders/hotels/${hotelId}/checkin-usage`,
        method: 'POST'
      })
    }),

    // Categories
    getCategories: builder.query<IOrderCategory[], string>({
      query: hotelId => ({ url: `/v1/orders/hotels/${hotelId}/categories` }),
      providesTags: [{ type: 'Categories', id: 'LIST' }]
    }),
    createCategory: builder.mutation<
      IOrderCategory,
      { hotelId: string; name: string; icon: string; sortOrder?: number; parentId?: string | null }
    >({
      query: ({ hotelId, ...body }) => ({ url: `/v1/orders/hotels/${hotelId}/categories`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Categories', id: 'LIST' }]
    }),
    updateCategory: builder.mutation<
      IOrderCategory,
      {
        hotelId: string
        categoryId: string
        name?: string
        icon?: string
        active?: boolean
        sortOrder?: number
        parentId?: string | null
      }
    >({
      query: ({ hotelId, categoryId, ...body }) => ({
        url: `/v1/orders/hotels/${hotelId}/categories/${categoryId}`,
        method: 'PATCH',
        body
      }),
      invalidatesTags: [{ type: 'Categories', id: 'LIST' }]
    }),
    deleteCategory: builder.mutation<void, { hotelId: string; categoryId: string }>({
      query: ({ hotelId, categoryId }) => ({
        url: `/v1/orders/hotels/${hotelId}/categories/${categoryId}`,
        method: 'DELETE'
      }),
      invalidatesTags: [{ type: 'Categories', id: 'LIST' }]
    }),

    // Catalog Items
    getCatalogItems: builder.query<ICatalogItem[], { hotelId: string; categoryId?: string }>({
      query: ({ hotelId, ...params }) => ({ url: `/v1/orders/hotels/${hotelId}/items`, params }),
      providesTags: [{ type: 'Items', id: 'LIST' }]
    }),
    createCatalogItem: builder.mutation<ICatalogItem, { hotelId: string } & Partial<ICatalogItem>>({
      query: ({ hotelId, ...body }) => ({ url: `/v1/orders/hotels/${hotelId}/items`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Items', id: 'LIST' }]
    }),
    updateCatalogItem: builder.mutation<ICatalogItem, { hotelId: string; itemId: string } & Partial<ICatalogItem>>({
      query: ({ hotelId, itemId, ...body }) => ({
        url: `/v1/orders/hotels/${hotelId}/items/${itemId}`,
        method: 'PATCH',
        body
      }),
      invalidatesTags: [{ type: 'Items', id: 'LIST' }]
    }),
    toggleCatalogItem: builder.mutation<ICatalogItem, { hotelId: string; itemId: string }>({
      query: ({ hotelId, itemId }) => ({ url: `/v1/orders/hotels/${hotelId}/items/${itemId}/toggle`, method: 'PATCH' }),
      invalidatesTags: [{ type: 'Items', id: 'LIST' }]
    }),
    deleteCatalogItem: builder.mutation<void, { hotelId: string; itemId: string }>({
      query: ({ hotelId, itemId }) => ({ url: `/v1/orders/hotels/${hotelId}/items/${itemId}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Items', id: 'LIST' }]
    }),

    // Reservation Codes
    getReservationCodes: builder.query<
      IReservationCode[],
      { hotelId: string; showExpired?: boolean; status?: 'all' | 'current' | 'upcoming'; source?: string }
    >({
      query: ({ hotelId, ...params }) => ({ url: `/v1/orders/hotels/${hotelId}/codes`, params }),
      providesTags: [{ type: 'Codes', id: 'LIST' }]
    }),
    createReservationCode: builder.mutation<
      IReservationCode,
      {
        hotelId: string
        roomId: string
        roomNumber: string
        code: string
        guestName: string
        checkIn: string
        checkOut: string
      }
    >({
      query: ({ hotelId, ...body }) => ({ url: `/v1/orders/hotels/${hotelId}/codes`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Codes', id: 'LIST' }]
    }),
    updateReservationCode: builder.mutation<
      IReservationCode,
      { hotelId: string; codeId: string } & Partial<IReservationCode>
    >({
      query: ({ hotelId, codeId, ...body }) => ({
        url: `/v1/orders/hotels/${hotelId}/codes/${codeId}`,
        method: 'PATCH',
        body
      }),
      invalidatesTags: [{ type: 'Codes', id: 'LIST' }]
    }),
    deleteReservationCode: builder.mutation<void, { hotelId: string; codeId: string }>({
      query: ({ hotelId, codeId }) => ({ url: `/v1/orders/hotels/${hotelId}/codes/${codeId}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Codes', id: 'LIST' }]
    }),

    // iCal Sources
    getICalSources: builder.query<IICalSource[], string>({
      query: hotelId => ({ url: `/v1/orders/hotels/${hotelId}/ical-sources` }),
      providesTags: [{ type: 'ICalSources', id: 'LIST' }]
    }),
    createICalSource: builder.mutation<
      IICalSource,
      { hotelId: string; platform: ICalPlatform; label: string; url: string; enabled: boolean }
    >({
      query: ({ hotelId, ...body }) => ({ url: `/v1/orders/hotels/${hotelId}/ical-sources`, method: 'POST', body }),
      invalidatesTags: [{ type: 'ICalSources', id: 'LIST' }]
    }),
    updateICalSource: builder.mutation<
      IICalSource,
      { hotelId: string; sourceId: string } & Partial<{ label: string; url: string; enabled: boolean; platform: ICalPlatform }>
    >({
      query: ({ hotelId, sourceId, ...body }) => ({
        url: `/v1/orders/hotels/${hotelId}/ical-sources/${sourceId}`,
        method: 'PATCH',
        body
      }),
      invalidatesTags: [{ type: 'ICalSources', id: 'LIST' }]
    }),
    deleteICalSource: builder.mutation<void, { hotelId: string; sourceId: string }>({
      query: ({ hotelId, sourceId }) => ({
        url: `/v1/orders/hotels/${hotelId}/ical-sources/${sourceId}`,
        method: 'DELETE'
      }),
      invalidatesTags: [{ type: 'ICalSources', id: 'LIST' }]
    }),
    syncICalSource: builder.mutation<{ synced: number; errors: number }, { hotelId: string; sourceId: string }>({
      query: ({ hotelId, sourceId }) => ({
        url: `/v1/orders/hotels/${hotelId}/ical-sources/${sourceId}/sync`,
        method: 'POST'
      }),
      invalidatesTags: [{ type: 'ICalSources', id: 'LIST' }]
    }),
    syncAllICalSources: builder.mutation<{ synced: number; sources: number; errors: number }, string>({
      query: hotelId => ({ url: `/v1/orders/hotels/${hotelId}/ical-sources/sync-all`, method: 'POST' }),
      invalidatesTags: [{ type: 'ICalSources', id: 'LIST' }]
    }),

    // Discount codes
    getDiscountCodes: builder.query<IDiscountCode[], string>({
      query: hotelId => ({ url: `/v1/orders/hotels/${hotelId}/discount-codes` }),
      providesTags: [{ type: 'DiscountCodes', id: 'LIST' }]
    }),
    createDiscountCode: builder.mutation<IDiscountCode, { hotelId: string } & Omit<IDiscountCode, 'id' | 'hotelId' | 'usedCount' | 'createdAt'>>({
      query: ({ hotelId, ...body }) => ({ url: `/v1/orders/hotels/${hotelId}/discount-codes`, method: 'POST', body }),
      invalidatesTags: [{ type: 'DiscountCodes', id: 'LIST' }]
    }),
    updateDiscountCode: builder.mutation<IDiscountCode, { hotelId: string; codeId: string } & Partial<IDiscountCode>>({
      query: ({ hotelId, codeId, ...body }) => ({ url: `/v1/orders/hotels/${hotelId}/discount-codes/${codeId}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'DiscountCodes', id: 'LIST' }]
    }),
    deleteDiscountCode: builder.mutation<void, { hotelId: string; codeId: string }>({
      query: ({ hotelId, codeId }) => ({ url: `/v1/orders/hotels/${hotelId}/discount-codes/${codeId}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'DiscountCodes', id: 'LIST' }]
    }),

    // Settings
    getOrderSettings: builder.query<IOrderSettings, string>({
      query: hotelId => ({ url: `/v1/orders/hotels/${hotelId}/settings` }),
      providesTags: [{ type: 'Settings', id: 'ORDER_SETTINGS' }]
    }),
    updateOrderSettings: builder.mutation<IOrderSettings, { hotelId: string } & Partial<IOrderSettings>>({
      query: ({ hotelId, ...body }) => ({ url: `/v1/orders/hotels/${hotelId}/settings`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Settings', id: 'ORDER_SETTINGS' }]
    }),
    initiateStripeOnboarding: builder.mutation<{ url: string }, { hotelId: string; returnUrl: string }>({
      query: ({ hotelId, returnUrl }) => ({
        url: `/v1/stripe/hotels/${hotelId}/onboard`,
        method: 'POST',
        body: { returnUrl }
      }),
      invalidatesTags: [{ type: 'Stripe', id: 'STATUS' }]
    }),
    getStripeStatus: builder.query<
      { stripeAccountId: string | null; stripeAccountStatus: string; stripePlatformFeePercent: number | null },
      string
    >({
      query: hotelId => ({ url: `/v1/stripe/hotels/${hotelId}/status` }),
      providesTags: [{ type: 'Stripe', id: 'STATUS' }]
    })
  })
})

export const {
  useGetOrderVisitAnalyticsQuery,
  useGetReservationCodesQuery,
  useCreateReservationCodeMutation,
  useUpdateReservationCodeMutation,
  useDeleteReservationCodeMutation,
  useGetOrdersQuery,
  useAcceptOrderMutation,
  useAdvanceOrderMutation,
  useCancelOrderMutation,
  useGetOrderAnalyticsQuery,
  useTrackCheckinUsageMutation,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetCatalogItemsQuery,
  useCreateCatalogItemMutation,
  useUpdateCatalogItemMutation,
  useToggleCatalogItemMutation,
  useDeleteCatalogItemMutation,
  useGetICalSourcesQuery,
  useCreateICalSourceMutation,
  useUpdateICalSourceMutation,
  useDeleteICalSourceMutation,
  useSyncICalSourceMutation,
  useSyncAllICalSourcesMutation,
  useGetOrderSettingsQuery,
  useUpdateOrderSettingsMutation,
  useGetDiscountCodesQuery,
  useCreateDiscountCodeMutation,
  useUpdateDiscountCodeMutation,
  useDeleteDiscountCodeMutation,
  useInitiateStripeOnboardingMutation,
  useGetStripeStatusQuery
} = ordersApi as any
