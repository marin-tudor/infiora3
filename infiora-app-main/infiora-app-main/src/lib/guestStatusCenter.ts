export type GuestServiceReceipt = {
  id: string
  token: string
  kind: 'housekeeping' | 'maintenance'
  label: string
  createdAt: string
}

type StoredGuestServiceReceipts = {
  expiresAt: number
  receipts: GuestServiceReceipt[]
}

const SERVICE_RECEIPTS_TTL_MS = 2 * 60 * 60 * 1000

const serviceReceiptsKey = (roomId: string) => `guestServiceReceipts:${roomId}`

export const readGuestServiceReceipts = (roomId: string): GuestServiceReceipt[] => {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.sessionStorage.getItem(serviceReceiptsKey(roomId))
    if (!raw) return []

    const parsed = JSON.parse(raw) as StoredGuestServiceReceipts
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(serviceReceiptsKey(roomId))
      return []
    }

    return parsed.receipts ?? []
  } catch {
    return []
  }
}

export const writeGuestServiceReceipts = (roomId: string, receipts: GuestServiceReceipt[]) => {
  if (typeof window === 'undefined') return

  if (receipts.length === 0) {
    window.sessionStorage.removeItem(serviceReceiptsKey(roomId))
    return
  }

  window.sessionStorage.setItem(
    serviceReceiptsKey(roomId),
    JSON.stringify({
      expiresAt: Date.now() + SERVICE_RECEIPTS_TTL_MS,
      receipts,
    } satisfies StoredGuestServiceReceipts)
  )
}

export const appendGuestServiceReceipt = (roomId: string, receipt: GuestServiceReceipt) => {
  const existing = readGuestServiceReceipts(roomId)
  const next = [receipt, ...existing.filter(entry => !(entry.id === receipt.id && entry.kind === receipt.kind))].slice(0, 12)
  writeGuestServiceReceipts(roomId, next)
}
