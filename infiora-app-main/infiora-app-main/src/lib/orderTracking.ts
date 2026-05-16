export interface TrackOrder {
  orderId: string
  status: string
  items: unknown[]
  total: number
  note?: string
  acceptedEta?: number
  roomNumber: string
  payment: string
  rating?: number
  guestRoomNumber?: string
  scheduledFor?: string
  surfacedAt?: string | null
}

export interface StoredTrackingState {
  expiresAt: number
  trackOrder: TrackOrder | null
  trackId: string
  trackToken: string
}

export const TRACKING_STORAGE_TTL_MS = 2 * 60 * 60 * 1000

export const getTrackingStorageKey = (roomId: string): string =>
  `infiora_track_state_${roomId}`

export const readTrackingState = (roomId: string): StoredTrackingState | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(getTrackingStorageKey(roomId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredTrackingState
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      sessionStorage.removeItem(getTrackingStorageKey(roomId))
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export const writeTrackingState = (
  roomId: string,
  state: Omit<StoredTrackingState, 'expiresAt'>
): void => {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(
      getTrackingStorageKey(roomId),
      JSON.stringify({ ...state, expiresAt: Date.now() + TRACKING_STORAGE_TTL_MS })
    )
  } catch {}
}

export const clearTrackingState = (roomId: string): void => {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(getTrackingStorageKey(roomId))
  } catch {}
}
