'use client'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL
const bookingTokenStorageKey = (roomId: string) => `guestBookingTokens:${roomId}`
const guestStatusTokenStorageKey = (roomId: string) => `guestStatusToken:${roomId}`
const BOOKING_TOKEN_TTL_MS = 2 * 60 * 60 * 1000

interface StoredBookingTokens {
  expiresAt: number
  tokens: Record<string, string>
}

const readBookingTokens = (roomId: string): Record<string, string> => {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.sessionStorage.getItem(bookingTokenStorageKey(roomId))

    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as StoredBookingTokens

    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(bookingTokenStorageKey(roomId))
      return {}
    }

    return parsed.tokens ?? {}
  } catch {
    return {}
  }
}

const writeBookingTokens = (roomId: string, tokens: Record<string, string>) => {
  if (typeof window === 'undefined') {
    return
  }

  if (Object.keys(tokens).length === 0) {
    window.sessionStorage.removeItem(bookingTokenStorageKey(roomId))
    return
  }

  window.sessionStorage.setItem(
    bookingTokenStorageKey(roomId),
    JSON.stringify({
      expiresAt: Date.now() + BOOKING_TOKEN_TTL_MS,
      tokens,
    } satisfies StoredBookingTokens)
  )
}

interface Booking {
  id: string
  bookingRef: string
  itemId: { id: string; name: string } | string
  startTime: string
  endTime: string
  partySize: number
  status: string
  payment: string
  total: number
  cancelPolicyHours?: number
  cancelledAt?: string
}

export default function GuestMyBookingsPage({ roomId }: { roomId: string }) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [bookingTokens, setBookingTokens] = useState<Record<string, string>>({})
  const [guestStatusToken, setGuestStatusToken] = useState('')
  const [notice, setNotice] = useState('')
  const statusLabel = (status: string) =>
    ({
      pending: 'Pending',
      confirmed: 'Confirmed',
      cancelled: 'Cancelled',
      completed: 'Completed',
      no_show: 'No Show',
    })[status] ?? status

  const itemName = (item: Booking['itemId']) => (typeof item === 'string' ? item : item?.name ?? '-')

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      setBookingTokens(readBookingTokens(roomId))
      const tokenFromStorage = window.sessionStorage.getItem(guestStatusTokenStorageKey(roomId)) ?? ''
      const nextToken = tokenFromStorage
      if (nextToken) {
        setGuestStatusToken(nextToken)
        window.sessionStorage.setItem(guestStatusTokenStorageKey(roomId), nextToken)
      }
    } catch {
      setBookingTokens({})
    }
  }, [roomId])

  useEffect(() => {
    fetch(`${API}/v1/rooms/${roomId}`)
      .then(r => r.json())
      .then(room => {
        const hid = room.hotel?.id ?? ''
        if (!hid) {
          setLoading(false)
          return
        }
        if (!guestStatusToken) {
          setLoading(false)
          return
        }
        return fetch(`${API}/v1/hotels/${hid}/rooms/${roomId}/bookings`, {
          headers: { 'x-guest-status-token': guestStatusToken },
        })
          .then(r => r.json())
          .then(data => setBookings(Array.isArray(data) ? data : []))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [guestStatusToken, roomId])

  const handleCancel = async (booking: Booking) => {
    const startMs = new Date(booking.startTime).getTime()
    const nowMs = Date.now()
    const cancelPolicyHours = booking.cancelPolicyHours ?? 24
    if (startMs - nowMs < cancelPolicyHours * 3600 * 1000) {
      setNotice(`Cancellation is no longer available within ${cancelPolicyHours} hours of your booking.`)
      return
    }
    const token = bookingTokens[booking.id]
    if (!token) {
      setNotice('This booking can only be cancelled from the current browser session. Please contact the hotel for help.')
      return
    }
    if (!confirm('Cancel this booking?')) return
    setCancellingId(booking.id)
    try {
      const response = await fetch(`${API}/v1/guest/bookings/${booking.id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (!response.ok) {
        throw new Error('Failed to cancel booking')
      }

      setBookingTokens(prev => {
        const next = { ...prev }
        delete next[booking.id]
        writeBookingTokens(roomId, next)
        return next
      })
      setBookings(prev => prev.map(b => (b.id === booking.id ? { ...b, status: 'cancelled' } : b)))
    } catch {
      setNotice('Failed to cancel. Please try again.')
    } finally {
      setCancellingId(null)
    }
  }

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}>Loading...</div>

  return (
    <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>My Bookings</h2>

      {!guestStatusToken && (
        <div style={{ textAlign: 'center', color: '#999', marginTop: 40 }}>
          Open your private guest status link first to view bookings for this email.
        </div>
      )}

      {notice && (
        <div style={{ marginBottom: 16, borderRadius: 10, background: '#fff7e6', color: '#8a5a00', padding: 12, fontSize: 13 }}>
          {notice}
        </div>
      )}

      {guestStatusToken && bookings.length === 0 && (
        <div style={{ textAlign: 'center', color: '#999', marginTop: 40 }}>No upcoming bookings.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {guestStatusToken && bookings.map(b => {
          const start = new Date(b.startTime)
          const canCancel = ['pending', 'confirmed'].includes(b.status)
          const cancelPolicyHours = b.cancelPolicyHours ?? 24
          return (
            <div key={b.id} style={{ border: '1px solid #e0e0e0', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{itemName(b.itemId)}</div>
                  <div style={{ color: '#666', fontSize: 13, marginTop: 2 }}>
                    {start.toLocaleDateString()} | {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ color: '#666', fontSize: 13 }}>Party of {b.partySize}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Free cancellation until {cancelPolicyHours}h before start</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{b.bookingRef}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 8px', borderRadius: 6, background: b.status === 'confirmed' ? '#e8f5e9' : b.status === 'cancelled' ? '#fce4ec' : '#fff8e1', color: b.status === 'confirmed' ? '#2e7d32' : b.status === 'cancelled' ? '#c62828' : '#f57f17' }}>
                  {statusLabel(b.status)}
                </span>
              </div>
              {canCancel && (
                <button
                  onClick={() => handleCancel(b)}
                  disabled={cancellingId === b.id}
                  style={{ marginTop: 12, width: '100%', padding: '8px', background: '#fff', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                >
                  {cancellingId === b.id ? 'Cancelling...' : 'Cancel Booking'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
