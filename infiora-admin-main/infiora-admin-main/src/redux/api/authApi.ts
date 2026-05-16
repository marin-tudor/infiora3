import { createApi } from '@reduxjs/toolkit/query/react';
import customFetchBase from './customFetchBase';
import type { GenericResponse, IUser } from '@/types';
import { userApi } from './userApi';
import { LoginInput } from '@/pages/login';

interface AuthSuccessResponse {
  user: IUser;
  tokens?: unknown;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: customFetchBase,
  endpoints: (builder) => ({
    registerUser: builder.mutation<IUser, LoginInput>({
      query(data) {
        return {
          url: '/v1/auth/register',
          method: 'POST',
          body: data,
        };
      },
      transformResponse: (result: AuthSuccessResponse) => result.user,
    }),
    loginUser: builder.mutation<IUser, LoginInput>({
      query(data) {
        return {
          url: '/v1/auth/login',
          method: 'POST',
          body: data,
          credentials: 'include',
        };
      },
      transformResponse: (result: AuthSuccessResponse) => result.user,
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          await dispatch(userApi.endpoints.getMe.initiate(null));
        } catch (error) {
          console.error('Auth login error:', error);
        }
      },
    }),
    logoutUser: builder.mutation<void, void>({
      query() {
        return {
          url: '/v1/auth/logout',
          method: 'POST',
          credentials: 'include',
        };
      },
    }),
    verifyEmail: builder.mutation<GenericResponse, string>({
      query(token) {
        return {
          url: '/v1/auth/verify-email',
          method: 'POST',
          params: { token },
          credentials: 'include',
        };
      },
    }),
    forgotPassword: builder.mutation<
      GenericResponse,
      { email: string }
    >({
      query(body) {
        return {
          url: `/v1/auth/forgot-password`,
          method: 'POST',
          credentials: 'include',
          body,
        };
      },
    }),
    resetPassword: builder.mutation<
      GenericResponse,
      { resetToken: string; password: string }
    >({
      query({ resetToken, password }) {
        return {
          url: '/v1/auth/reset-password',
          method: 'POST',
          params: { token: resetToken },
          body: { password },
          credentials: 'include',
        };
      },
    }),
  }),
});

export const {
  useLoginUserMutation,
  useRegisterUserMutation,
  useLogoutUserMutation,
  useVerifyEmailMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi as any;
