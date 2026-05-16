'use client'
import { createApi } from '@reduxjs/toolkit/query/react'

import customFetchBase from './customFetchBase'
import type { ICatalogItem, IDispatchRule, INotificationGroup, IOrderCategory, IStaffMember, IStaffRole } from '@/types'

export const staffApi = createApi({
  reducerPath: 'staffApi',
  baseQuery: customFetchBase,
  tagTypes: ['StaffMembers', 'StaffRoles', 'NotificationGroups', 'DispatchRules'],
  endpoints: builder => ({
    getStaffMembers: builder.query<IStaffMember[], string>({
      query: hotelId => ({ url: `/v1/hotels/${hotelId}/staff/members` }),
      providesTags: [{ type: 'StaffMembers', id: 'LIST' }]
    }),
    createStaffMember: builder.mutation<
      IStaffMember,
      { hotelId: string; body: Partial<IStaffMember> & { pin: string } }
    >({
      query: ({ hotelId, body }) => ({ url: `/v1/hotels/${hotelId}/staff/members`, method: 'POST', body }),
      invalidatesTags: [{ type: 'StaffMembers', id: 'LIST' }]
    }),
    updateStaffMember: builder.mutation<
      IStaffMember,
      { hotelId: string; memberId: string; body: Partial<IStaffMember> & { pin?: string } }
    >({
      query: ({ hotelId, memberId, body }) => ({
        url: `/v1/hotels/${hotelId}/staff/members/${memberId}`,
        method: 'PATCH',
        body
      }),
      invalidatesTags: [{ type: 'StaffMembers', id: 'LIST' }]
    }),
    deleteStaffMember: builder.mutation<void, { hotelId: string; memberId: string }>({
      query: ({ hotelId, memberId }) => ({
        url: `/v1/hotels/${hotelId}/staff/members/${memberId}`,
        method: 'DELETE'
      }),
      invalidatesTags: [{ type: 'StaffMembers', id: 'LIST' }]
    }),

    getStaffRoles: builder.query<IStaffRole[], string>({
      query: hotelId => ({ url: `/v1/hotels/${hotelId}/staff/roles` }),
      providesTags: [{ type: 'StaffRoles', id: 'LIST' }]
    }),
    createStaffRole: builder.mutation<IStaffRole, { hotelId: string; body: Partial<IStaffRole> }>({
      query: ({ hotelId, body }) => ({ url: `/v1/hotels/${hotelId}/staff/roles`, method: 'POST', body }),
      invalidatesTags: [{ type: 'StaffRoles', id: 'LIST' }]
    }),
    updateStaffRole: builder.mutation<IStaffRole, { hotelId: string; roleId: string; body: Partial<IStaffRole> }>({
      query: ({ hotelId, roleId, body }) => ({
        url: `/v1/hotels/${hotelId}/staff/roles/${roleId}`,
        method: 'PATCH',
        body
      }),
      invalidatesTags: [{ type: 'StaffRoles', id: 'LIST' }]
    }),
    deleteStaffRole: builder.mutation<void, { hotelId: string; roleId: string }>({
      query: ({ hotelId, roleId }) => ({
        url: `/v1/hotels/${hotelId}/staff/roles/${roleId}`,
        method: 'DELETE'
      }),
      invalidatesTags: [{ type: 'StaffRoles', id: 'LIST' }]
    }),

    getNotificationGroups: builder.query<INotificationGroup[], string>({
      query: hotelId => ({ url: `/v1/hotels/${hotelId}/dispatch/groups` }),
      providesTags: [{ type: 'NotificationGroups', id: 'LIST' }]
    }),
    createNotificationGroup: builder.mutation<
      INotificationGroup,
      { hotelId: string; body: Partial<INotificationGroup> }
    >({
      query: ({ hotelId, body }) => ({ url: `/v1/hotels/${hotelId}/dispatch/groups`, method: 'POST', body }),
      invalidatesTags: [{ type: 'NotificationGroups', id: 'LIST' }]
    }),
    updateNotificationGroup: builder.mutation<
      INotificationGroup,
      { hotelId: string; groupId: string; body: Partial<INotificationGroup> }
    >({
      query: ({ hotelId, groupId, body }) => ({
        url: `/v1/hotels/${hotelId}/dispatch/groups/${groupId}`,
        method: 'PATCH',
        body
      }),
      invalidatesTags: [{ type: 'NotificationGroups', id: 'LIST' }]
    }),
    deleteNotificationGroup: builder.mutation<void, { hotelId: string; groupId: string }>({
      query: ({ hotelId, groupId }) => ({
        url: `/v1/hotels/${hotelId}/dispatch/groups/${groupId}`,
        method: 'DELETE'
      }),
      invalidatesTags: [{ type: 'NotificationGroups', id: 'LIST' }]
    }),

    getDispatchRules: builder.query<IDispatchRule[], string>({
      query: hotelId => ({ url: `/v1/hotels/${hotelId}/dispatch/rules` }),
      providesTags: [{ type: 'DispatchRules', id: 'LIST' }]
    }),
    createDispatchRule: builder.mutation<IDispatchRule, { hotelId: string; body: Partial<IDispatchRule> }>({
      query: ({ hotelId, body }) => ({ url: `/v1/hotels/${hotelId}/dispatch/rules`, method: 'POST', body }),
      invalidatesTags: [{ type: 'DispatchRules', id: 'LIST' }]
    }),
    updateDispatchRule: builder.mutation<
      IDispatchRule,
      { hotelId: string; ruleId: string; body: Partial<IDispatchRule> }
    >({
      query: ({ hotelId, ruleId, body }) => ({
        url: `/v1/hotels/${hotelId}/dispatch/rules/${ruleId}`,
        method: 'PATCH',
        body
      }),
      invalidatesTags: [{ type: 'DispatchRules', id: 'LIST' }]
    }),
    deleteDispatchRule: builder.mutation<void, { hotelId: string; ruleId: string }>({
      query: ({ hotelId, ruleId }) => ({
        url: `/v1/hotels/${hotelId}/dispatch/rules/${ruleId}`,
        method: 'DELETE'
      }),
      invalidatesTags: [{ type: 'DispatchRules', id: 'LIST' }]
    }),

    getDispatchCategories: builder.query<IOrderCategory[], string>({
      query: hotelId => ({ url: `/v1/orders/hotels/${hotelId}/categories` })
    }),
    getDispatchItems: builder.query<ICatalogItem[], string>({
      query: hotelId => ({ url: `/v1/orders/hotels/${hotelId}/items` })
    })
  })
})

export const {
  useGetStaffMembersQuery,
  useCreateStaffMemberMutation,
  useUpdateStaffMemberMutation,
  useDeleteStaffMemberMutation,
  useGetStaffRolesQuery,
  useCreateStaffRoleMutation,
  useUpdateStaffRoleMutation,
  useDeleteStaffRoleMutation,
  useGetNotificationGroupsQuery,
  useCreateNotificationGroupMutation,
  useUpdateNotificationGroupMutation,
  useDeleteNotificationGroupMutation,
  useGetDispatchRulesQuery,
  useCreateDispatchRuleMutation,
  useUpdateDispatchRuleMutation,
  useDeleteDispatchRuleMutation,
  useGetDispatchCategoriesQuery,
  useGetDispatchItemsQuery
} = staffApi as any
