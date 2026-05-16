# Booking Slots & Orders Inline Picker - Fix Plan

**Datum:** 2026-04-28  
**Status:** Pending implementation

---

## Problem 1 - "No slots available for this date" se ne prikazuje

### Root cause

`GuestBookingsBrowsePage.tsx:160` provjerava `slots.length === 0`, ali backend (`booking.controller.ts:112`) vraca **sve** slotove za dan - ukljucujuci blokirane (`isBlocked: true`) i pune (`bookedPersons >= maxPersons`). Kad postoje slotovi u bazi ali su svi nedostupni, niz nije prazan -> poruka se nikad ne prikazuje.

### Fix

**Datoteka:** `infiora-app-main/src/views/bookings/GuestBookingsBrowsePage.tsx`

1. Izracunaj dostupne slotove odmah nakon `setSlots`:

```tsx
// Nakon linije 43 (state deklaracije):
const availableSlots = slots.filter(s => !s.isBlocked && s.bookedPersons < s.maxPersons)
```

2. Zamijeni uvjet za "no slots" poruku (~linija 160):

```tsx
// Staro (pogresno):
{!loadingSlots && slots.length === 0 && (
  <div style={{ color: '#999', textAlign: 'center' }}>No slots available for this date.</div>
)}

// Novo (ispravno):
{!loadingSlots && availableSlots.length === 0 && (
  <div style={{ color: '#999', textAlign: 'center' }}>No slots available for this date.</div>
)}
```

3. Opcionalno - u slot gridu (linija 165) prikazi samo dostupne slotove umjesto svih:

```tsx
// Trenutno:
{slots.map(slot => { ... })}

// Opcija A: zadrzi sve slotove, ali poruka sad ispravno radi
// Opcija B: filtriraj samo dostupne ako ne zelis prikazivati disabled gumbe
{availableSlots.map(slot => { ... })}
```

---

## Problem 2 - Nema inline kalendara za bookable aktivnosti u orders

### Root cause

`GuestOrderPage.tsx:525` za bookable iteme samo radi full-page navigaciju:

```tsx
onClick={() => { window.location.href = `/${roomId}/bookings?itemId=${item.id}` }}
```

Inline bottom-sheet/drawer s datumima i slotovima nikad nije implementiran. Feature je planiran u specifikaciji (2026-04-28 bookable UX spec) ali nije napravljen.

### Fix - Implementacija inline booking drawer-a

**Datoteka:** `infiora-app-main/src/views/orders/GuestOrderPage.tsx`

#### Korak 1 - Dodaj state za booking drawer

```tsx
const [bookingDrawerItem, setBookingDrawerItem] = useState<Item | null>(null)
const [bookingDrawerDate, setBookingDrawerDate] = useState(new Date().toISOString().slice(0, 10))
const [bookingDrawerSlots, setBookingDrawerSlots] = useState<TimeSlot[]>([])
const [bookingDrawerLoadingSlots, setBookingDrawerLoadingSlots] = useState(false)
const [hotelId, setHotelId] = useState('')
```

#### Korak 2 - Dohvati hotelId pri loadu catalog-a

U postojecem `useEffect` za load catalog-a, dodaj dohvat hotelId:

```tsx
// Dodaj uz catalog fetch:
fetch(`${API}/v1/rooms/${roomId}`)
  .then(r => r.json())
  .then(d => setHotelId(d.hotel?.id ?? ''))
  .catch(() => {})
```

#### Korak 3 - useEffect za fetch slotova kad se item/datum promijeni u draweru

```tsx
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
```

#### Korak 4 - Zamijeni "Book ->" gumb da otvori drawer

```tsx
// Staro:
onClick={() => { window.location.href = `/${roomId}/bookings?itemId=${item.id}` }}

// Novo:
onClick={() => {
  setBookingDrawerItem(item)
  setBookingDrawerDate(new Date().toISOString().slice(0, 10))
  setBookingDrawerSlots([])
}}
```

#### Korak 5 - Dodaj BookingDrawer komponentu (inline u GuestOrderPage)

Prikazuje se kao overlay panel (bottom-sheet na mobilnom) - slicno cart panelu koji vec postoji.

```tsx
{bookingDrawerItem && (
  <div
    onClick={e => { if (e.target === e.currentTarget) setBookingDrawerItem(null) }}
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
  >
    <div style={{ background: c.bg2, width: '100%', maxHeight: '85vh', borderRadius: '16px 16px 0 0', overflow: 'auto', padding: '20px 20px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: c.gold }}>{bookingDrawerItem.name}</div>
          {bookingDrawerItem.bookingConfig?.duration && (
            <div style={{ fontSize: 12, color: c.muted }}>[duration] {bookingDrawerItem.bookingConfig.duration} min</div>
          )}
        </div>
        <button
          onClick={() => setBookingDrawerItem(null)}
          style={{ background: 'transparent', border: `1px solid ${c.borderMuted}`, color: c.muted, width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >X</button>
      </div>

      {/* Date picker */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: c.muted, display: 'block', marginBottom: 6 }}>Odaberi datum</label>
        <input
          type='date'
          value={bookingDrawerDate}
          min={new Date().toISOString().slice(0, 10)}
          onChange={e => setBookingDrawerDate(e.target.value)}
          style={{ background: c.inputBg, border: `1px solid ${c.borderMuted}`, color: c.text, padding: '10px 13px', borderRadius: 7, fontSize: 14, width: '100%', outline: 'none' }}
        />
      </div>

      {/* Slots */}
      {bookingDrawerLoadingSlots && (
        <div style={{ textAlign: 'center', color: c.muted, fontSize: 13, padding: '16px 0' }}>Ucitavam termine...</div>
      )}

      {!bookingDrawerLoadingSlots && bookingDrawerSlots.filter(s => !s.isBlocked && s.bookedPersons < s.maxPersons).length === 0 && (
        <div style={{ textAlign: 'center', color: c.muted, fontSize: 13, padding: '20px 0' }}>Nema slobodnih termina za ovaj datum.</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {bookingDrawerSlots.map(slot => {
          const available = !slot.isBlocked && slot.bookedPersons < slot.maxPersons
          if (!available) return null
          const timeStr = new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          return (
            <button
              key={slot.id}
              onClick={() => {
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
                  cancelPolicyHours: '24',
                  addons: '[]',
                  pricePerPerson: 'false',
                })
                window.location.href = `/${roomId}/bookings/confirm?${params.toString()}`
              }}
              style={{
                padding: '10px 6px', borderRadius: 8, border: 'none',
                background: c.gold, color: '#0f0f0f',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
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
```

#### Interface koji treba dodati u GuestOrderPage (za TimeSlot)

```tsx
interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  maxPersons: number
  bookedPersons: number
  isBlocked: boolean
}
```

---

## Redoslijed implementacije

1. **Problem 1** - Brz fix, samo promjena uvjeta u `GuestBookingsBrowsePage.tsx` (5 min)
2. **Problem 2** - Dodati drawer u `GuestOrderPage.tsx` prema gornjim koracima (30-60 min)

---

## Datoteke koje se mijenjaju

| Datoteka | Promjena |
|----------|----------|
| `infiora-app-main/src/views/bookings/GuestBookingsBrowsePage.tsx` | Fix uvjeta za "No slots" poruku |
| `infiora-app-main/src/views/orders/GuestOrderPage.tsx` | Dodati hotelId state, slots state, useEffect za fetch, BookingDrawer overlay, TimeSlot interface |

Backend **ne treba mijenjati**.
