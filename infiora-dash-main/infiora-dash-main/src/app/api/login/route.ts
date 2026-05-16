import { NextResponse } from 'next/server'

import { createLoginProof } from '@/libs/loginProof'

const LOGIN_TIMEOUT_MS = 10000
const HOTEL_TIMEOUT_MS = 5000

const fetchWithTimeout = async (input: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timeout)
  }
}

const normalizeId = (value: any): string | undefined => {
  if (!value) return undefined
  if (typeof value === 'string') return value
  if (typeof value === 'object') return String(value.id ?? value._id ?? '')

  return String(value)
}

const normalizeHotel = (hotel: any) => {
  if (!hotel) return null

  return {
    ...hotel,
    id: normalizeId(hotel.id ?? hotel._id)
  }
}

const getDefaultHotel = async (apiUrl: string, user: any, accessToken?: string) => {
  if (!accessToken) return null

  const params = new URLSearchParams({ limit: '100' })

  if (user?.role !== 'manager' && user?.id) {
    params.set('user', user.id)
  }

  try {
    const response = await fetchWithTimeout(
      `${apiUrl}/v1/hotels?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        cache: 'no-store'
      },
      HOTEL_TIMEOUT_MS
    )

    if (!response.ok) return null

    const payload = await response.json()
    const hotels = Array.isArray(payload?.results) ? payload.results : []

    return normalizeHotel(hotels.find((hotel: any) => hotel?.isActive) ?? hotels[0])
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ message: ['Email and password are required'] }, { status: 400 })
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  if (!apiUrl) {
    return NextResponse.json({ message: ['Server configuration error'] }, { status: 500 })
  }

  try {
    const response = await fetchWithTimeout(
      `${apiUrl}/v1/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      },
      LOGIN_TIMEOUT_MS
    )

    if (!response.ok) {
      return NextResponse.json(
        { message: ['Email or Password is invalid'] },
        { status: 401, statusText: 'Unauthorized Access' }
      )
    }

    const authPayload = await response.json()

    const verifiedUser = {
      ...authPayload?.user,
      id: normalizeId(authPayload?.user?.id ?? authPayload?.user?._id)
    }

    if (!verifiedUser?.id || !verifiedUser?.email) {
      return NextResponse.json({ message: ['Login response is invalid'] }, { status: 502 })
    }

    const defaultHotel = await getDefaultHotel(apiUrl, verifiedUser, authPayload?.tokens?.access?.token)
    const userWithHotel = { ...verifiedUser, hotel: defaultHotel }

    const loginProof = createLoginProof(userWithHotel)
    const nextResponse = NextResponse.json({ user: userWithHotel, loginProof })

    const forwardedCookies =
      typeof (response.headers as any).getSetCookie === 'function'
        ? (response.headers as any).getSetCookie()
        : response.headers.get('set-cookie')
          ? [response.headers.get('set-cookie') as string]
          : []

    forwardedCookies.forEach((cookie: string) => {
      nextResponse.headers.append('set-cookie', cookie)
    })

    return nextResponse
  } catch {
    return NextResponse.json({ message: ['Login service unavailable'] }, { status: 503 })
  }
}
