import { createApi } from '@reduxjs/toolkit/query/react'

import customFetchBase from './customFetchBase'
import type { GenericResultResponse, ITag } from '@/types'

export const tagApi = createApi({
  reducerPath: 'tagApi',
  baseQuery: customFetchBase,
  tagTypes: ['Tags'],
  endpoints: builder => ({
    getTag: builder.query<ITag, string>({
      query(id) {
        return {
          url: `/v1/tags/${id}`
        }
      },
      providesTags: (_result, _error, id) => [{ type: 'Tags', id }]
    }),
    getTags: builder.query<GenericResultResponse<ITag>, { search: string; page?: number; limit?: number }>({
      query(params) {
        return {
          url: `/v1/tags`,
          params
        }
      },
      providesTags: result =>
        result
          ? [
              ...result.results.map(({ id }) => ({
                type: 'Tags' as const,
                id
              })),
              { type: 'Tags', id: 'LIST' }
            ]
          : [{ type: 'Tags', id: 'LIST' }]
    }),
    createTag: builder.mutation<ITag, FormData>({
      query(tag) {
        return {
          url: '/v1/tags',
          method: 'POST',
          body: tag
        }
      },
      invalidatesTags: [{ type: 'Tags', id: 'LIST' }]
    }),
    updateTag: builder.mutation<ITag, { id: string; tag: FormData }>({
      query({ id, tag }) {
        return {
          url: `/v1/tags/${id}`,
          method: 'PATCH',
          body: tag
        }
      },
      invalidatesTags: (result, _error, { id }) =>
        result
          ? [
              { type: 'Tags', id },
              { type: 'Tags', id: 'LIST' }
            ]
          : [{ type: 'Tags', id: 'LIST' }]
    }),
    deleteTag: builder.mutation<ITag, string>({
      query(id) {
        return {
          url: `/v1/tags/${id}`,
          method: 'Delete'
        }
      },
      invalidatesTags: [{ type: 'Tags', id: 'LIST' }]
    }),
    exportTags: builder.query<string, { role: string }>({
      query(params) {
        return {
          url: `/v1/tags/export`,
          method: 'GET',
          params,
          responseHandler: 'text'
        }
      }
    }),
    linkTag: builder.mutation<ITag, { id: string; tag: FormData }>({
      query({ id, tag }) {
        return {
          url: `/v1/tags/link/${id}`,
          method: 'POST',
          body: tag
        }
      }
    }),
    unLinkTag: builder.mutation<ITag, { id: string; tag: FormData }>({
      query(id) {
        return {
          url: `/v1/tags/unlink/${id}`,
          method: 'POST'
        }
      }
    })
  })
})

export const {
  useGetTagQuery,
  useGetTagsQuery,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
  useLazyExportTagsQuery,
  useLinkTagMutation,
  useUnLinkTagMutation
} = tagApi as any
