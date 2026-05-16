const VISITOR_STORAGE_KEY = 'infiora.visitor-session.v1'
const VISITOR_SESSION_TTL_MS = 8 * 60 * 60 * 1000

type StoredVisitorSession = {
  id: string
  expiresAt: number
}

const canUseSessionStorage = () => typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'

const createVisitorSession = (): StoredVisitorSession => ({
  id: crypto.randomUUID(),
  expiresAt: Date.now() + VISITOR_SESSION_TTL_MS,
})

export const getAnonymousVisitorId = (): string => {
  const fallback = crypto.randomUUID()

  if (!canUseSessionStorage()) {
    return fallback
  }

  try {
    const raw = window.sessionStorage.getItem(VISITOR_STORAGE_KEY)

    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredVisitorSession>

      if (typeof parsed.id === 'string' && typeof parsed.expiresAt === 'number' && parsed.expiresAt > Date.now()) {
        return parsed.id
      }
    }

    const nextSession = createVisitorSession()
    window.sessionStorage.setItem(VISITOR_STORAGE_KEY, JSON.stringify(nextSession))

    return nextSession.id
  } catch {
    return fallback
  }
}

export const resetAnonymousVisitorId = (): void => {
  if (!canUseSessionStorage()) {
    return
  }

  try {
    window.sessionStorage.removeItem(VISITOR_STORAGE_KEY)
  } catch {
    // Ignore storage failures in restricted browsing contexts.
  }
}
