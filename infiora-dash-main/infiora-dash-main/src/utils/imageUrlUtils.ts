import { isNullOrEmpty } from './miscUtils'

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || ''
const LOCAL_UPLOAD_PATH_PREFIXES = ['/v1/uploads/', '/uploads/']

const isLocalUploadPath = (pathname: string): boolean =>
  LOCAL_UPLOAD_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix))

export const resolveAssetUrl = (value?: string | null): string => {
  if (isNullOrEmpty(value)) {
    return ''
  }

  const raw = String(value).trim()

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const parsed = new URL(raw)

      if (API_BASE && isLocalUploadPath(parsed.pathname)) {
        return `${API_BASE}${parsed.pathname}${parsed.search}`
      }
    } catch {
      return raw
    }

    return raw
  }

  if (raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw
  }

  if (isLocalUploadPath(raw)) {
    return `${API_BASE}${raw}`
  }

  return raw
}

export const getRoomImageUrl = (room: any) => {
  if (room && !isNullOrEmpty(room.image)) {
    return resolveAssetUrl(room.image)
  }

  return '/images/placeholders/link.png'
}

export const getHotelImageUrl = (hotel: any) => {
  if (hotel && !isNullOrEmpty(hotel.image)) {
    return resolveAssetUrl(hotel.image)
  }

  return '/images/placeholders/link.png'
}

export const getLinkImageUrl = (link: any) => {
  if (link && !isNullOrEmpty(link.image)) {
    return resolveAssetUrl(link.image)
  }

  return '/images/placeholders/link.png'
}
