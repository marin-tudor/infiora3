'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { getBrowserLanguage } from '@/utils/miscUtils'

const API = process.env.NEXT_PUBLIC_API_URL

interface Category { id: string; name: string; icon: string; parentId?: string | null }
interface Item {
  id: string; name: string; description?: string; price: number
  discount?: number; image?: string; imageType: string; badge?: string
  available: boolean; categoryId: string; tags?: string[]
}
interface Settings {
  currencySymbol: string; processingLabel: string; onTheWayLabel: string
  completedLabel: string; availableFrom?: string; availableTo?: string
  paymentMethods?: { cash: boolean; card: boolean; online: boolean }
}
interface CartItem { item: Item; qty: number }
interface TrackOrder {
  orderId: string; status: string; items: any[]; total: number
  note?: string; acceptedEta?: number; roomNumber: string; payment: string; rating?: number
}

const dp = (item: Item) =>
  item.discount && item.discount > 0
    ? parseFloat((item.price * (1 - item.discount / 100)).toFixed(2))
    : item.price

const isImgUrl = (s?: string) => s && (s.startsWith('http') || s.startsWith('data:'))

export default function GuestOrderPage({ roomId }: { roomId: string }) {
  const [dark, setDark] = useState(false)
  const [step, setStep] = useState<'code' | 'menu' | 'checkout'>('code')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [settings, setSettings] = useState<Settings>({ currencySymbol: '€', processingLabel: 'Processing', onTheWayLabel: 'On the way', completedLabel: 'Completed' })
  const [hotelName, setHotelName] = useState('')
  const [hotelImage, setHotelImage] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [activeCat, setActiveCat] = useState('')
  const [activeSub, setActiveSub] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [payment, setPayment] = useState('cash')
  const [note, setNote] = useState('')
  const [email, setEmail] = useState('')
  const [placing, setPlacing] = useState(false)
  const [toast, setToast] = useState('')
  const [trackOrder, setTrackOrder] = useState<TrackOrder | null>(() => {
    try { const s = localStorage.getItem(`infiora_track_order_${roomId}`); return s ? JSON.parse(s) : null } catch { return null }
  })
  const [trackId, setTrackId] = useState<string>(() => {
    try { return localStorage.getItem(`infiora_track_id_${roomId}`) || '' } catch { return '' }
  })
  const [guestRoomNumber, setGuestRoomNumber] = useState('')
  const [roomNumberError, setRoomNumberError] = useState('')
  const [visitId, setVisitId] = useState('')
  const [rating, setRating] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [rated, setRated] = useState(false)
  const trackerRef = useRef<HTMLDivElement>(null)

  // Persist tracking to localStorage
  useEffect(() => {
    try {
      if (trackId) localStorage.setItem(`infiora_track_id_${roomId}`, trackId)
      else localStorage.removeItem(`infiora_track_id_${roomId}`)
    } catch {}
  }, [trackId, roomId])

  useEffect(() => {
    try {
      if (trackOrder) localStorage.setItem(`infiora_track_order_${roomId}`, JSON.stringify(trackOrder))
      else localStorage.removeItem(`infiora_track_order_${roomId}`)
    } catch {}
  }, [trackOrder, roomId])

  // If returning guest has an active tracked order, go straight to menu
  useEffect(() => {
    if (trackId && trackOrder && step === 'code') setStep('menu')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Track order page visit when a fresh guest enters the menu (not a returning guest)
  useEffect(() => {
    if (step !== 'menu' || trackId) return
    const visitorId = (() => {
      try {
        let id = localStorage.getItem('infiora_visitor_id')
        if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('infiora_visitor_id', id) }
        return id
      } catch { return Math.random().toString(36).slice(2) }
    })()
    const language = getBrowserLanguage()?.name || ''
    fetch(`${API}/v1/orders/rooms/${roomId}/visit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId, language })
    }).then(r => r.json()).then(d => { if (d.id) setVisitId(d.id) }).catch(() => {})
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load catalog — no-store to always get fresh items
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
          if (pm) { if (pm.cash) setPayment('cash'); else if (pm.card) setPayment('card'); else if (pm.online) setPayment('online') }
        } else {
          setError(data.message || 'Ordering unavailable.')
        }
        setLoading(false)
      }).catch(() => { setError('Failed to load menu.'); setLoading(false) })
  }, [roomId])

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
  const cur = settings.currencySymbol || '€'

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const handlePlace = async () => {
    if (!code.trim()) { setCodeError('Enter your reservation code'); return }
    if (!guestRoomNumber.trim()) { setRoomNumberError('Enter your room number'); return }
    setPlacing(true)
    const r = await fetch(`${API}/v1/orders/rooms/${roomId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim(), guestRoomNumber: guestRoomNumber.trim(), items: cart.map(c => ({ itemId: c.item.id, qty: c.qty })), payment, note: note.trim() || undefined, guestEmail: email.trim() || undefined, language: getBrowserLanguage()?.name || undefined })
    })
    const data = await r.json()
    if (!r.ok) {
      if (r.status === 401) setCodeError('Invalid or expired code.')
      else showToast(data.message || 'Error')
      setPlacing(false); return
    }
    setTrackId(data.orderId)
    setTrackOrder(data)
    if (visitId) {
      fetch(`${API}/v1/orders/rooms/${roomId}/visit/${visitId}`, { method: 'PATCH' }).catch(() => {})
    }
    setCart([])
    setRated(false)
    setRating(0)
    setRatingComment('')
    setStep('menu')
    setPlacing(false)
    setTimeout(() => trackerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200)
  }

  const pollOrder = useCallback(async () => {
    if (!trackId) return
    const r = await fetch(`${API}/v1/orders/track/${encodeURIComponent(trackId)}`)
    if (r.ok) { const d = await r.json(); setTrackOrder(d); if (d.rating) setRated(true) }
  }, [trackId])

  useEffect(() => {
    if (!trackId || !trackOrder) return
    if (trackOrder.status === 'Completed' || trackOrder.status === 'Cancelled') return
    const t = setInterval(pollOrder, 10000)
    return () => clearInterval(t)
  }, [trackId, trackOrder, pollOrder])

  const handleRate = async () => {
    if (!rating) return
    await fetch(`${API}/v1/orders/track/${encodeURIComponent(trackId)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating, comment: ratingComment.trim() || undefined }) })
    setRated(true); showToast('Thank you!')
  }

  // ── Colors ──────────────────────────────────────────────────────────────────
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
      {dark ? '☀ Light' : '☾ Dark'}
    </button>
  )

  // ── TRACKER inline component ───────────────────────────────────────────────
  const TrackerCard = () => {
    if (!trackOrder) return null
    const statusSteps = [
      { id: 'Awaiting confirmation', icon: '📋', label: 'Received' },
      { id: 'Processing', icon: '⚙️', label: 'Preparing' },
      { id: 'On the way', icon: '🛵', label: 'On the way' },
      { id: 'Completed', icon: '🏨', label: 'Delivered' },
    ]
    const currentIdx = statusSteps.findIndex(s => s.id === trackOrder.status)
    const isWaiting = trackOrder.status === 'Awaiting confirmation'
    const isCancelled = trackOrder.status === 'Cancelled'
    const isDelivered = trackOrder.status === 'Completed'

    return (
      <div ref={trackerRef} style={{ margin: '14px 20px', background: c.bg2, border: `1px solid rgba(74,155,111,0.3)`, borderRadius: 12, overflow: 'hidden' }}>
        {/* Head */}
        <div style={{ background: 'rgba(74,155,111,0.07)', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid rgba(74,155,111,0.15)` }}>
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, color: '#4a9b6f' }}>📡 Order tracking</span>
          <span style={{ fontSize: 11, color: c.muted }}>{trackOrder.orderId}</span>
        </div>
        <div style={{ padding: 20 }}>
          {/* Waiting */}
          {isWaiting && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ width: 46, height: 46, border: `3px solid ${c.borderMuted}`, borderTop: `3px solid ${c.gold}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 14px' }} />
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 21, color: c.gold, marginBottom: 5 }}>Waiting for confirmation…</div>
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
                          {done ? '✓' : st.icon}
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
              <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: c.green, marginBottom: 5 }}>Your order has been delivered!</div>
              <div style={{ fontSize: 12, color: c.muted, lineHeight: 1.6 }}>Enjoy your meal!<br />Please check your payment method below.</div>
            </div>
          )}

          {/* Cancelled */}
          {isCancelled && (
            <div style={{ textAlign: 'center', padding: '4px 0', marginBottom: 12 }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>❌</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: c.red, marginBottom: 4 }}>Order cancelled</div>
              <div style={{ fontSize: 12, color: c.muted }}>Please contact reception for assistance.</div>
            </div>
          )}

          {/* Rating */}
          {isDelivered && !rated && (
            <div style={{ background: c.bg3, borderRadius: 10, padding: '16px 14px', marginBottom: 12 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: c.gold, marginBottom: 12, textAlign: 'center' }}>Rate your experience</div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 12 }}>
                {[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => setRating(n)} style={{ background: 'transparent', border: 'none', fontSize: 26, cursor: 'pointer', padding: 4, opacity: n <= rating ? 1 : .3 }}>{n <= rating ? '⭐' : '☆'}</button>)}
              </div>
              <textarea style={{ ...s.input, resize: 'none', height: 56, marginBottom: 10 } as any} value={ratingComment} onChange={e => setRatingComment(e.target.value)} placeholder='Comment (optional)...' />
              <button onClick={handleRate} disabled={!rating} style={{ background: `linear-gradient(135deg,${c.gold},${dark ? '#b8935c' : '#a07840'})`, color: '#0f0f0f', border: 'none', padding: 12, borderRadius: 8, fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%', opacity: rating ? 1 : .4 }}>Submit Rating</button>
            </div>
          )}
          {rated && isDelivered && <div style={{ background: 'rgba(74,155,111,.1)', border: '1px solid rgba(74,155,111,.3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: c.green, textAlign: 'center', marginBottom: 12 }}>✓ Thank you for your feedback!</div>}

          <button onClick={() => { setTrackOrder(null); setTrackId(''); try { localStorage.removeItem(`infiora_track_id_${roomId}`); localStorage.removeItem(`infiora_track_order_${roomId}`) } catch {} }} style={{ background: 'transparent', border: 'none', color: c.muted, fontSize: 11, cursor: 'pointer', textDecoration: 'underline', display: 'block', margin: '4px auto 0' }}>
            Dismiss tracker
          </button>
        </div>
      </div>
    )
  }

  if (loading) return <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{ width: 40, height: 40, border: `3px solid ${c.border}`, borderTop: `3px solid ${c.gold}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>
  if (error) return <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}><div style={{ background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 12, padding: '24px 32px', maxWidth: 380, textAlign: 'center' }}><div style={{ fontSize: 40, marginBottom: 12 }}>🚫</div><p style={{ color: c.muted, fontSize: 14 }}>{error}</p></div></div>

  const pm = settings.paymentMethods

  // ── CODE STEP ───────────────────────────────────────────────────────────────
  if (step === 'code') return (
    <div style={s.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Sans:wght@300;400;500&display=swap'); @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={s.header}>
        <BrandBlock />
        <DarkBtn />
      </div>
      {/* Hero */}
      <div style={{ background: c.heroBg, borderBottom: `1px solid ${c.border}`, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: c.muted, marginBottom: 4 }}>Room Service</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 300, color: c.heroText, letterSpacing: 1 }}>{hotelName || 'Hotel'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: c.muted }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.green, animation: 'blink 2s infinite' }} />
            {settings.availableFrom && settings.availableFrom !== '00:00'
              ? `Available ${settings.availableFrom} – ${settings.availableTo}`
              : 'Available 24/7'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 140px)', padding: 24 }}>
        <div style={{ background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 16, padding: '40px 36px', maxWidth: 400, width: '100%' }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 300, color: c.gold, marginBottom: 6, letterSpacing: 1 }}>Welcome</div>
          <p style={{ color: c.muted, fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>Enter your reservation code to browse the menu and place an order.</p>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: c.muted, display: 'block', marginBottom: 5 }}>Reservation Code</label>
            <input
              style={{ ...s.input, letterSpacing: 3, fontSize: 18, fontFamily: "'Cormorant Garamond',serif", textTransform: 'uppercase', borderColor: codeError ? c.red : undefined } as any}
              value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setCodeError('') }}
              onKeyDown={e => e.key === 'Enter' && code.trim() && setStep('menu')}
              placeholder='e.g. SMITH101' autoFocus
            />
            {codeError && <p style={{ color: c.red, fontSize: 12, marginTop: 5 }}>{codeError}</p>}
          </div>
          <button
            onClick={() => code.trim() && setStep('menu')}
            disabled={!code.trim()}
            style={{ background: `linear-gradient(135deg,${c.gold},${dark ? '#b8935c' : '#a07840'})`, color: '#0f0f0f', border: 'none', padding: '14px', borderRadius: 8, fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: .5, textTransform: 'uppercase', width: '100%', opacity: code.trim() ? 1 : .4 }}
          >Browse Menu</button>
        </div>
      </div>
    </div>
  )

  // ── MENU STEP ───────────────────────────────────────────────────────────────
  if (step === 'menu') return (
    <div style={s.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Sans:wght@300;400;500&display=swap'); @keyframes spin{to{transform:rotate(360deg)}} @keyframes sglow{0%,100%{box-shadow:0 0 0 0 rgba(201,169,110,.3)}50%{box-shadow:0 0 0 8px rgba(201,169,110,0)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:.25}} .menu-card:hover{border-color:${c.gold}44!important;transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.12)}`}</style>

      {/* Header */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setStep('code')} style={{ background: 'transparent', border: 'none', color: c.muted, cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: "'DM Sans',sans-serif" }}>← Back</button>
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
          <button onClick={() => setDark(!dark)} style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.muted, padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>{dark ? '☀' : '☾'}</button>
          <button onClick={() => setCartOpen(true)} style={s.cartBtn}>
            🛒 Cart
            <span style={{ background: '#0f0f0f', color: c.gold, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{cartCount}</span>
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: c.heroBg, borderBottom: `1px solid ${c.border}`, padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: c.muted, marginBottom: 3 }}>Room Service</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 300, color: c.heroText, letterSpacing: 1 }}>{hotelName || 'Hotel'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: c.muted }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.green, animation: 'blink 2s infinite' }} />
            {settings.availableFrom && settings.availableFrom !== '00:00'
              ? `Available ${settings.availableFrom} – ${settings.availableTo}`
              : 'Available 24/7'}
          </div>
        </div>
      </div>

      {/* Inline tracker */}
      <TrackerCard />

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
            <div style={{ fontSize: 44, marginBottom: 12 }}>🍽</div>
            <p style={{ fontSize: 13 }}>No items available in this category</p>
          </div>
        ) : visibleItems.filter(i => i.available).map(item => {
          const inCart = cart.find(ci => ci.item.id === item.id)
          const price = dp(item)
          return (
            <div key={item.id} className='menu-card' style={{ background: c.cardBg, border: `1px solid ${c.borderMuted}`, borderRadius: 14, overflow: 'hidden', position: 'relative', transition: 'all .3s' }}>
              {item.badge === 'sale' && <span style={{ position: 'absolute', top: 10, left: 10, background: c.red, color: '#fff', fontSize: 9, padding: '3px 8px', borderRadius: 20, fontWeight: 700, letterSpacing: .5, textTransform: 'uppercase', zIndex: 1 }}>SALE</span>}
              {item.badge === 'new' && <span style={{ position: 'absolute', top: 10, right: 10, background: c.gold, color: '#0f0f0f', fontSize: 9, padding: '3px 8px', borderRadius: 20, fontWeight: 700, letterSpacing: .5, textTransform: 'uppercase', zIndex: 1 }}>NEW</span>}
              {item.badge === 'hit' && <span style={{ position: 'absolute', top: 10, right: 10, background: c.red, color: '#fff', fontSize: 9, padding: '3px 8px', borderRadius: 20, fontWeight: 700, letterSpacing: .5, textTransform: 'uppercase', zIndex: 1 }}>HIT</span>}
              {isImgUrl(item.image)
                ? <div style={{ width: '100%', height: 130, overflow: 'hidden' }}><img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
                : <div style={{ width: '100%', height: 110, background: `linear-gradient(135deg,${c.bg3},${c.bg4})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52 }}>{item.image || '🍽'}</div>
              }
              <div style={{ padding: '14px 16px 16px' }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 19, fontWeight: 600, color: c.text, marginBottom: 3 }}>{item.name}</div>
                {item.description && <div style={{ fontSize: 11, color: c.muted, lineHeight: 1.55, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>{item.description}</div>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 21, fontWeight: 600, color: c.gold }}>{cur}{price.toFixed(2)}</span>
                    {item.discount && item.discount > 0 ? <span style={{ fontSize: 12, color: c.muted, textDecoration: 'line-through' }}>{cur}{item.price.toFixed(2)}</span> : null}
                  </div>
                  {inCart ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => removeFromCart(item.id)} style={{ background: c.bg3, border: `1px solid ${c.border}`, color: c.gold, width: 30, height: 30, borderRadius: '50%', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
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
            View Cart ({cartCount}) · {cur}{cartTotal.toFixed(2)}
          </button>
        </div>
      )}

      {/* Cart Panel */}
      {cartOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) setCartOpen(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          <div style={{ background: c.bg2, width: 410, height: '100vh', borderLeft: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', maxWidth: '100vw' }}>
            <div style={{ padding: '20px 22px', borderBottom: `1px solid ${c.borderMuted}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: c.gold }}>Your cart</div>
              <button onClick={() => setCartOpen(false)} style={{ background: 'transparent', border: `1px solid ${c.borderMuted}`, color: c.muted, width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: c.muted }}>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>🛒</div>
                  <p style={{ fontSize: 13 }}>Your cart is empty</p>
                </div>
              ) : cart.map(({ item, qty }) => (
                <div key={item.id} style={{ background: c.bg3, borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 7, background: c.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0, overflow: 'hidden' }}>
                    {isImgUrl(item.image) ? <img src={item.image} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 7 }} /> : (item.image || '🍽')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: c.muted }}>{cur}{dp(item).toFixed(2)} each</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => removeFromCart(item.id)} style={{ background: c.bg2, border: `1px solid ${c.border}`, color: c.gold, width: 24, height: 24, borderRadius: '50%', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
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

  // ── CHECKOUT STEP ───────────────────────────────────────────────────────────
  if (step === 'checkout') return (
    <div style={s.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Sans:wght@300;400;500&display=swap')`}</style>
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setStep('menu')} style={{ background: 'transparent', border: 'none', color: c.muted, cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: "'DM Sans',sans-serif" }}>← Back</button>
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
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 0', borderBottom: `1px solid ${c.borderMuted}` }}>
              <span><span style={{ color: c.muted, marginRight: 6, fontFamily: "'Cormorant Garamond',serif" }}>{qty}×</span>{item.name}</span>
              <span>{cur}{(dp(item) * qty).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: `1px solid ${c.borderMuted}` }}>
            <span style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: c.muted }}>Total</span>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, color: c.gold }}>{cur}{cartTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment */}
        {pm && (pm.cash || pm.card || pm.online) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: c.muted, borderBottom: `1px solid ${c.borderMuted}`, paddingBottom: 6, marginBottom: 10 }}>Payment Method</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pm.cash && <label onClick={() => setPayment('cash')} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: payment === 'cash' ? `rgba(${dark ? '201,169,110' : '184,147,92'},.06)` : c.bg3, border: `2px solid ${payment === 'cash' ? c.gold : c.borderMuted}`, borderRadius: 10, padding: 14, cursor: 'pointer' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>💵</span>
                <div><div style={{ fontSize: 14, fontWeight: 500, color: c.text, marginBottom: 2 }}>Cash on delivery</div><div style={{ fontSize: 11, color: c.muted }}>Pay when your order arrives</div></div>
              </label>}
              {pm.card && <label onClick={() => setPayment('card')} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: payment === 'card' ? `rgba(${dark ? '201,169,110' : '184,147,92'},.06)` : c.bg3, border: `2px solid ${payment === 'card' ? c.gold : c.borderMuted}`, borderRadius: 10, padding: 14, cursor: 'pointer' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>💳</span>
                <div><div style={{ fontSize: 14, fontWeight: 500, color: c.text, marginBottom: 2 }}>Card / POS</div><div style={{ fontSize: 11, color: c.muted }}>Pay by card on a terminal</div></div>
              </label>}
              {pm.online && <label onClick={() => setPayment('online')} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: payment === 'online' ? `rgba(74,127,203,.06)` : c.bg3, border: `2px solid ${payment === 'online' ? c.gold : c.borderMuted}`, borderRadius: 10, padding: 14, cursor: 'pointer' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>🌐</span>
                <div><div style={{ fontSize: 14, fontWeight: 500, color: c.text, marginBottom: 2 }}>Pay at the end</div><div style={{ fontSize: 11, color: c.muted }}>Settle at checkout or before leaving</div></div>
              </label>}
            </div>
          </div>
        )}

        {/* Details */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: c.muted, borderBottom: `1px solid ${c.borderMuted}`, paddingBottom: 6, marginBottom: 12 }}>Your Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: c.muted, display: 'block', marginBottom: 5 }}>Reservation Code *</label>
              <input style={{ ...s.input, letterSpacing: 2, fontFamily: "'Cormorant Garamond',serif", fontSize: 16, borderColor: codeError ? c.red : undefined, textTransform: 'uppercase' } as any} value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setCodeError('') }} placeholder='SMITH101' />
              {codeError && <p style={{ color: c.red, fontSize: 12, marginTop: 4 }}>{codeError}</p>}
            </div>
            <div>
              <label style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: c.muted, display: 'block', marginBottom: 5 }}>Room Number *</label>
              <input style={{ ...s.input, letterSpacing: 2, fontFamily: "'Cormorant Garamond',serif", fontSize: 16, borderColor: roomNumberError ? c.red : undefined } as any} value={guestRoomNumber} onChange={e => { setGuestRoomNumber(e.target.value); setRoomNumberError('') }} placeholder='e.g. 231' />
              {roomNumberError && <p style={{ color: c.red, fontSize: 12, marginTop: 4 }}>{roomNumberError}</p>}
            </div>
            <div>
              <label style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: c.muted, display: 'block', marginBottom: 5 }}>Email (optional)</label>
              <input style={s.input} type='email' value={email} onChange={e => setEmail(e.target.value)} placeholder='your@email.com' />
            </div>
            <div>
              <label style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: c.muted, display: 'block', marginBottom: 5 }}>Note (optional)</label>
              <textarea style={{ ...s.input, resize: 'none', height: 64 } as any} value={note} onChange={e => setNote(e.target.value)} placeholder='Allergies, special requests...' />
            </div>
          </div>
        </div>

        <button onClick={handlePlace} disabled={placing || !code.trim() || !guestRoomNumber.trim()} style={{ background: `linear-gradient(135deg,${c.gold},${dark ? '#b8935c' : '#a07840'})`, color: '#0f0f0f', border: 'none', padding: 14, borderRadius: 8, fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: .5, textTransform: 'uppercase', width: '100%', opacity: placing || !code.trim() || !guestRoomNumber.trim() ? 0.4 : 1 }}>
          {placing ? 'Placing order...' : `Place Order · ${cur}${cartTotal.toFixed(2)}`}
        </button>
      </div>
      {toast && <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 18px', fontSize: 12, color: c.text, zIndex: 500 }}>{toast}</div>}
    </div>
  )

  return null
}
