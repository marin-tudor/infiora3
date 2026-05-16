import { createApi } from '@reduxjs/toolkit/query/react';
import customFetchBase from './customFetchBase';

export interface IStaffRoleTemplate {
  id: string;
  name: string;
  permissions: string[];
  visibleModules: string[];
  isTemplate: true;
}

export const staffApi = createApi({
  reducerPath: 'staffApi',
  baseQuery: customFetchBase,
  tagTypes: ['StaffTemplates'],
  endpoints: (builder) => ({
    getStaffRoleTemplates: builder.query<IStaffRoleTemplate[], void>({
      query: () => ({ url: '/v1/staff/roles/templates', credentials: 'include' }),
      providesTags: [{ type: 'StaffTemplates', id: 'LIST' }],
    }),
    createStaffRoleTemplate: builder.mutation<IStaffRoleTemplate, { name: string; permissions: string[]; visibleModules: string[] }>({
      query: (body) => ({
        url: '/v1/hotels/global/staff/roles',
        method: 'POST',
        credentials: 'include',
        body: { ...body, isTemplate: true },
      }),
      invalidatesTags: [{ type: 'StaffTemplates', id: 'LIST' }],
    }),
    updateStaffRoleTemplate: builder.mutation<IStaffRoleTemplate, { hotelId: string; roleId: string; body: Partial<IStaffRoleTemplate> }>({
      query: ({ hotelId, roleId, body }) => ({
        url: `/v1/hotels/${hotelId}/staff/roles/${roleId}`,
        method: 'PATCH',
        credentials: 'include',
        body,
      }),
      invalidatesTags: [{ type: 'StaffTemplates', id: 'LIST' }],
    }),
    deleteStaffRoleTemplate: builder.mutation<void, { hotelId: string; roleId: string }>({
      query: ({ hotelId, roleId }) => ({
        url: `/v1/hotels/${hotelId}/staff/roles/${roleId}`,
        method: 'DELETE',
        credentials: 'include',
      }),
      invalidatesTags: [{ type: 'StaffTemplates', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetStaffRoleTemplatesQuery,
  useCreateStaffRoleTemplateMutation,
  useUpdateStaffRoleTemplateMutation,
  useDeleteStaffRoleTemplateMutation,
} = staffApi as any;
