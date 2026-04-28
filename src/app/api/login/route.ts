import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json(
      { message: ['Email and password are required'] },
      { status: 400 }
    )
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) {
    return NextResponse.json({ message: ['Server configuration error'] }, { status: 500 })
  }

  try {
    const response = await fetch(`${apiUrl}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      return NextResponse.json(
        { message: ['Email or Password is invalid'] },
        { status: 401, statusText: 'Unauthorized Access' }
      )
    }

    const user = await response.json()
    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ message: ['Login service unavailable'] }, { status: 503 })
  }
}
