'use client'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL
const guestStatusTokenStorageKey = (roomId: string) => `guestStatusToken:${roomId}`

interface OrderStatusItem {
  id: string
  orderId: string
  roomNumber?: string
  guestRoomNumber?: string
  total: number
  payment: string
  status: string
  acceptedEta?: number | null
  scheduledFor?: string | null
  createdAt: string
  items: { name: string; qty: number }[]
}

interface BookingStatusItem {
  id: string
  bookingRef: string
  itemName: string
  guestRoomNumber?: string
  startTime: string
  endTime: string
  partySize: number
  status: string
  payment: string
  total: number
  createdAt: string
}

interface StatusPayload {
  hotel: { id: string; name: string }
  email: string
  orders: OrderStatusItem[]
  bookings: BookingStatusItem[]
}

export default function GuestStatusLookupPage({ roomId }: { roomId: string }) {
  const [data, setData] = useState<StatusPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const tokenFromStorage =
      typeof window !== 'undefined' ? window.sessionStorage.getItem(guestStatusTokenStorageKey(roomId)) ?? '' : ''
    let tokenFromHash = ''

    if (typeof window !== 'undefined') {
      const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
      const hashParams = new URLSearchParams(hash)
      tokenFromHash = hashParams.get('token') ?? ''
    }

    const token = tokenFromHash || tokenFromStorage

    if (!token) {
      setError('Missing status token.')
      setLoading(false)
      return
    }

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(guestStatusTokenStorageKey(roomId), token)
      const nextUrl = new URL(window.location.href)
      nextUrl.hash = ''
      window.history.replaceState({}, '', nextUrl.toString())
    }

    fetch(`${API}/v1/orders/guest-status/exchange`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async response => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload.message || 'Failed to load status page.')
        }
        return payload
      })
      .then(payload => setData(payload))
      .catch(err => setError(err.message || 'Failed to load status page.'))
      .finally(() => setLoading(false))
  }, [roomId])

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}>Loading status...</div>

  if (error) {
    const isMissingToken = error === 'Missing status token.'

    return (
      <div style={{ padding: 24, maxWidth: 640, margin: '0 auto' }}>
        <div style={{ border: '1px solid #f0d2d2', borderRadius: 16, padding: 24, background: '#fff8f8' }}>
          <h1 style={{ margin: '0 0 10px', fontSize: 28 }}>Status unavailable</h1>
          <p style={{ margin: '0 0 16px', color: '#7a3b3b', lineHeight: 1.6 }}>{error}</p>
          <p style={{ margin: 0, color: '#666', lineHeight: 1.6 }}>
            {isMissingToken
              ? 'Open the private status link from your email, or request a new one from the room page.'
              : 'If the link expired, request a fresh private status link from the room page and try again.'}
          </p>
          <div style={{ marginTop: 18 }}>
            <a href={`/${roomId}`} style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}>
              Back to room page
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, margin: '0 0 8px', fontWeight: 700 }}>Your status</h1>
        <div style={{ color: '#555', fontSize: 14 }}>{data.hotel.name}</div>
        <div style={{ color: '#777', fontSize: 13 }}>{data.email}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>Orders</h2>
        {data.orders.length === 0 && <div style={{ color: '#777' }}>No orders found for this email.</div>}
        {data.orders.map(order => (
          <div key={order.id} style={{ border: '1px solid #e0e0e0', borderRadius: 12, padding: 16, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{order.orderId}</div>
                <div style={{ color: '#666', fontSize: 13 }}>
                  {new Date(order.createdAt).toLocaleString()}
                  {order.guestRoomNumber ? ` | Room ${order.guestRoomNumber}` : order.roomNumber ? ` | Room ${order.roomNumber}` : ''}
                </div>
              </div>
              <div style={{ fontWeight: 700 }}>{order.status}</div>
            </div>
            <div style={{ color: '#444', fontSize: 13, marginTop: 8 }}>
              {order.items.map(item => `${item.qty}x ${item.name}`).join(', ')}
            </div>
            <div style={{ color: '#666', fontSize: 13, marginTop: 8 }}>
              Total: EUR {order.total.toFixed(2)} | Payment: {order.payment}
              {order.acceptedEta ? ` | ETA ${order.acceptedEta} min` : ''}
              {order.scheduledFor ? ` | Scheduled ${new Date(order.scheduledFor).toLocaleString()}` : ''}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>Bookings</h2>
        {data.bookings.length === 0 && <div style={{ color: '#777' }}>No bookings found for this email.</div>}
        {data.bookings.map(booking => (
          <div key={booking.id} style={{ border: '1px solid #e0e0e0', borderRadius: 12, padding: 16, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{booking.itemName}</div>
                <div style={{ color: '#666', fontSize: 13 }}>
                  {booking.bookingRef} | {new Date(booking.startTime).toLocaleString()}
                </div>
              </div>
              <div style={{ fontWeight: 700 }}>{booking.status}</div>
            </div>
            <div style={{ color: '#666', fontSize: 13, marginTop: 8 }}>
              Party of {booking.partySize}
              {booking.guestRoomNumber ? ` | Room ${booking.guestRoomNumber}` : ''}
              {' | '}
              Total: EUR {booking.total.toFixed(2)}
              {' | '}
              Payment: {booking.payment}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <a href={`/${roomId}`} style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}>Back to room page</a>
      </div>
    </div>
  )
}
