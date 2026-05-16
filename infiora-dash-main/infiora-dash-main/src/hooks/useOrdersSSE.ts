'use client'

import { useEffect, useState } from 'react'

import { useDispatch } from 'react-redux'
import { toast } from 'react-toastify'

import type { AppDispatch } from '@/redux'
import { ordersApi } from '@/redux/api/ordersApi'
import { installNotificationSoundUnlock, playNotificationSound } from '@/utils/soundUtils'

const API = process.env.NEXT_PUBLIC_API_URL

export function useOrdersSSE(hotelId: string | undefined): Set<string> {
  const dispatch = useDispatch<AppDispatch>()
  const [escalatedIds, setEscalatedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!hotelId) return

    installNotificationSoundUnlock()

    const es = new EventSource(`${API}/v1/orders/hotels/${hotelId}/events`, {
      withCredentials: true
    })

    const invalidateOrders = () => {
      dispatch(ordersApi.util.invalidateTags([{ type: 'Orders', id: 'LIST' }]) as any)
    }

    es.addEventListener('rs:new-order', (e: MessageEvent) => {
      let data: any = {}

      try {
        data = JSON.parse(e.data)
      } catch {
        invalidateOrders()

        return
      }

      invalidateOrders()
      playNotificationSound()

      toast.warning(
        `New order. Room ${data.roomNumber || 'N/A'} · ${data.itemCount ?? '?'} item${data.itemCount !== 1 ? 's' : ''} · ${Number(data.total || 0).toFixed(2)} EUR`,
        { autoClose: 8000 }
      )
    })

    es.addEventListener('rs:order-updated', () => {
      invalidateOrders()
    })

    es.addEventListener('escalation_alert', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        const id = data.orderId ?? data.bookingId

        if (id) setEscalatedIds(prev => new Set(prev).add(id))
      } catch {}
    })

    es.onerror = () => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[useOrdersSSE] connection error, auto-reconnecting')
      }
    }

    return () => es.close()
  }, [hotelId, dispatch])

  return escalatedIds
}
