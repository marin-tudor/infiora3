'use client'

import { useGetOrdersQuery } from '@/redux/api/ordersApi'

const UNFINISHED_ORDER_STATUSES = ['Awaiting confirmation', 'Processing', 'On the way'] as const

export function useUnfinishedOrdersCount(hotelId?: string, options?: { skip?: boolean }) {
  const shouldSkip = !hotelId || options?.skip === true

  const awaiting = useGetOrdersQuery(
    { hotelId: hotelId!, status: UNFINISHED_ORDER_STATUSES[0], limit: 1 },
    { skip: shouldSkip, pollingInterval: 10000 }
  )

  const processing = useGetOrdersQuery(
    { hotelId: hotelId!, status: UNFINISHED_ORDER_STATUSES[1], limit: 1 },
    { skip: shouldSkip, pollingInterval: 10000 }
  )

  const onTheWay = useGetOrdersQuery(
    { hotelId: hotelId!, status: UNFINISHED_ORDER_STATUSES[2], limit: 1 },
    { skip: shouldSkip, pollingInterval: 10000 }
  )

  return {
    count:
      (awaiting.data?.totalResults ?? 0) + (processing.data?.totalResults ?? 0) + (onTheWay.data?.totalResults ?? 0),
    isLoading: awaiting.isLoading || processing.isLoading || onTheWay.isLoading
  }
}
