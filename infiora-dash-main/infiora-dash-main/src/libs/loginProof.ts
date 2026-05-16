import crypto from 'crypto'

import type { User } from 'next-auth'

const LOGIN_PROOF_TTL_MS = 5 * 60 * 1000
const LOGIN_PROOF_VERSION = 1

const getSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET

  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is not configured')
  }

  return secret
}

const toBase64Url = (value: string) => Buffer.from(value, 'utf8').toString('base64url')

const fromBase64Url = (value: string) => Buffer.from(value, 'base64url').toString('utf8')

const signPayload = (payload: string) => crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')

export const createLoginProof = (user: Record<string, unknown>) => {
  const payload = JSON.stringify({
    v: LOGIN_PROOF_VERSION,
    exp: Date.now() + LOGIN_PROOF_TTL_MS,
    nonce: crypto.randomUUID(),
    user
  })

  const encodedPayload = toBase64Url(payload)
  const signature = signPayload(encodedPayload)

  return `${encodedPayload}.${signature}`
}

export const verifyLoginProof = (proof?: string | null): User | null => {
  if (!proof) {
    return null
  }

  const [encodedPayload, signature] = proof.split('.')

  if (!encodedPayload || !signature) {
    return null
  }

  const expectedSignature = signPayload(encodedPayload)
  const provided = Buffer.from(signature, 'utf8')
  const expected = Buffer.from(expectedSignature, 'utf8')

  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload)) as {
    v: number
    exp: number
    user: Record<string, unknown>
  }

  if (payload.v !== LOGIN_PROOF_VERSION || payload.exp <= Date.now()) {
    return null
  }

  const user = payload.user

  if (!user || typeof user.id !== 'string' || typeof user.email !== 'string') {
    return null
  }

  return user as unknown as User
}
