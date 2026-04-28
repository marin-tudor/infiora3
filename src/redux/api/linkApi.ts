import { createApi } from '@reduxjs/toolkit/query/react'

import { toFormData } from 'axios'

import customFetchBase from './customFetchBase'
import type { GenericResultResponse, ILink } from '@/types'

export const linkApi = createApi({
  reducerPath: 'linkApi',
  baseQuery: customFetchBase,
  tagTypes: ['Links'],
  endpoints: builder => ({
    getLink: builder.query<ILink, string>({
      query(id) {
        return {
          url: `/v1/links/${id}`
        }
      },
      providesTags: (_result, _error, id) => [{ type: 'Links', id }]
    }),
    getLinks: builder.query<GenericResultResponse<ILink>, { profile: string; page?: number; limit?: number }>({
      query(params) {
        return {
          url: `/v1/links`,
          params
        }
      },
      providesTags: result =>
        result
          ? [
              ...result.results.map(({ id }) => ({
                type: 'Links' as const,
                id
              })),
              { type: 'Links', id: 'LIST' }
            ]
          : [{ type: 'Links', id: 'LIST' }]
    }),
    createLink: builder.mutation<ILink, FormData>({
      query(link) {
        return {
          url: '/v1/links',
          method: 'POST',
          body: toFormData(link)
        }
      },
      invalidatesTags: [{ type: 'Links', id: 'LIST' }]
    }),
    updateLink: builder.mutation<ILink, { id: string; link: FormData }>({
      query({ id, link }) {
        return {
          url: `/v1/links/${id}`,
          method: 'PATCH',
          body: toFormData(link)
        }
      },
      invalidatesTags: (result, _error, { id }) =>
        result
          ? [
              { type: 'Links', id },
              { type: 'Links', id: 'LIST' }
            ]
          : [{ type: 'Links', id: 'LIST' }]
    }),
    deleteLink: builder.mutation<ILink, string>({
      query(id) {
        return {
          url: `/v1/links/${id}`,
          method: 'Delete'
        }
      },
      invalidatesTags: [{ type: 'Links', id: 'LIST' }]
    }),
    reorderLinks: builder.mutation({
      query: ({ id, body }) => ({
        url: `/v1/links/reorder/${id}`,
        method: 'PATCH',
        body
      }),
      invalidatesTags: [{ type: 'Links', id: 'LIST' }]
    })
  })
})

export const {
  useGetLinkQuery,
  useGetLinksQuery,
  useCreateLinkMutation,
  useUpdateLinkMutation,
  useDeleteLinkMutation,
  useReorderLinksMutation
} = linkApi as any
