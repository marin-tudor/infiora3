import { createApi } from '@reduxjs/toolkit/query/react';

import { setUser } from '../features/userSlice';
import customFetchBase from './customFetchBase';
import type {
  GenericResultResponse,
  IInsights,
  IUser,
} from '@/types';
import { isNullOrEmpty } from '@/utils/helpers';
import { FormData } from '@/views/user/components/UserForm';

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: customFetchBase,
  tagTypes: ['Users'],
  endpoints: (builder) => ({
    getMe: builder.query<IUser, null>({
      query() {
        return {
          url: '/v1/users/me',
        };
      },
      transformResponse: (result: IUser) => result,
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;

          dispatch(setUser(data));
        } catch (error) {}
      },
    }),
    getUser: builder.query<IUser, string>({
      query(id) {
        return {
          url: `/v1/users/${id}`,
        };
      },
      providesTags: (_result, _error, id) => [{ type: 'Users', id }],
    }),
    getUsers: builder.query<
      GenericResultResponse<IUser>,
      { search: string; page?: number; limit?: number }
    >({
      query(params) {
        return {
          url: `/v1/users`,
          params,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.results.map(({ id }) => ({
                type: 'Users' as const,
                id,
              })),
              { type: 'Users', id: 'LIST' },
            ]
          : [{ type: 'Users', id: 'LIST' }],
    }),
    createUser: builder.mutation<IUser, FormData>({
      query(user) {
        return {
          url: '/v1/users',
          method: 'POST',
          body: user,
        };
      },
      invalidatesTags: [{ type: 'Users', id: 'LIST' }],
    }),
    updateUser: builder.mutation<
      IUser,
      { id: string; user: FormData }
    >({
      query({ id, user }) {
        if (isNullOrEmpty(user.password)) delete user.password;
        return {
          url: `/v1/users/${id}`,
          method: 'PATCH',
          body: user,
        };
      },
      invalidatesTags: (result, _error, { id }) =>
        result
          ? [
              { type: 'Users', id },
              { type: 'Users', id: 'LIST' },
            ]
          : [{ type: 'Users', id: 'LIST' }],
    }),
    deleteUser: builder.mutation<IUser, string>({
      query(id) {
        return {
          url: `/v1/users/${id}`,
          method: 'Delete',
        };
      },
      invalidatesTags: [{ type: 'Users', id: 'LIST' }],
    }),
    exportUsers: builder.query<string, { role: string }>({
      query(params) {
        return {
          url: `/v1/users/export`,
          method: 'GET',
          params,
          responseHandler: 'text',
        };
      },
    }),
    getAdminInsights: builder.query<IInsights, { params: any }>({
      query({ params }) {
        return {
          url: '/v1/users/insights',
          params,
        };
      },
    }),
  }),
});

export const {
  useGetUserQuery,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useLazyExportUsersQuery,
  useGetAdminInsightsQuery,
} = userApi as any;
