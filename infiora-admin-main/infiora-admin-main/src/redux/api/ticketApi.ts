import { createApi } from '@reduxjs/toolkit/query/react';
import customFetchBase from './customFetchBase';
import type { GenericResultResponse, ITicket } from '@/types';

export const ticketApi = createApi({
  reducerPath: 'ticketApi',
  baseQuery: customFetchBase,
  tagTypes: ['Tickets'],
  endpoints: (builder) => ({
    getTicket: builder.query<ITicket, string>({
      query(id) {
        return {
          url: `/v1/tickets/${id}`,
          credentials: 'include',
        };
      },
      providesTags: (_result, _error, id) => [
        { type: 'Tickets', id },
      ],
    }),
    getTickets: builder.query<
      GenericResultResponse<ITicket>,
      { user?: string; search: string; page?: number; limit?: number }
    >({
      query(params) {
        return {
          url: `/v1/tickets`,
          params,
          credentials: 'include',
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.results.map(({ id }) => ({
                type: 'Tickets' as const,
                id,
              })),
              { type: 'Tickets', id: 'LIST' },
            ]
          : [{ type: 'Tickets', id: 'LIST' }],
    }),
    createTicket: builder.mutation<ITicket, FormData>({
      query(ticket) {
        return {
          url: '/v1/tickets',
          method: 'POST',
          credentials: 'include',
          body: ticket,
        };
      },
      invalidatesTags: [{ type: 'Tickets', id: 'LIST' }],
    }),
    updateTicket: builder.mutation<
      ITicket,
      { id: string; ticket: FormData }
    >({
      query({ id, ticket }) {
        return {
          url: `/v1/tickets/${id}`,
          method: 'PATCH',
          credentials: 'include',
          body: ticket,
        };
      },
      invalidatesTags: (result, _error, { id }) =>
        result
          ? [
              { type: 'Tickets', id },
              { type: 'Tickets', id: 'LIST' },
            ]
          : [{ type: 'Tickets', id: 'LIST' }],
    }),
    deleteTicket: builder.mutation<ITicket, string>({
      query(id) {
        return {
          url: `/v1/tickets/${id}`,
          method: 'Delete',
          credentials: 'include',
        };
      },
      invalidatesTags: [{ type: 'Tickets', id: 'LIST' }],
    }),
    exportTickets: builder.query<string, { role: string }>({
      query(params) {
        return {
          url: `/v1/tickets/export`,
          method: 'GET',
          params,
          credentials: 'include',
          responseHandler: 'text',
        };
      },
    }),
  }),
});

export const {
  useGetTicketQuery,
  useGetTicketsQuery,
  useCreateTicketMutation,
  useUpdateTicketMutation,
  useDeleteTicketMutation,
  useLazyExportTicketsQuery,
} = ticketApi as any;
