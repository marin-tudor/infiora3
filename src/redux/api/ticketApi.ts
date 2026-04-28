import { createApi } from '@reduxjs/toolkit/query/react'

import customFetchBase from './customFetchBase'

export const ticketApi = createApi({
  reducerPath: 'ticketApi',
  baseQuery: customFetchBase,
  tagTypes: ['Tickets'],
  endpoints: builder => ({
    createTicket: builder.mutation<any, FormData>({
      query(ticket) {
        return {
          url: '/v1/tickets',
          method: 'POST',
          body: ticket
        }
      }
    })
  })
})

export const { useCreateTicketMutation } = ticketApi as any
