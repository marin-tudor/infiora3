'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import ActivityTracker from '@/components/tracking/ActivityTracker'
import StripePaymentForm from '@/components/payments/StripePaymentForm'
import { getAnonymousVisitorId } from '@/lib/visitorIdentity'
import { getBrowserLanguage } from '@/utils/miscUtils'
import { isValidEmail } from '@/lib/guestValidation'
import { discountedPrice, getPaymentLabel, isImgUrl, toDateTimeLocalValue } from '@/utils/orderUtils'
import {
  readTrackingState,
  writeTrackingState,
  clearTrackingState,
  TrackOrder,
} from '@/lib/orderTracking'

const API = process.env.NEXT_PUBLIC_API_URL
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || ''
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

interface Category { id: string; name: string; icon: string; parentId?: string | null }
interface Item {
  id: string; name: string; description?: string; price: number
  discount?: number; image?: string; imageType: string; badge?: string
  available: boolean; categoryId: string; tags?: string[]
  type?: 'instant' | 'bookable'
  bookingConfig?: {
    duration?: number
    slotType?: 'private' | 'shared'
    maxPersons?: number
    cancelPolicyHours?: number
    advanceMaxDays?: number
    addons?: { _id: string; name: string; price: number; description: string }[]
    pricePerPerson?: boolean
  }
}
interface Settings {
  currencySymbol: string; processingLabel: string; onTheWayLabel: string
  completedLabel: string; availableFrom?: string; availableTo?: string
  paymentMethods?: { cash: boolean; card: boolean; online: boolean }
  venueType?: 'hotel' | 'restaurant'
  requireCode?: boolean
  requireLocation?: boolean
  locationLabel?: string
  kioskMode?: boolean
}
interface CartItem { item: Item; qty: number }
interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  maxPersons: number
  bookedPersons: number
  isBlocked: boolean
}

const dp = discountedPrice

