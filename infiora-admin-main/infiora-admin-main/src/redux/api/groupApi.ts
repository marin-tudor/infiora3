import { createApi } from "@reduxjs/toolkit/query/react";
import customFetchBase from "./customFetchBase";
import type { GenericResultResponse, IGroup } from "@/types";

export const groupApi = createApi({
  reducerPath: "groupApi",
  baseQuery: customFetchBase,
  tagTypes: ["Groups"],
  endpoints: (builder) => ({
    getGroup: builder.query<IGroup, string>({
      query(id) {
        return {
          url: `/v1/groups/${id}`,
          credentials: "include",
        };
      },
      providesTags: (_result, _error, id) => [{ type: "Groups", id }],
    }),
    getGroups: builder.query<
      GenericResultResponse<IGroup>,
      { user?: string; search: string; page?: number; limit?: number }
    >({
      query(params) {
        return {
          url: `/v1/groups`,
          params,
          credentials: "include",
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.results.map(({ id }) => ({
                type: "Groups" as const,
                id,
              })),
              { type: "Groups", id: "LIST" },
            ]
          : [{ type: "Groups", id: "LIST" }],
    }),
    createGroup: builder.mutation<IGroup, FormData>({
      query(group) {
        return {
          url: "/v1/groups",
          method: "POST",
          credentials: "include",
          body: group,
        };
      },
      invalidatesTags: [{ type: "Groups", id: "LIST" }],
    }),
    updateGroup: builder.mutation<IGroup, { id: string; group: FormData }>({
      query({ id, group }) {
        return {
          url: `/v1/groups/${id}`,
          method: "PATCH",
          credentials: "include",
          body: group,
        };
      },
      invalidatesTags: (result, _error, { id }) =>
        result
          ? [
              { type: "Groups", id },
              { type: "Groups", id: "LIST" },
            ]
          : [{ type: "Groups", id: "LIST" }],
    }),
    deleteGroup: builder.mutation<IGroup, string>({
      query(id) {
        return {
          url: `/v1/groups/${id}`,
          method: "Delete",
          credentials: "include",
        };
      },
      invalidatesTags: [{ type: "Groups", id: "LIST" }],
    }),
    exportGroups: builder.query<string, { role: string }>({
      query(params) {
        return {
          url: `/v1/groups/export`,
          method: "GET",
          params,
          credentials: "include",
          responseHandler: "text",
        };
      },
    }),
    duplicateGroup: builder.mutation<IGroup, { id: string; hotel: string }>({
      query({ id, ...body }) {
        return {
          url: `/v1/groups/duplicate/${id}`,
          method: "POST",
          body,
        };
      },
      invalidatesTags: [{ type: "Groups", id: "LIST" }],
    }),
  }),
});

export const {
  useGetGroupQuery,
  useGetGroupsQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useLazyExportGroupsQuery,
  useDuplicateGroupMutation,
} = groupApi as any;
