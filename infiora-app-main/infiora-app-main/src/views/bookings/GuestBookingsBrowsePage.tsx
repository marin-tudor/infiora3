'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL

interface BookableItem {
  id: string
  name: string
  description?: string
  price: number
  image?: string
  imageType: string
  bookingConfig?: {
    duration: number
    slotType: 'private' | 'shared'
    maxPersons: number
    cancelPolicyHours: number
    advanceMaxDays: number
    requiresApproval: boolean
    addons?: { _id: string; name: string; price: number; description: string }[]
    pricePerPerson?: boolean
  }
}

interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  maxPersons: number
  bookedPersons: number
  isBlocked: boolean
}

export default function GuestBookingsBrowsePage({ roomId }: { roomId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedItemId = searchParams.get('itemId')
  const [hotelId, setHotelId] = useState('')
  const [items, setItems] = useState<BookableItem[]>([])
  const [selectedItem, setSelectedItem] = useState<BookableItem | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusEmail, setStatusEmail] = useState('')
  const [sendingStatusLink, setSendingStatusLink] = useState(false)
  const [statusLinkMessage, setStatusLinkMessage] = useState('')
  const availableSlots = slots.filter(slot => !slot.isBlocked && slot.bookedPersons < slot.maxPersons)

  useEffect(() => {
    const load = async () => {
      try {
        const [roomRes, catalogRes] = await Promise.all([
          fetch(`${API}/v1/rooms/${roomId}`),
          fetch(`${API}/v1/orders/rooms/${roomId}/catalog`),
        ])
        const roomData = await roomRes.json()
        const catalogData = await catalogRes.json()
        setHotelId(roomData.hotel?.id ?? '')
        const bookable = (catalogData.items ?? []).filter((i: any) => i.type === 'bookable')
        setItems(bookable)
        if (preselectedItemId) {
          const match = bookable.find((i: any) => i.id === preselectedItemId)
          if (match) setSelectedItem(match)
        }
      } catch {
        setError('Failed to load bookable services.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [roomId, preselectedItemId])

  useEffect(() => {
    if (!selectedItem || !hotelId) return
    const nextDay = new Date(selectedDate)
    nextDay.setDate(nextDay.getDate() + 1)
    setLoadingSlots(true)
    fetch(
      `${API}/v1/hotels/${hotelId}/bookings/timeslots?itemId=${selectedItem.id}&from=${selectedDate}&to=${nextDay.toISOString().slice(0, 10)}`
    )
      .then(r => r.json())
      .then(data => setSlots(Array.isArray(data) ? data : []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [selectedItem, selectedDate, hotelId])

  const handleSelectSlot = (slot: TimeSlot) => {
    if (!selectedItem) return
    const params = new URLSearchParams({
      hotelId,
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      slotId: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      maxPersons: String(selectedItem.bookingConfig?.maxPersons ?? 1),
      slotType: selectedItem.bookingConfig?.slotType ?? 'private',
      price: String(selectedItem.price ?? 0),
      cancelPolicyHours: String(selectedItem.bookingConfig?.cancelPolicyHours ?? 24),
      addons: JSON.stringify(selectedItem.bookingConfig?.addons ?? []),
      pricePerPerson: String(selectedItem.bookingConfig?.pricePerPerson ?? false),
    })
    router.push(`/${roomId}/bookings/confirm?${params.toString()}`)
  }

  const handleSendStatusLink = async () => {
    const normalizedEmail = statusEmail.trim()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setStatusLinkMessage('Enter a valid email address.')
      return
    }

    setSendingStatusLink(true)
    setStatusLinkMessage('')
    try {
      const response = await fetch(`${API}/v1/orders/rooms/${roomId}/status-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      })
      const data = await response.json().catch(() => ({}))
      setStatusLinkMessage(response.ok ? 'If we found your orders or bookings, we sent you a private link by email.' : data.message || 'Failed to send status link.')
    } catch {
      setStatusLinkMessage('Failed to send status link.')
    } finally {
      setSendingStatusLink(false)
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + (selectedItem?.bookingConfig?.advanceMaxDays ?? 60))
  const maxDateStr = maxDate.toISOString().slice(0, 10)

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}>Loading...</div>
  if (error) return <div style={{ padding: 24, color: 'red' }}>{error}</div>
  if (items.length === 0) return <div style={{ padding: 24, textAlign: 'center' }}>No bookable services available.</div>

  return (
    <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>Bookable Services</h2>

      <div style={{ border: '1px solid #e0e0e0', borderRadius: 12, padding: 16, background: '#fafafa', marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Check your status</div>
        <div style={{ color: '#666', fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
          Enter your email and we&apos;ll send you a private link with your orders and bookings for this hotel.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type='email'
            value={statusEmail}
            onChange={e => setStatusEmail(e.target.value)}
            placeholder='Your email'
            style={{ flex: 1, minWidth: 180, padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
          />
          <button
            onClick={handleSendStatusLink}
            disabled={sendingStatusLink}
            style={{ padding: '10px 14px', borderRadius: 8, border: 'none', background: '#1976d2', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
          >
            {sendingStatusLink ? 'Sending...' : 'Email me the link'}
          </button>
        </div>
        {statusLinkMessage && <div style={{ marginTop: 10, fontSize: 12, color: statusLinkMessage.startsWith('Failed') || statusLinkMessage.startsWith('Enter') ? '#c62828' : '#2e7d32' }}>{statusLinkMessage}</div>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {items.map(item => (
          <div
            key={item.id}
            onClick={() => setSelectedItem(item)}
            style={{
              border: `2px solid ${selectedItem?.id === item.id ? '#1976d2' : '#e0e0e0'}`,
              borderRadius: 12,
              padding: 16,
              cursor: 'pointer',
              background: selectedItem?.id === item.id ? '#e3f2fd' : '#fff',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 16 }}>{item.name}</div>
            {item.description && <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>{item.description}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13 }}>
              <span>{item.bookingConfig?.duration ?? 60} min | {item.bookingConfig?.slotType === 'shared' ? 'Shared' : 'Private'}</span>
              <span style={{ fontWeight: 600 }}>EUR {item.price}</span>
            </div>
          </div>
        ))}
      </div>

      {selectedItem && (
        <div>
          <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Pick a date and slot</h3>
          <input
            type='date'
            value={selectedDate}
            min={today}
            max={maxDateStr}
            onChange={e => setSelectedDate(e.target.value)}
            style={{ marginBottom: 16, padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14, width: '100%' }}
          />

          {loadingSlots && <div style={{ textAlign: 'center', color: '#999' }}>Loading slots...</div>}

          {!loadingSlots && availableSlots.length === 0 && (
            <div style={{ color: '#999', textAlign: 'center' }}>No slots available for this date.</div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {slots.map(slot => {
              const available = !slot.isBlocked && slot.bookedPersons < slot.maxPersons
              const spotsLeft = slot.maxPersons - slot.bookedPersons
              const timeStr = new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              return (
                <button
                  key={slot.id}
                  disabled={!available}
                  onClick={() => handleSelectSlot(slot)}
                  style={{
                    padding: '10px 6px',
                    borderRadius: 8,
                    border: 'none',
                    background: available ? '#1976d2' : '#e0e0e0',
                    color: available ? '#fff' : '#999',
                    cursor: available ? 'pointer' : 'not-allowed',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {timeStr}
                  {selectedItem.bookingConfig?.slotType === 'shared' && available && (
                    <div style={{ fontSize: 11, fontWeight: 400 }}>{spotsLeft} left</div>
                  )}
                  {!available && <div style={{ fontSize: 11 }}>{slot.isBlocked ? 'Blocked' : 'Full'}</div>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