export default function GuestOrderPage({ roomId }: { roomId: string }) {
  const onlinePaymentConfigured = stripePublishableKey.length > 0
  const codeInputRef = useRef<HTMLInputElement>(null)
  const roomNumberInputRef = useRef<HTMLInputElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const statusEmailInputRef = useRef<HTMLInputElement>(null)
  const [dark, setDark] = useState(false)
  const [step, setStep] = useState<'menu' | 'checkout'>('menu')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [settings, setSettings] = useState<Settings>({
    currencySymbol: 'EUR ', processingLabel: 'Processing', onTheWayLabel: 'On the way', completedLabel: 'Completed',
    venueType: 'hotel', requireCode: true, requireLocation: true, locationLabel: 'Room number', kioskMode: false
  })
  const [hotelName, setHotelName] = useState('')
  const [hotelImage, setHotelImage] = useState<string | null>(null)
  const [hotelId, setHotelId] = useState('')

  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [activeCat, setActiveCat] = useState('')
  const [activeSub, setActiveSub] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [payment, setPayment] = useState<'cash' | 'card' | 'room' | 'online'>('cash')
  const [note, setNote] = useState('')
  const [email, setEmail] = useState('')
  const [scheduleForLater, setScheduleForLater] = useState(false)
  const [scheduledFor, setScheduledFor] = useState('')
  const [placing, setPlacing] = useState(false)
  const [toast, setToast] = useState('')
  const [trackOrder, setTrackOrder] = useState<TrackOrder | null>(() => readTrackingState(roomId)?.trackOrder ?? null)
  const [trackId, setTrackId] = useState<string>(() => readTrackingState(roomId)?.trackId ?? '')
  const [trackToken, setTrackToken] = useState<string>(() => readTrackingState(roomId)?.trackToken ?? '')
  const [guestRoomNumber, setGuestRoomNumber] = useState('')
  const [roomNumberError, setRoomNumberError] = useState('')
  const [visitId, setVisitId] = useState('')
  const [rating, setRating] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [rated, setRated] = useState(false)
  const [bookingDrawerItem, setBookingDrawerItem] = useState<Item | null>(null)
  const [bookingDrawerDate, setBookingDrawerDate] = useState(new Date().toISOString().slice(0, 10))
  const [bookingDrawerSlots, setBookingDrawerSlots] = useState<TimeSlot[]>([])
  const [bookingDrawerLoadingSlots, setBookingDrawerLoadingSlots] = useState(false)
  const [statusEmail, setStatusEmail] = useState('')
  const [statusEmailError, setStatusEmailError] = useState('')
  const [sendingStatusLink, setSendingStatusLink] = useState(false)
  const [statusLinkMessage, setStatusLinkMessage] = useState('')
  const [discountCode, setDiscountCode] = useState('')
  const [discountApplied, setDiscountApplied] = useState<{
    code: string; discountType: string; discountValue: number; discountAmount: number; newTotal: number
  } | null>(null)
  const [discountLoading, setDiscountLoading] = useState(false)
  const [discountError, setDiscountError] = useState('')
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null)
  const [stripePaymentIntentId, setStripePaymentIntentId] = useState<string | null>(null)
  const [stripeCheckoutId, setStripeCheckoutId] = useState<string | null>(null)
  const [stripeLoading, setStripeLoading] = useState(false)
  const [stripeError, setStripeError] = useState('')
  const trackerRef = useRef<HTMLDivElement>(null)
  const orderSubmissionKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!trackId || !trackToken || !trackOrder) {
      clearTrackingState(roomId)
      return
    }
    writeTrackingState(roomId, { trackId, trackToken, trackOrder })
  }, [roomId, trackId, trackToken, trackOrder])

  useEffect(() => {
    orderSubmissionKeyRef.current = null
  }, [cart, code, guestRoomNumber, email, note, payment, scheduleForLater, scheduledFor, discountApplied, stripeCheckoutId, stripePaymentIntentId])

  // Track order page visit when a fresh guest enters the menu (not a returning guest)
  useEffect(() => {
    if (step !== 'menu' || trackId) return
    const visitorId = getAnonymousVisitorId()
    const language = getBrowserLanguage()?.name || ''
    fetch(`${API}/v1/orders/rooms/${roomId}/visit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId, language })
    }).then(r => r.json()).then(d => { if (d.id) setVisitId(d.id) }).catch(() => {})
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load catalog with no-store to always get fresh items.
  useEffect(() => {
    fetch(`${API}/v1/orders/rooms/${roomId}/catalog?_t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json()).then(data => {
        if (data.categories) {
          setCategories(data.categories)
          setItems(data.items || [])
          setSettings(data.settings || {})
          setHotelName(data.hotelName || '')
          setHotelImage(data.hotelImage || null)
          const topCats = (data.categories as Category[]).filter(c => !c.parentId)
          if (topCats[0]) setActiveCat(topCats[0].id)
          const pm = data.settings?.paymentMethods
          if (pm) {
            if (pm.cash) setPayment('cash')
            else if (pm.card) setPayment('card')
            else if (pm.online && onlinePaymentConfigured) setPayment('online')
          }
        } else {
          setError(data.message || 'Ordering unavailable.')
        }
        setLoading(false)
      }).catch(() => { setError('Failed to load menu.'); setLoading(false) })
  }, [onlinePaymentConfigured, roomId])

  useEffect(() => {
    fetch(`${API}/v1/rooms/${roomId}`)
      .then(r => r.json())
      .then(data => setHotelId(data.hotel?.id ?? ''))
      .catch(() => {})
  }, [roomId])

  useEffect(() => {
    if (!bookingDrawerItem || !hotelId) return
    const nextDay = new Date(bookingDrawerDate)
    nextDay.setDate(nextDay.getDate() + 1)
    setBookingDrawerLoadingSlots(true)
    fetch(
      `${API}/v1/hotels/${hotelId}/bookings/timeslots?itemId=${bookingDrawerItem.id}&from=${bookingDrawerDate}&to=${nextDay.toISOString().slice(0, 10)}`
    )
      .then(r => r.json())
      .then(data => setBookingDrawerSlots(Array.isArray(data) ? data : []))
      .catch(() => setBookingDrawerSlots([]))
      .finally(() => setBookingDrawerLoadingSlots(false))
  }, [bookingDrawerItem, bookingDrawerDate, hotelId])

  useEffect(() => {
    setActiveSub('')
  }, [activeCat])

  const topCats = categories.filter(c => !c.parentId)
  const subCats = categories.filter(c => c.parentId === activeCat)
  const hasSubs = subCats.length > 0

  const visibleItems = items.filter(i => {
    if (hasSubs && activeSub) return i.categoryId === activeSub
    // "All" selected under a parent that has subs: show items in parent OR any sub
    if (hasSubs) return i.categoryId === activeCat || subCats.some(s => s.id === i.categoryId)
    return i.categoryId === activeCat
  })

  const addToCart = (item: Item) => {
    setCart(p => { const e = p.find(c => c.item.id === item.id); if (e) return p.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c); return [...p, { item, qty: 1 }] })
    showToast(`${item.name} added`)
  }
  const removeFromCart = (id: string) => setCart(p => { const e = p.find(c => c.item.id === id); if (e?.qty === 1) return p.filter(c => c.item.id !== id); return p.map(c => c.item.id === id ? { ...c, qty: c.qty - 1 } : c) })
  const cartTotal = cart.reduce((s, c) => s + dp(c.item) * c.qty, 0)
  const cartCount = cart.reduce((s, c) => s + c.qty, 0)
  const payableTotal = discountApplied ? discountApplied.newTotal : cartTotal
  const cur = settings.currencySymbol || 'EUR '

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const availableBookingDrawerSlots = bookingDrawerSlots.filter(slot => !slot.isBlocked && slot.bookedPersons < slot.maxPersons)

  const handleOpenBookingDrawer = (item: Item) => {
    setBookingDrawerItem(item)
    setBookingDrawerDate(new Date().toISOString().slice(0, 10))
    setBookingDrawerSlots([])
  }

  const handleBookingSlotSelect = (slot: TimeSlot) => {
    if (!bookingDrawerItem) return
    const params = new URLSearchParams({
      hotelId,
      itemId: bookingDrawerItem.id,
      itemName: bookingDrawerItem.name,
      slotId: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      maxPersons: String(bookingDrawerItem.bookingConfig?.maxPersons ?? 1),
      slotType: bookingDrawerItem.bookingConfig?.slotType ?? 'private',
      price: String(bookingDrawerItem.price ?? 0),
      categoryId: bookingDrawerItem.categoryId,
      cancelPolicyHours: String(bookingDrawerItem.bookingConfig?.cancelPolicyHours ?? 24),
      addons: JSON.stringify(bookingDrawerItem.bookingConfig?.addons ?? []),
      pricePerPerson: String(bookingDrawerItem.bookingConfig?.pricePerPerson ?? false),
    })
    window.location.href = `/${roomId}/bookings/confirm?${params.toString()}`
  }

  const initStripePayment = useCallback(async () => {
    if (!hotelId || cart.length === 0) return
    if (!onlinePaymentConfigured) {
      setStripeError('Online payment is not configured for this property yet.')
      return
    }

    setStripeLoading(true)
    setStripeError('')
    setStripeClientSecret(null)
    setStripePaymentIntentId(null)
    setStripeCheckoutId(null)

    try {
      const res = await fetch(`${API}/v1/orders/guest/payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          discountCode: discountApplied?.code || undefined,
          items: cart.map(ci => ({
            itemId: ci.item.id,
            qty: ci.qty,
            selectedModifiers: [],
          })),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setStripeError(data.message || 'Online payment is unavailable')
        return
      }

      setStripeClientSecret(data.clientSecret)
      setStripePaymentIntentId(data.paymentIntentId)
      setStripeCheckoutId(data.checkoutId || null)
    } catch {
      setStripeError('Failed to initialize online payment')
    } finally {
      setStripeLoading(false)
    }
  }, [cart, cur, discountApplied?.code, hotelId, onlinePaymentConfigured, roomId])

  useEffect(() => {
    if (step === 'checkout' && payment === 'online' && cart.length > 0 && hotelId) {
      initStripePayment()
      return
    }

    setStripeClientSecret(null)
    setStripePaymentIntentId(null)
    setStripeCheckoutId(null)
    setStripeError('')
  }, [cart.length, hotelId, initStripePayment, payment, step])

  const handlePlace = async (paidPaymentIntentId?: string) => {
    const needsCode = settings.requireCode ?? true
    const needsLocation = settings.requireLocation ?? true
    const isRestaurant = settings.venueType === 'restaurant'

    if (needsCode && !code.trim()) {
      setCodeError(isRestaurant ? 'Enter the table PIN' : 'Enter your reservation code')
      codeInputRef.current?.focus()
      return
    }
    if (needsLocation && !guestRoomNumber.trim()) {
      setRoomNumberError(`Enter your ${settings.locationLabel || 'room number'}`)
      roomNumberInputRef.current?.focus()
      return
    }
    if (email.trim() && !isValidEmail(email)) {
      setEmailError('Enter a valid email address or leave the field empty')
      emailInputRef.current?.focus()
      return
    }
    if (scheduleForLater) {
      const selected = scheduledFor ? new Date(scheduledFor) : null
      const max = new Date(Date.now() + 24 * 60 * 60 * 1000)
      if (!selected || selected.getTime() < Date.now() || selected.getTime() > max.getTime()) {
        showToast('Choose a scheduled time within the next 24 hours.')
        return
      }
    }
    setPlacing(true)
    try {
      const idempotencyKey = orderSubmissionKeyRef.current || crypto.randomUUID()
      orderSubmissionKeyRef.current = idempotencyKey
      const r = await fetch(`${API}/v1/orders/rooms/${roomId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isRestaurant ? { tablePin: code.trim() } : { code: code.trim() }),
          guestRoomNumber: guestRoomNumber.trim() || undefined,
          items: cart.map(c => ({ itemId: c.item.id, qty: c.qty })),
          payment, note: note.trim() || undefined,
          guestEmail: email.trim() || undefined,
          language: getBrowserLanguage()?.name || undefined,
          ...(scheduleForLater && scheduledFor ? { scheduledFor: new Date(scheduledFor).toISOString() } : {}),
          ...(discountApplied ? { discountCode: discountApplied.code } : {}),
          idempotencyKey,
          ...(paidPaymentIntentId || stripePaymentIntentId ? { stripePaymentIntentId: paidPaymentIntentId || stripePaymentIntentId } : {}),
          ...(stripeCheckoutId ? { guestCheckoutId: stripeCheckoutId } : {})
        })
      })
      const data = await r.json()
      if (!r.ok) {
        if (r.status === 401) setCodeError(isRestaurant ? 'Invalid PIN' : 'Invalid or expired code.')
        else showToast(data.message || 'Error')
        setPlacing(false); return
      }
      setTrackId(data.orderId)
      setTrackToken(data.trackingToken || '')
      setTrackOrder(data)
      if (visitId) {
        fetch(`${API}/v1/orders/rooms/${roomId}/visit/${visitId}`, { method: 'PATCH' }).catch(() => {})
      }
      setCart([])
      setRated(false)
      setRating(0)
      setRatingComment('')
      setScheduleForLater(false)
      setScheduledFor('')
      setStripeClientSecret(null)
      setStripePaymentIntentId(null)
      setStripeCheckoutId(null)
      orderSubmissionKeyRef.current = null
      setStep('menu')
      setPlacing(false)
      setTimeout(() => trackerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200)
    } catch {
      showToast('Network error. Please try again.')
      setPlacing(false)
    }
  }

  const pollOrder = useCallback(async () => {
    if (!trackId || !trackToken) return
    const r = await fetch(`${API}/v1/orders/track/${encodeURIComponent(trackId)}`, {
      headers: { 'x-order-tracking-token': trackToken },
    })
    if (r.ok) { const d = await r.json(); setTrackOrder(d); if (d.rating) setRated(true) }
  }, [trackId, trackToken])

  useEffect(() => {
    if (!trackId || !trackOrder) return
    if (trackOrder.status === 'Completed' || trackOrder.status === 'Cancelled') return
    const t = setInterval(pollOrder, 10000)
    return () => clearInterval(t)
  }, [trackId, trackOrder, pollOrder])

  const handleRate = async () => {
    if (!rating || !trackToken) return
    await fetch(`${API}/v1/orders/track/${encodeURIComponent(trackId)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: trackToken, rating, comment: ratingComment.trim() || undefined }) })
    setRated(true); showToast('Thank you!')
  }

  const handleSendStatusLink = async () => {
    const normalizedEmail = statusEmail.trim()
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setStatusEmailError('Enter a valid email address.')
      statusEmailInputRef.current?.focus()
      return
    }

    setSendingStatusLink(true)
    setStatusLinkMessage('')
    setStatusEmailError('')
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

  const applyDiscount = async () => {
    if (!discountCode.trim()) return
    setDiscountLoading(true)
    setDiscountError('')
    try {
      const items = cart.map(ci => ({
        itemId: ci.item.id,
        qty: ci.qty,
        categoryId: ci.item.categoryId,
        price: dp(ci.item),
      }))
      const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)
      const res = await fetch(`${API}/v1/orders/validate-discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId, code: discountCode.trim(), items, totalAmount: total }),
      })
      const data = await res.json()
      if (data.valid) {
        setDiscountApplied({ code: discountCode.trim().toUpperCase(), ...data })
        setDiscountError('')
      } else {
        setDiscountError(data.reason || 'Invalid code')
        setDiscountApplied(null)
      }
    } catch {
      setDiscountError('Failed to validate code')
    } finally {
      setDiscountLoading(false)
    }
  }

  const removeDiscount = () => {
    setDiscountApplied(null)
    setDiscountCode('')
    setDiscountError('')
  }

  // Colors
  const c = dark ? {
    bg: '#0f0f0f', bg2: '#1a1a1a', bg3: '#242424', bg4: '#2e2e2e',
    text: '#e8e0d0', muted: '#8a8070', gold: '#c9a96e', goldLight: '#e8d5b0',
    border: 'rgba(201,169,110,0.18)', borderMuted: 'rgba(255,255,255,0.06)',
    cardBg: '#1a1a1a', inputBg: '#242424', green: '#4a9b6f', red: '#c05050',
    heroBg: 'linear-gradient(135deg,#141008 0%,#1c160c 50%,#141008 100%)',
    heroText: '#f5f0e8'
  } : {
    bg: '#faf8f5', bg2: '#ffffff', bg3: '#f5f0e8', bg4: '#ede8df',
    text: '#1a1a1a', muted: '#7a6f60', gold: '#b8935c', goldLight: '#c9a96e',
    border: 'rgba(184,147,92,0.25)', borderMuted: 'rgba(0,0,0,0.08)',
    cardBg: '#ffffff', inputBg: '#f5f0e8', green: '#2e7d5a', red: '#c05050',
    heroBg: 'linear-gradient(135deg,#f0ebe0 0%,#e8e0d0 50%,#f0ebe0 100%)',
    heroText: '#1a1a1a'
  }

  const s = {
    page: { minHeight: '100vh', background: c.bg, color: c.text, fontFamily: "'DM Sans', sans-serif" } as React.CSSProperties,
    header: { position: 'sticky' as const, top: 0, zIndex: 100, background: dark ? 'rgba(15,15,15,0.96)' : 'rgba(250,248,245,0.96)', backdropFilter: 'blur(24px)', borderBottom: `1px solid ${c.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    brand: { display: 'flex', alignItems: 'center', gap: 10 } as React.CSSProperties,
    brandText: { display: 'flex', flexDirection: 'column' as const, lineHeight: 1.2 },
    input: { background: c.inputBg, border: `1px solid ${c.borderMuted}`, color: c.text, padding: '10px 13px', borderRadius: 7, fontFamily: "'DM Sans',sans-serif", fontSize: 13, width: '100%', outline: 'none' },
    cartBtn: { background: c.gold, color: '#0f0f0f', border: 'none', padding: '9px 18px', borderRadius: 6, fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 },
  }

  const BrandBlock = ({ compact }: { compact?: boolean }) => (
    <div style={s.brand}>
      {hotelImage && <img src={hotelImage} alt='' style={{ width: compact ? 30 : 36, height: compact ? 30 : 36, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${c.border}` }} />}
      <div style={s.brandText}>
        <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: compact ? 16 : 19, fontWeight: 300, letterSpacing: 3, color: c.gold, textTransform: 'uppercase' }}>Infiora</span>
      </div>
    </div>
  )

  const DarkBtn = () => (
    <button onClick={() => setDark(!dark)} style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.muted, padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>
      {dark ? 'Light mode' : 'Dark mode'}
    </button>
  )

  // Tracker inline component
  const TrackerCard = () => {
    if (!trackOrder) return null
    const statusSteps = [
      { id: 'Awaiting confirmation', icon: '1', label: 'Received' },
      { id: 'Processing', icon: '2', label: 'Preparing' },
      { id: 'On the way', icon: '3', label: 'On the way' },
      { id: 'Completed', icon: '4', label: 'Delivered' },
    ]
    const currentIdx = statusSteps.findIndex(s => s.id === trackOrder.status)
    const isWaiting = trackOrder.status === 'Awaiting confirmation'
    const isCancelled = trackOrder.status === 'Cancelled'
    const isDelivered = trackOrder.status === 'Completed'
    const isScheduled = Boolean(trackOrder.scheduledFor && !trackOrder.surfacedAt)

    return (
      <div ref={trackerRef} style={{ margin: '14px 20px', background: c.bg2, border: `1px solid rgba(74,155,111,0.3)`, borderRadius: 12, overflow: 'hidden' }}>
        {/* Head */}
        <div style={{ background: 'rgba(74,155,111,0.07)', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid rgba(74,155,111,0.15)` }}>
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, color: '#4a9b6f' }}>Order tracking</span>
          <span style={{ fontSize: 11, color: c.muted }}>{trackOrder.orderId}</span>
        </div>
        <div style={{ padding: 20 }}>
          {isScheduled && (
            <div style={{ background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 10, padding: 12, marginBottom: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: c.muted, marginBottom: 4 }}>Scheduled for</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: c.gold }}>
                {new Date(trackOrder.scheduledFor as string).toLocaleString()}
              </div>
            </div>
          )}
          {/* Waiting */}
          {isWaiting && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ width: 46, height: 46, border: `3px solid ${c.borderMuted}`, borderTop: `3px solid ${c.gold}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 14px' }} />
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 21, color: c.gold, marginBottom: 5 }}>Waiting for confirmation...</div>
              <div style={{ fontSize: 12, color: c.muted }}>Your order has been received. You will be notified once it is confirmed.</div>
            </div>
          )}

          {/* Accepted/Processing/On the way */}
          {!isWaiting && !isCancelled && !isDelivered && (
            <div>
              {trackOrder.acceptedEta && (
                <div style={{ background: `rgba(${dark ? '201,169,110' : '184,147,92'},.06)`, border: `1px solid ${c.border}`, borderRadius: 10, padding: 18, textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: c.muted, marginBottom: 3 }}>Estimated delivery</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 52, fontWeight: 600, color: c.gold, lineHeight: 1 }}>{trackOrder.acceptedEta}</div>
                  <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>minutes</div>
                </div>
              )}
              {/* Steps */}
              <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16 }}>
                {statusSteps.map((st, i) => {
                  const done = i < currentIdx
                  const active = i === currentIdx
                  return (
                    <div key={st.id} style={{ display: 'contents' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, flex: 1 }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', border: `2px solid ${done ? c.green : active ? c.gold : c.borderMuted}`, background: done ? `rgba(74,155,111,.12)` : active ? `rgba(201,169,110,.1)` : c.bg3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, animation: active ? 'sglow 2s infinite' : undefined }}>
                          {done ? 'OK' : st.icon}
                        </div>
                        <div style={{ fontSize: 10, color: done ? c.green : active ? c.gold : c.muted, textAlign: 'center' }}>{st.label}</div>
                      </div>
                      {i < statusSteps.length - 1 && <div style={{ flex: 1, height: 2, background: done ? c.green : c.borderMuted, marginTop: 18, transition: 'background .4s' }} />}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Delivered */}
          {isDelivered && (
            <div style={{ textAlign: 'center', padding: '4px 0', marginBottom: 12 }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>Done</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: c.green, marginBottom: 5 }}>Your order has been delivered!</div>
              <div style={{ fontSize: 12, color: c.muted, lineHeight: 1.6 }}>Enjoy your meal!<br />Please check your payment method below.</div>
            </div>
          )}

          {/* Cancelled */}
          {isCancelled && (
            <div style={{ textAlign: 'center', padding: '4px 0', marginBottom: 12 }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>Cancelled</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: c.red, marginBottom: 4 }}>Order cancelled</div>
              <div style={{ fontSize: 12, color: c.muted }}>Please contact reception for assistance.</div>
            </div>
          )}

          {/* Rating */}
          {isDelivered && !rated && (
            <div style={{ background: c.bg3, borderRadius: 10, padding: '16px 14px', marginBottom: 12 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: c.gold, marginBottom: 12, textAlign: 'center' }}>Rate your experience</div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 12 }}>
                {[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => setRating(n)} style={{ background: 'transparent', border: 'none', fontSize: 26, cursor: 'pointer', padding: 4, opacity: n <= rating ? 1 : .3 }}>{n <= rating ? '*' : '.'}</button>)}
              </div>
              <textarea style={{ ...s.input, resize: 'none', height: 56, marginBottom: 10 } as any} value={ratingComment} onChange={e => setRatingComment(e.target.value)} placeholder='Comment (optional)...' />
              <button onClick={handleRate} disabled={!rating} style={{ background: `linear-gradient(135deg,${c.gold},${dark ? '#b8935c' : '#a07840'})`, color: '#0f0f0f', border: 'none', padding: 12, borderRadius: 8, fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%', opacity: rating ? 1 : .4 }}>Submit Rating</button>
            </div>
          )}
          {rated && isDelivered && <div style={{ background: 'rgba(74,155,111,.1)', border: '1px solid rgba(74,155,111,.3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: c.green, textAlign: 'center', marginBottom: 12 }}>Thank you for your feedback!</div>}

          <div style={{ background: c.bg3, borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: c.muted, marginBottom: 4 }}>Payment</div>
            <div style={{ fontSize: 13, color: c.text }}>{getPaymentLabel(trackOrder.payment)}</div>
          </div>

          <button onClick={() => { setTrackOrder(null); setTrackId(''); setTrackToken(''); clearTrackingState(roomId) }} style={{ background: 'transparent', border: 'none', color: c.muted, fontSize: 11, cursor: 'pointer', textDecoration: 'underline', display: 'block', margin: '4px auto 0' }}>
            Dismiss tracker
          </button>
        </div>
      </div>
    )
  }

  if (loading) return <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{ width: 40, height: 40, border: `3px solid ${c.border}`, borderTop: `3px solid ${c.gold}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>
  if (error) return <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}><div style={{ background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 12, padding: '24px 32px', maxWidth: 380, textAlign: 'center' }}><div style={{ fontSize: 40, marginBottom: 12 }}>Unavailable</div><p style={{ color: c.muted, fontSize: 14 }}>{error}</p></div></div>

  const pm = settings.paymentMethods

  // Menu step
  if (step === 'menu') return (
    <div style={s.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Sans:wght@300;400;500&display=swap'); @keyframes spin{to{transform:rotate(360deg)}} @keyframes sglow{0%,100%{box-shadow:0 0 0 0 rgba(201,169,110,.3)}50%{box-shadow:0 0 0 8px rgba(201,169,110,0)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:.25}} .menu-card:hover{border-color:${c.gold}44!important;transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.12)}`}</style>
      <ActivityTracker roomId={roomId} storageKey={`order-${roomId}`} />

      {/* Header */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!settings.kioskMode && (
            <button onClick={() => { window.location.href = `/${roomId}` }} style={{ background: 'transparent', border: 'none', color: c.muted, cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: "'DM Sans',sans-serif" }}>Back</button>
          )}
          <BrandBlock compact />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Tracking pill */}
          {trackOrder && trackOrder.status !== 'Completed' && trackOrder.status !== 'Cancelled' && (
            <button
              onClick={() => trackerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(74,155,111,0.12)', border: '1px solid rgba(74,155,111,0.35)', borderRadius: 20, padding: '5px 14px', fontSize: 12, color: '#4a9b6f', cursor: 'pointer' }}
            >
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4a9b6f', animation: 'blink 1.5s infinite' }} />
              Order in progress
            </button>
          )}
          <button onClick={() => setDark(!dark)} style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.muted, padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>{dark ? 'Light' : 'Dark'}</button>
          <button onClick={() => setCartOpen(true)} style={s.cartBtn}>
            Cart
            <span style={{ background: '#0f0f0f', color: c.gold, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{cartCount}</span>
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: c.heroBg, borderBottom: `1px solid ${c.border}`, padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: c.muted, marginBottom: 3 }}>{settings.venueType === 'restaurant' ? 'Table Service' : 'Room Service'}</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 300, color: c.heroText, letterSpacing: 1 }}>{hotelName || 'Hotel'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: c.muted }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.green, animation: 'blink 2s infinite' }} />
            {settings.availableFrom && settings.availableFrom !== '00:00'
              ? `Available ${settings.availableFrom} - ${settings.availableTo}`
              : 'Available 24/7'}
          </div>
        </div>
      </div>

      {/* Inline tracker */}
      <TrackerCard />

      <div style={{ margin: '0 20px 14px', background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: c.gold, marginBottom: 6 }}>Check your status</div>
        <div style={{ fontSize: 12, color: c.muted, lineHeight: 1.6, marginBottom: 12 }}>
          Get a private email link for all your orders and bookings for this hotel.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            ref={statusEmailInputRef}
            value={statusEmail}
            onChange={e => {
              setStatusEmail(e.target.value)
              setStatusEmailError('')
            }}
            placeholder='Your email'
            type='email'
            style={{ ...s.input, flex: 1, minWidth: 180, borderColor: statusEmailError ? c.red : undefined } as React.CSSProperties}
            aria-invalid={statusEmailError ? 'true' : 'false'}
          />
          <button
            onClick={handleSendStatusLink}
            disabled={sendingStatusLink}
            style={{ background: c.gold, color: '#0f0f0f', border: 'none', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontWeight: 700, fontFamily: "'DM Sans',sans-serif", opacity: sendingStatusLink ? 0.7 : 1 }}
          >
            {sendingStatusLink ? 'Sending...' : 'Email me the link'}
          </button>
        </div>
        {statusEmailError && <div style={{ marginTop: 10, fontSize: 12, color: c.red }}>{statusEmailError}</div>}
        {statusLinkMessage && <div style={{ marginTop: 10, fontSize: 12, color: statusLinkMessage.startsWith('Failed') || statusLinkMessage.startsWith('Enter') ? c.red : c.green }}>{statusLinkMessage}</div>}
      </div>

      {/* Category pills */}
      <div style={{ padding: '14px 20px 0', display: 'flex', gap: 7, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {topCats.map(cat => (
          <button key={cat.id}
            style={{ background: activeCat === cat.id ? c.gold : 'transparent', border: `1px solid ${activeCat === cat.id ? c.gold : c.border}`, color: activeCat === cat.id ? '#0f0f0f' : c.muted, padding: '7px 18px', borderRadius: 40, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: "'DM Sans',sans-serif", fontWeight: activeCat === cat.id ? 600 : 400 }}
            onClick={() => setActiveCat(cat.id)}
          >
            {!isImgUrl(cat.icon) && cat.icon ? `${cat.icon} ` : ''}{cat.name}
          </button>
        ))}
      </div>

      {/* Subcategory pills */}
      {hasSubs && (
        <div style={{ padding: '8px 20px 0', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          <button style={{ background: !activeSub ? c.goldLight : 'transparent', border: `1px solid ${!activeSub ? c.goldLight : c.border}`, color: !activeSub ? '#0f0f0f' : c.muted, padding: '5px 14px', borderRadius: 40, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: "'DM Sans',sans-serif" }} onClick={() => setActiveSub('')}>All</button>
          {subCats.map(sub => (
            <button key={sub.id}
              style={{ background: activeSub === sub.id ? c.goldLight : 'transparent', border: `1px solid ${activeSub === sub.id ? c.goldLight : c.border}`, color: activeSub === sub.id ? '#0f0f0f' : c.muted, padding: '5px 14px', borderRadius: 40, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: "'DM Sans',sans-serif" }}
              onClick={() => setActiveSub(sub.id)}
            >
              {!isImgUrl(sub.icon) && sub.icon ? `${sub.icon} ` : ''}{sub.name}
            </button>
          ))}
        </div>
      )}

      {/* Items grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, padding: '16px 20px 100px' }}>
        {visibleItems.filter(i => i.available).length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: c.muted }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>Menu</div>
            <p style={{ fontSize: 13 }}>No items available in this category</p>
          </div>
        ) : visibleItems.filter(i => i.available).map(item => {
          const isBookable = item.type === 'bookable'
          const inCart = !isBookable && cart.find(ci => ci.item.id === item.id)
          const price = dp(item)
          return (
            <div key={item.id} className='menu-card' style={{ background: c.cardBg, border: `1px solid ${c.borderMuted}`, borderRadius: 14, overflow: 'hidden', position: 'relative', transition: 'all .3s' }}>
              {item.badge === 'sale' && <span style={{ position: 'absolute', top: 10, left: 10, background: c.red, color: '#fff', fontSize: 9, padding: '3px 8px', borderRadius: 20, fontWeight: 700, letterSpacing: .5, textTransform: 'uppercase', zIndex: 1 }}>SALE</span>}
              {item.badge === 'new' && <span style={{ position: 'absolute', top: 10, right: 10, background: c.gold, color: '#0f0f0f', fontSize: 9, padding: '3px 8px', borderRadius: 20, fontWeight: 700, letterSpacing: .5, textTransform: 'uppercase', zIndex: 1 }}>NEW</span>}
              {item.badge === 'hit' && <span style={{ position: 'absolute', top: 10, right: 10, background: c.red, color: '#fff', fontSize: 9, padding: '3px 8px', borderRadius: 20, fontWeight: 700, letterSpacing: .5, textTransform: 'uppercase', zIndex: 1 }}>HIT</span>}
              {isBookable && <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(201,169,110,0.15)', border: `1px solid ${c.gold}`, color: c.gold, fontSize: 9, padding: '3px 8px', borderRadius: 20, fontWeight: 700, letterSpacing: .5, textTransform: 'uppercase', zIndex: 1 }}>Bookable</span>}
              {isImgUrl(item.image)
                ? <div style={{ width: '100%', height: 130, overflow: 'hidden' }}><img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
                : <div style={{ width: '100%', height: 110, background: `linear-gradient(135deg,${c.bg3},${c.bg4})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52 }}>{item.image || 'Item'}</div>
              }
              <div style={{ padding: '14px 16px 16px' }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 19, fontWeight: 600, color: c.text, marginBottom: 3 }}>{item.name}</div>
                {item.description && <div style={{ fontSize: 11, color: c.muted, lineHeight: 1.55, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>{item.description}</div>}
                {isBookable && item.bookingConfig?.duration && (
                  <div style={{ fontSize: 11, color: c.muted, marginBottom: 10 }}>{item.bookingConfig.duration} min</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 21, fontWeight: 600, color: c.gold }}>{cur}{price.toFixed(2)}</span>
                    {item.discount && item.discount > 0 ? <span style={{ fontSize: 12, color: c.muted, textDecoration: 'line-through' }}>{cur}{item.price.toFixed(2)}</span> : null}
                  </div>
                  {isBookable ? (
                    <button
                      onClick={() => handleOpenBookingDrawer(item)}
                      style={{ background: c.gold, color: '#0f0f0f', border: 'none', padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", letterSpacing: .3 }}
                    >
                      Book now
                    </button>
                  ) : inCart ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => removeFromCart(item.id)} style={{ background: c.bg3, border: `1px solid ${c.border}`, color: c.gold, width: 30, height: 30, borderRadius: '50%', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                      <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 600, color: c.text, minWidth: 18, textAlign: 'center' }}>{inCart.qty}</span>
                      <button onClick={() => addToCart(item)} style={{ background: 'transparent', border: `1.5px solid ${c.gold}`, color: c.gold, width: 30, height: 30, borderRadius: '50%', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(item)} style={{ background: 'transparent', border: `1.5px solid ${c.gold}`, color: c.gold, width: 34, height: 34, borderRadius: '50%', fontSize: 19, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Cart FAB */}
      {cartCount > 0 && (
        <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 20, width: 'calc(100% - 32px)', maxWidth: 400 }}>
          <button onClick={() => setCartOpen(true)} style={{ background: `linear-gradient(135deg,${c.gold},${dark ? '#b8935c' : '#a07840'})`, color: '#0f0f0f', border: 'none', padding: '14px', borderRadius: 8, fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: .5, textTransform: 'uppercase', width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,.2)' }}>
            View Cart ({cartCount}) - {cur}{cartTotal.toFixed(2)}
          </button>
        </div>
      )}

      {bookingDrawerItem && (
        <div onClick={e => { if (e.target === e.currentTarget) setBookingDrawerItem(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 220, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: c.bg2, width: '100%', maxHeight: '85vh', borderRadius: '16px 16px 0 0', overflow: 'auto', padding: '20px 20px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: c.gold }}>{bookingDrawerItem.name}</div>
                {bookingDrawerItem.bookingConfig?.duration && (
                  <div style={{ fontSize: 12, color: c.muted }}>{bookingDrawerItem.bookingConfig.duration} min</div>
                )}
              </div>
              <button
                onClick={() => setBookingDrawerItem(null)}
                style={{ background: 'transparent', border: `1px solid ${c.borderMuted}`, color: c.muted, width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                X
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: c.muted, display: 'block', marginBottom: 6 }}>Choose date</label>
              <input
                type='date'
                value={bookingDrawerDate}
                min={new Date().toISOString().slice(0, 10)}
                max={new Date(Date.now() + ((bookingDrawerItem.bookingConfig?.advanceMaxDays ?? 60) * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10)}
                onChange={e => setBookingDrawerDate(e.target.value)}
                style={{ background: c.inputBg, border: `1px solid ${c.borderMuted}`, color: c.text, padding: '10px 13px', borderRadius: 7, fontSize: 14, width: '100%', outline: 'none' }}
              />
            </div>

            {bookingDrawerLoadingSlots && (
              <div style={{ textAlign: 'center', color: c.muted, fontSize: 13, padding: '16px 0' }}>Loading slots...</div>
            )}

            {!bookingDrawerLoadingSlots && availableBookingDrawerSlots.length === 0 && (
              <div style={{ textAlign: 'center', color: c.muted, fontSize: 13, padding: '20px 0' }}>No slots available for this date.</div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {availableBookingDrawerSlots.map(slot => {
                const timeStr = new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                return (
                  <button
                    key={slot.id}
                    onClick={() => handleBookingSlotSelect(slot)}
                    style={{
                      padding: '10px 6px',
                      borderRadius: 8,
                      border: 'none',
                      background: c.gold,
                      color: '#0f0f0f',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {timeStr}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Cart Panel */}
      {cartOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) setCartOpen(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          <div style={{ background: c.bg2, width: 410, height: '100vh', borderLeft: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', maxWidth: '100vw' }}>
            <div style={{ padding: '20px 22px', borderBottom: `1px solid ${c.borderMuted}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: c.gold }}>Your cart</div>
              <button onClick={() => setCartOpen(false)} style={{ background: 'transparent', border: `1px solid ${c.borderMuted}`, color: c.muted, width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: c.muted }}>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>Cart</div>
                  <p style={{ fontSize: 13 }}>Your cart is empty</p>
                </div>
              ) : cart.map(({ item, qty }) => (
                <div key={item.id} style={{ background: c.bg3, borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 7, background: c.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0, overflow: 'hidden' }}>
                    {isImgUrl(item.image) ? <img src={item.image} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 7 }} /> : (item.image || 'Item')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: c.muted }}>{cur}{dp(item).toFixed(2)} each</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => removeFromCart(item.id)} style={{ background: c.bg2, border: `1px solid ${c.border}`, color: c.gold, width: 24, height: 24, borderRadius: '50%', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, fontWeight: 600, color: c.text, minWidth: 14, textAlign: 'center' }}>{qty}</span>
                    <button onClick={() => addToCart(item)} style={{ background: c.bg2, border: `1px solid ${c.border}`, color: c.gold, width: 24, height: 24, borderRadius: '50%', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 20px', borderTop: `1px solid ${c.borderMuted}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: c.muted }}>Total</span>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 600, color: c.gold }}>{cur}{cartTotal.toFixed(2)}</span>
              </div>
              <button onClick={() => { setCartOpen(false); setStep('checkout') }} disabled={cart.length === 0} style={{ background: `linear-gradient(135deg,${c.gold},${dark ? '#b8935c' : '#a07840'})`, color: '#0f0f0f', border: 'none', padding: 14, borderRadius: 8, fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: .5, textTransform: 'uppercase', width: '100%' }}>
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 18px', fontSize: 12, color: c.text, zIndex: 500, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,.2)' }}>{toast}</div>}
    </div>
  )

  // Checkout step
  if (step === 'checkout') return (
    <div style={s.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Sans:wght@300;400;500&display=swap')`}</style>
      <ActivityTracker roomId={roomId} storageKey={`order-${roomId}`} />
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!settings.kioskMode && (
            <button onClick={() => setStep('menu')} style={{ background: 'transparent', border: 'none', color: c.muted, cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: "'DM Sans',sans-serif" }}>Back</button>
          )}
          <BrandBlock compact />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: c.muted }}>Checkout</span>
          <DarkBtn />
        </div>
      </div>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 40px' }}>
        {/* Order summary */}
        <div style={{ background: c.bg3, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: c.muted, marginBottom: 10 }}>Order Summary</div>
          {cart.map(({ item, qty }) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontSize: 12, padding: '8px 0', borderBottom: '1px solid rgba(127,127,127,.2)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{cur}{dp(item).toFixed(2)} each</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => removeFromCart(item.id)} style={{ background: c.bg2, border: '1px solid rgba(127,127,127,.25)', color: c.gold, width: 26, height: 26, borderRadius: '50%', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>-</button>
                <span style={{ fontSize: 16, fontWeight: 600, color: c.text, minWidth: 18, textAlign: 'center' }}>{qty}</span>
                <button onClick={() => addToCart(item)} style={{ background: c.bg2, border: '1px solid rgba(127,127,127,.25)', color: c.gold, width: 26, height: 26, borderRadius: '50%', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
              </div>
              <span style={{ minWidth: 68, textAlign: 'right' }}>{cur}{(dp(item) * qty).toFixed(2)}</span>
            </div>
          ))}
          {/* Discount code input */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${c.borderMuted}` }}>
            {!discountApplied ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type='text'
                  value={discountCode}
                  onChange={e => setDiscountCode(e.target.value.toUpperCase())}
                  placeholder='Discount code'
                  style={{ ...s.input, flex: 1, letterSpacing: 2, textTransform: 'uppercase' } as React.CSSProperties}
                />
                <button
                  onClick={applyDiscount}
                  disabled={discountLoading || !discountCode.trim()}
                  style={{ padding: '8px 16px', background: c.gold, color: '#0f0f0f', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", opacity: discountLoading || !discountCode.trim() ? 0.5 : 1 }}
                >
                  {discountLoading ? '...' : 'Apply'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(74,155,111,0.1)', border: '1px solid rgba(74,155,111,0.3)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: c.green }}>OK {discountApplied.code} - saving {cur}{discountApplied.discountAmount.toFixed(2)}</span>
                <button onClick={removeDiscount} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, fontSize: 16 }}>x</button>
              </div>
            )}
            {discountError && <p style={{ color: c.red, fontSize: 12, margin: '4px 0 0' }}>{discountError}</p>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: `1px solid ${c.borderMuted}` }}>
            <span style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: c.muted }}>Total</span>
            {discountApplied ? (
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14, color: c.muted, textDecoration: 'line-through', marginRight: 8 }}>{cur}{cartTotal.toFixed(2)}</span>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, color: c.gold }}>{cur}{discountApplied.newTotal.toFixed(2)}</span>
              </div>
            ) : (
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, color: c.gold }}>{cur}{cartTotal.toFixed(2)}</span>
            )}
          </div>
        </div>

        {/* Code / PIN field */}
            {(settings.requireCode ?? true) && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: c.muted, display: 'block', marginBottom: 5 }}>
                  {settings.venueType === 'restaurant' ? 'Table PIN' : 'Reservation Code'}
                </label>
                <input
                  ref={codeInputRef}
                  style={{ ...s.input, letterSpacing: settings.venueType === 'restaurant' ? 'normal' : 3, fontSize: 18, fontFamily: "'Cormorant Garamond',serif", textTransform: settings.venueType === 'restaurant' ? 'none' : 'uppercase', borderColor: codeError ? c.red : undefined } as any}
                  value={code}
                  onChange={e => {
                    const val = settings.venueType === 'restaurant'
                      ? e.target.value.replace(/\D/g, '').slice(0, 10)
                      : e.target.value.toUpperCase()
                    setCode(val)
                    setCodeError('')
                  }}
                  placeholder={settings.venueType === 'restaurant' ? '0000' : 'e.g. SMITH101'}
                  inputMode={settings.venueType === 'restaurant' ? 'numeric' : undefined}
                  aria-invalid={codeError ? 'true' : 'false'}
                />
                {codeError && <p style={{ color: c.red, fontSize: 12, marginTop: 5 }}>{codeError}</p>}
              </div>
            )}

            {/* Location / room number field */}
            {(settings.requireLocation ?? true) && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: c.muted, display: 'block', marginBottom: 5 }}>
                  {settings.locationLabel || 'Room number'}
                </label>
                <input
                  ref={roomNumberInputRef}
                  style={{ ...s.input, borderColor: roomNumberError ? c.red : undefined } as any}
                  value={guestRoomNumber}
                  onChange={e => { setGuestRoomNumber(e.target.value); setRoomNumberError('') }}
                  placeholder={settings.locationLabel || 'Room number'}
                  aria-invalid={roomNumberError ? 'true' : 'false'}
                />
                {roomNumberError && <p style={{ color: c.red, fontSize: 12, marginTop: 5 }}>{roomNumberError}</p>}
              </div>
            )}

        {/* Schedule for later */}
        <div style={{ background: c.bg3, border: `1px solid ${c.borderMuted}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer' }}>
            <span>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: c.text, marginBottom: 2 }}>Schedule for later</span>
              <span style={{ display: 'block', fontSize: 11, color: c.muted }}>Choose a time today or tomorrow.</span>
            </span>
            <input
              type='checkbox'
              checked={scheduleForLater}
              onChange={e => {
                setScheduleForLater(e.target.checked)
                if (e.target.checked && !scheduledFor) setScheduledFor(toDateTimeLocalValue(new Date(Date.now() + 60 * 60 * 1000)))
                if (!e.target.checked) setScheduledFor('')
              }}
              style={{ width: 20, height: 20, accentColor: c.gold }}
            />
          </label>
          {scheduleForLater && (
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: c.muted, display: 'block', marginBottom: 5 }}>Delivery time</label>
              <input
                type='datetime-local'
                style={s.input}
                value={scheduledFor}
                min={toDateTimeLocalValue(new Date())}
                max={toDateTimeLocalValue(new Date(Date.now() + 24 * 60 * 60 * 1000))}
                onChange={e => setScheduledFor(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Payment */}
        {pm && (pm.cash || pm.card || pm.online) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: c.muted, borderBottom: `1px solid ${c.borderMuted}`, paddingBottom: 6, marginBottom: 10 }}>Payment Method</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pm.cash && <label onClick={() => setPayment('cash')} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: payment === 'cash' ? `rgba(${dark ? '201,169,110' : '184,147,92'},.06)` : c.bg3, border: `2px solid ${payment === 'cash' ? c.gold : c.borderMuted}`, borderRadius: 10, padding: 14, cursor: 'pointer' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>Cash</span>
                <div><div style={{ fontSize: 14, fontWeight: 500, color: c.text, marginBottom: 2 }}>Cash on delivery</div><div style={{ fontSize: 11, color: c.muted }}>Pay when your order arrives</div></div>
              </label>}
              {pm.card && <label onClick={() => setPayment('card')} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: payment === 'card' ? `rgba(${dark ? '201,169,110' : '184,147,92'},.06)` : c.bg3, border: `2px solid ${payment === 'card' ? c.gold : c.borderMuted}`, borderRadius: 10, padding: 14, cursor: 'pointer' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>Card</span>
                <div><div style={{ fontSize: 14, fontWeight: 500, color: c.text, marginBottom: 2 }}>Card / POS</div><div style={{ fontSize: 11, color: c.muted }}>Pay by card on a terminal</div></div>
              </label>}
              {pm.online && <label onClick={() => setPayment('online')} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: payment === 'online' ? `rgba(74,127,203,.06)` : c.bg3, border: `2px solid ${payment === 'online' ? c.gold : c.borderMuted}`, borderRadius: 10, padding: 14, cursor: 'pointer' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>Online</span>
                <div><div style={{ fontSize: 14, fontWeight: 500, color: c.text, marginBottom: 2 }}>Pay online by card</div><div style={{ fontSize: 11, color: c.muted }}>Secure card payment through Stripe</div></div>
              </label>}
            </div>
            {payment === 'online' && (
              <div style={{ marginTop: 12, background: c.bg3, border: `1px solid ${c.borderMuted}`, borderRadius: 10, padding: 14 }}>
                {stripeLoading && <p style={{ color: c.muted, fontSize: 13, margin: 0 }}>Preparing secure payment...</p>}
                {stripeError && <p style={{ color: c.red, fontSize: 13, margin: 0 }}>{stripeError}</p>}
                {!onlinePaymentConfigured && <p style={{ color: c.red, fontSize: 13, margin: 0 }}>Online payment is not configured for this property yet.</p>}
                {stripePromise && stripeClientSecret && (
                  <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
                    <StripePaymentForm
                      disabled={placing}
                      onSuccess={paymentIntentId => {
                        setStripePaymentIntentId(paymentIntentId)
                        handlePlace(paymentIntentId)
                      }}
                    />
                  </Elements>
                )}
              </div>
            )}
          </div>
        )}

        {/* Details */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: c.muted, borderBottom: `1px solid ${c.borderMuted}`, paddingBottom: 6, marginBottom: 12 }}>Your Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: c.muted, display: 'block', marginBottom: 5 }}>Email (optional)</label>
              <input
                ref={emailInputRef}
                style={{ ...s.input, borderColor: emailError ? c.red : undefined } as any}
                type='email'
                value={email}
                onChange={e => {
                  setEmail(e.target.value)
                  setEmailError('')
                }}
                placeholder='your@email.com'
                aria-invalid={emailError ? 'true' : 'false'}
              />
              {emailError && <p style={{ color: c.red, fontSize: 12, marginTop: 5 }}>{emailError}</p>}
            </div>
            <div>
              <label style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: c.muted, display: 'block', marginBottom: 5 }}>Note (optional)</label>
              <textarea style={{ ...s.input, resize: 'none', height: 64 } as any} value={note} onChange={e => setNote(e.target.value)} placeholder='Allergies, special requests...' />
            </div>
          </div>
        </div>

        {payment !== 'online' && (
          <button onClick={() => handlePlace()} disabled={placing} style={{ background: `linear-gradient(135deg,${c.gold},${dark ? '#b8935c' : '#a07840'})`, color: '#0f0f0f', border: 'none', padding: 14, borderRadius: 8, fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: .5, textTransform: 'uppercase', width: '100%', opacity: placing ? 0.4 : 1 }}>
            {placing ? 'Placing order...' : `Place Order - ${cur}${payableTotal.toFixed(2)}`}
          </button>
        )}
            <p style={{ fontSize: 11, color: c.muted, textAlign: 'center', margin: '10px 0 0', lineHeight: 1.6 }}>
              By placing your order, you agree to the processing of your personal data solely for order fulfillment, in accordance with GDPR Regulation (EU) 2016/679.
            </p>
      </div>
      {toast && <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 18px', fontSize: 12, color: c.text, zIndex: 500 }}>{toast}</div>}
    </div>
  )

  return null
}
