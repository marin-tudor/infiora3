'use client'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { isValidEmail } from '@/lib/guestValidation'

const API = process.env.NEXT_PUBLIC_API_URL
const guestStatusTokenStorageKey = (roomId: string) => `guestStatusToken:${roomId}`
const bookingTokenStorageKey = (roomId: string) => `guestBookingTokens:${roomId}`
const BOOKING_TOKEN_TTL_MS = 2 * 60 * 60 * 1000

interface PaymentMethods {
  cash: boolean
  card: boolean
  online: boolean
}

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

export default function GuestBookingConfirmPage({ roomId }: { roomId: string }) {
  const sp = useSearchParams()
  const router = useRouter()
  const guestEmailInputRef = useRef<HTMLInputElement>(null)
  const guestRoomInputRef = useRef<HTMLInputElement>(null)
  const reservationCodeInputRef = useRef<HTMLInputElement>(null)
  const bookingSubmissionKeyRef = useRef<string | null>(null)

  const hotelId = sp.get('hotelId') ?? ''
  const itemId = sp.get('itemId') ?? ''
  const itemName = sp.get('itemName') ?? ''
  const startTime = sp.get('startTime') ?? ''
  const endTime = sp.get('endTime') ?? ''
  const maxPersons = parseInt(sp.get('maxPersons') ?? '1')
  const slotType = sp.get('slotType') ?? 'private'
  const price = parseFloat(sp.get('price') ?? '0')
  const cancelPolicyHours = parseInt(sp.get('cancelPolicyHours') ?? '24')
  const categoryId = sp.get('categoryId') ?? ''

  const addonsRaw = sp.get('addons') ?? '[]'
  const addons: { _id: string; name: string; price: number; description: string }[] = (() => {
    try {
      return JSON.parse(addonsRaw)
    } catch {
      return []
    }
  })()
  const pricePerPerson = sp.get('pricePerPerson') === 'true'

  const [partySize, setPartySize] = useState(1)
  const [guestEmail, setGuestEmail] = useState('')
  const [guestRoomNumber, setGuestRoomNumber] = useState('')
  const [reservationCode, setReservationCode] = useState('')
  const [note, setNote] = useState('')
  const [payment, setPayment] = useState<'room' | 'cash' | 'card'>('room')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [requireCode, setRequireCode] = useState(true)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods>({ cash: true, card: true, online: false })
  const [showWaitlist, setShowWaitlist] = useState(false)
  const [waitlistDone, setWaitlistDone] = useState(false)
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set())
  const [discountCode, setDiscountCode] = useState('')
  const [discountApplied, setDiscountApplied] = useState<{
    code: string
    discountAmount: number
    newTotal: number
  } | null>(null)
  const [discountLoading, setDiscountLoading] = useState(false)
  const [discountError, setDiscountError] = useState('')
  const [guestEmailError, setGuestEmailError] = useState('')
  const [guestRoomError, setGuestRoomError] = useState('')
  const [reservationCodeError, setReservationCodeError] = useState('')

  useEffect(() => {
    bookingSubmissionKeyRef.current = null
  }, [guestEmail, guestRoomNumber, reservationCode, note, payment, partySize, selectedAddonIds, discountApplied, startTime, itemId])

  useEffect(() => {
    fetch(`${API}/v1/orders/rooms/${roomId}/catalog`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        setRequireCode(data?.settings?.requireCode !== false)
        const methods = data?.settings?.paymentMethods

        if (methods) {
          setPaymentMethods(methods)

          if (methods.card) setPayment('card')
          else if (methods.cash) setPayment('cash')
          else setPayment('room')
        }
      })
      .catch(() => {})
  }, [roomId])

  const toggleAddon = (id: string) => {
    setSelectedAddonIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectedAddonsPayload = addons
    .filter(a => selectedAddonIds.has(a._id))
    .map(a => ({ addonId: a._id, name: a.name, price: a.price }))

  const addonTotal = addons
    .filter(a => selectedAddonIds.has(a._id))
    .reduce((sum, a) => sum + a.price, 0)
  const basePrice = pricePerPerson ? price * partySize : price
  const displayTotal = basePrice + addonTotal
  const payableTotal = discountApplied?.newTotal ?? displayTotal

  const clearDiscountState = () => {
    setDiscountApplied(null)
    setDiscountError('')
  }

  const adjustPartySize = (next: number) => {
    setPartySize(Math.min(maxPersons, Math.max(1, next)))
    clearDiscountState()
  }

  const applyDiscount = async () => {
    if (!discountCode.trim()) return

    setDiscountLoading(true)
    setDiscountError('')
    try {
      const res = await fetch(`${API}/v1/orders/validate-discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId,
          code: discountCode.trim(),
          items: [
            {
              itemId,
              qty: 1,
              categoryId,
              price: displayTotal,
            },
          ],
          totalAmount: displayTotal,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.valid) {
        setDiscountApplied(null)
        setDiscountError(data.reason || data.message || 'Discount code is invalid.')
        return
      }

      setDiscountApplied({
        code: discountCode.trim().toUpperCase(),
        discountAmount: data.discountAmount,
        newTotal: data.newTotal,
      })
    } catch {
      setDiscountError('Failed to validate discount code.')
    } finally {
      setDiscountLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!guestEmail.trim()) {
      setGuestEmailError('Email is required.')
      guestEmailInputRef.current?.focus()
      return
    }
    if (!isValidEmail(guestEmail)) {
      setGuestEmailError('Enter a valid email address.')
      guestEmailInputRef.current?.focus()
      return
    }
    if (!guestRoomNumber.trim()) {
      setGuestRoomError('Room number is required.')
      guestRoomInputRef.current?.focus()
      return
    }
    if (requireCode && !reservationCode.trim()) {
      setReservationCodeError('Please enter your reservation code.')
      reservationCodeInputRef.current?.focus()
      return
    }

    setLoading(true)
    setError('')
    setGuestEmailError('')
    setGuestRoomError('')
    setReservationCodeError('')
    try {
      const idempotencyKey = bookingSubmissionKeyRef.current || crypto.randomUUID()
      bookingSubmissionKeyRef.current = idempotencyKey
      const res = await fetch(`${API}/v1/hotels/${hotelId}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          startTime,
          partySize,
          guestEmail,
          guestRoomNumber,
          roomId,
          code: reservationCode.trim(),
          note,
          payment,
          selectedAddons: selectedAddonsPayload,
          idempotencyKey,
          ...(discountApplied ? { discountCode: discountApplied.code } : {}),
        }),
      })
      const data = await res.json()
      if (res.status === 409 && data.code === 'SLOT_UNAVAILABLE') {
        setShowWaitlist(true)
      } else if (res.ok) {
        if (typeof window !== 'undefined' && data?.id && data?.guestCancelToken) {
          const tokenMap = readBookingTokens(roomId)

          tokenMap[data.id] = data.guestCancelToken
          writeBookingTokens(roomId, tokenMap)
        }
        if (typeof window !== 'undefined' && data?.guestStatusToken) {
          window.sessionStorage.setItem(guestStatusTokenStorageKey(roomId), data.guestStatusToken)
        }
        if (data?.guestStatusToken) {
          bookingSubmissionKeyRef.current = null
          router.push(`/${roomId}/guest-status`)
        } else {
          bookingSubmissionKeyRef.current = null
          router.push(`/${roomId}/bookings`)
        }
      } else {
        setError(data.message ?? 'Booking failed.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinWaitlist = async () => {
    setLoading(true)
    try {
      await fetch(`${API}/v1/hotels/${hotelId}/bookings/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, slotStartTime: startTime, guestEmail, guestRoomNumber, partySize }),
      })
      setWaitlistDone(true)
    } catch {
      setError('Failed to join waitlist.')
    } finally {
      setLoading(false)
    }
  }

  if (waitlistDone) {
    return (
      <div style={{ padding: 24, maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>Done</div>
        <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Added to waitlist</h2>
        <p style={{ color: '#666' }}>We&apos;ll email you when a spot opens up.</p>
        <button onClick={() => router.push(`/${roomId}/bookings`)} style={{ marginTop: 24, padding: '12px 24px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          Back to Services
        </button>
      </div>
    )
  }

  if (showWaitlist) {
    return (
      <div style={{ padding: 24, maxWidth: 480, margin: '0 auto' }}>
        <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Slot just taken</h2>
        <p style={{ color: '#666', marginBottom: 24 }}>This slot was just booked. Join the waitlist and we&apos;ll notify you if a spot opens.</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={handleJoinWaitlist} disabled={loading} style={{ flex: 1, padding: '12px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            {loading ? 'Joining...' : 'Join Waitlist'}
          </button>
          <button onClick={() => router.back()} style={{ flex: 1, padding: '12px', background: '#f5f5f5', color: '#333', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Go back
          </button>
        </div>
        {error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}
      </div>
    )
  }

  const startDate = new Date(startTime)
  const endDate = new Date(endTime)

  return (
    <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Confirm Booking</h2>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>Cancellation policy: {cancelPolicyHours}h before start.</p>

      <div style={{ background: '#f5f5f5', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{itemName}</div>
        <div style={{ color: '#444', fontSize: 14 }}>
          {startDate.toLocaleDateString()} - {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        {slotType === 'shared' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <span style={{ fontSize: 13, color: '#666' }}>Guests</span>
            <button type='button' onClick={() => adjustPartySize(partySize - 1)} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 16 }}>-</button>
            <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 600 }}>{partySize}</span>
            <button type='button' onClick={() => adjustPartySize(partySize + 1)} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 16 }}>+</button>
            <span style={{ fontSize: 12, color: '#888' }}>max {maxPersons}</span>
          </div>
        )}
        <div style={{ color: '#444', fontSize: 14, marginTop: 8 }}>
          {discountApplied ? (
            <>
              <span style={{ textDecoration: 'line-through', color: '#888', marginRight: 8 }}>EUR {displayTotal.toFixed(2)}</span>
              <span style={{ fontWeight: 700, color: '#1976d2' }}>EUR {payableTotal.toFixed(2)}</span>
            </>
          ) : (
            <>EUR {displayTotal.toFixed(2)}</>
          )}
        </div>
      </div>

      {addons.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Add-ons</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {addons.map(addon => {
              const selected = selectedAddonIds.has(addon._id)
              return (
                <div
                  key={addon._id}
                  onClick={() => {
                    toggleAddon(addon._id)
                    clearDiscountState()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: `1px solid ${selected ? '#1976d2' : '#e0e0e0'}`,
                    background: selected ? '#e3f2fd' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: `2px solid ${selected ? '#1976d2' : '#bbb'}`,
                      background: selected ? '#1976d2' : '#fff',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selected && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1, fontWeight: 700 }}>OK</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{addon.name}</div>
                    {addon.description && <div style={{ color: '#666', fontSize: 12 }}>{addon.description}</div>}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1976d2' }}>
                    {addon.price === 0 ? 'Free' : `+EUR ${addon.price.toFixed(2)}`}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <input
            ref={guestEmailInputRef}
            placeholder='Your email *'
            type='email'
            value={guestEmail}
            onChange={e => {
              setGuestEmail(e.target.value)
              setGuestEmailError('')
            }}
            style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${guestEmailError ? '#d32f2f' : '#ccc'}`, fontSize: 14, width: '100%' }}
            aria-invalid={guestEmailError ? 'true' : 'false'}
          />
          {guestEmailError && <p style={{ color: '#d32f2f', fontSize: 12, margin: '6px 0 0' }}>{guestEmailError}</p>}
        </div>
        <div>
          <input
            ref={guestRoomInputRef}
            placeholder='Room number *'
            value={guestRoomNumber}
            onChange={e => {
              setGuestRoomNumber(e.target.value)
              setGuestRoomError('')
            }}
            style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${guestRoomError ? '#d32f2f' : '#ccc'}`, fontSize: 14, width: '100%' }}
            aria-invalid={guestRoomError ? 'true' : 'false'}
          />
          {guestRoomError && <p style={{ color: '#d32f2f', fontSize: 12, margin: '6px 0 0' }}>{guestRoomError}</p>}
        </div>
        {requireCode && (
          <div>
            <input
              ref={reservationCodeInputRef}
              placeholder='Reservation code *'
              value={reservationCode}
              onChange={e => {
                setReservationCode(e.target.value)
                setReservationCodeError('')
              }}
              style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${reservationCodeError ? '#d32f2f' : '#ccc'}`, fontSize: 14, width: '100%' }}
              aria-invalid={reservationCodeError ? 'true' : 'false'}
            />
            {reservationCodeError && <p style={{ color: '#d32f2f', fontSize: 12, margin: '6px 0 0' }}>{reservationCodeError}</p>}
          </div>
        )}

        {slotType === 'shared' && (
          <div>
            <label style={{ fontSize: 13, color: '#666', marginBottom: 4, display: 'block' }}>Party size (max {maxPersons})</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type='button' onClick={() => adjustPartySize(partySize - 1)} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 18 }}>-</button>
              <input type='number' min={1} max={maxPersons} value={partySize} onChange={e => adjustPartySize(parseInt(e.target.value) || 1)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14, width: '100%', textAlign: 'center' }} />
              <button type='button' onClick={() => adjustPartySize(partySize + 1)} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 18 }}>+</button>
            </div>
          </div>
        )}

        <div>
          <label style={{ fontSize: 13, color: '#666', marginBottom: 4, display: 'block' }}>Discount code</label>
          {!discountApplied ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder='Discount code'
                value={discountCode}
                onChange={e => {
                  setDiscountCode(e.target.value.toUpperCase())
                  setDiscountError('')
                }}
                style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14, flex: 1, textTransform: 'uppercase', letterSpacing: 1 }}
              />
              <button
                type='button'
                onClick={applyDiscount}
                disabled={discountLoading || !discountCode.trim()}
                style={{ padding: '10px 14px', background: discountLoading || !discountCode.trim() ? '#90caf9' : '#1976d2', color: '#fff', border: 'none', borderRadius: 8, cursor: discountLoading || !discountCode.trim() ? 'not-allowed' : 'pointer', fontWeight: 600 }}
              >
                {discountLoading ? '...' : 'Apply'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: '#e8f5e9', border: '1px solid #c8e6c9' }}>
              <span style={{ fontSize: 13, color: '#2e7d32' }}>
                {discountApplied.code} applied, saving EUR {discountApplied.discountAmount.toFixed(2)}
              </span>
              <button
                type='button'
                onClick={() => {
                  setDiscountCode('')
                  clearDiscountState()
                }}
                style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 16 }}
              >
                x
              </button>
            </div>
          )}
          {discountError && <p style={{ color: 'red', marginTop: 8, fontSize: 13 }}>{discountError}</p>}
        </div>

        <select value={payment} onChange={e => setPayment(e.target.value as 'room' | 'cash' | 'card')} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}>
          <option value='room'>Pay at hotel / room charge</option>
          {paymentMethods.cash && <option value='cash'>Cash on arrival</option>}
          {paymentMethods.card && <option value='card'>Card on terminal</option>}
        </select>

        <textarea placeholder='Special requests (optional)' value={note} onChange={e => setNote(e.target.value)} rows={3} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14, resize: 'vertical' }} />
      </div>

      {error && <p style={{ color: 'red', marginTop: 12, fontSize: 13 }}>{error}</p>}

      <button onClick={handleSubmit} disabled={loading} style={{ marginTop: 20, width: '100%', padding: '14px', background: loading ? '#90caf9' : '#1976d2', color: '#fff', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 16 }}>
        {loading ? 'Booking...' : `Confirm Booking - EUR ${payableTotal.toFixed(2)}`}
      </button>
    </div>
  )
}
