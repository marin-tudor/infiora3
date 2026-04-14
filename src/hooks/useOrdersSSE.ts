'use client'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { toast } from 'react-toastify'

import { ordersApi } from '@/redux/api/ordersApi'
import { playNotificationSound } from '@/utils/soundUtils'
import type { AppDispatch } from '@/redux'

const API = process.env.NEXT_PUBLIC_API_URL

export function useOrdersSSE(hotelId: string | undefined): void {
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    if (!hotelId) return

    const es = new EventSource(
      `${API}/v1/orders/hotels/${hotelId}/events`,
      { withCredentials: true }
    )

    const invalidateOrders = () => {
      dispatch(ordersApi.util.invalidateTags([{ type: 'Orders', id: 'LIST' }]) as any)
    }

    es.addEventListener('rs:new-order', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      invalidateOrders()
      playNotificationSound()
      toast.warning(
        `🔔 New order! Room ${data.roomNumber || 'N/A'} · ${data.itemCount} item${data.itemCount !== 1 ? 's' : ''} · ${Number(data.total).toFixed(2)} €`,
        { autoClose: 8000 }
      )
    })

    es.addEventListener('rs:order-updated', () => {
      invalidateOrders()
    })

    es.onerror = () => {}

    return () => es.close()
  }, [hotelId, dispatch])
}
