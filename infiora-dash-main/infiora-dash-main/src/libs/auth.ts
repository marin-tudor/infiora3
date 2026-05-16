// Third-party Imports
import CredentialProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import type { NextAuthOptions } from 'next-auth'
import type { Adapter } from 'next-auth/adapters'

import { verifyLoginProof } from './loginProof'

const providers: NextAuthOptions['providers'] = [
  CredentialProvider({
    name: 'Credentials',
    type: 'credentials',
    credentials: {
      loginProof: { label: 'Login proof', type: 'text' }
    },
    async authorize(credentials) {
      return verifyLoginProof((credentials as any)?.loginProof)
    }
  })
]

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  )
}

const prismaAdapter = process.env.DATABASE_URL ? (PrismaAdapter(new PrismaClient()) as Adapter) : undefined

export const authOptions: NextAuthOptions = {
  ...(prismaAdapter ? { adapter: prismaAdapter } : {}),

  providers,

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },

  pages: {
    signIn: '/login'
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token = { ...user }
      }

      if (trigger === 'update') {
        token = { ...token, ...session }
      }

      return token
    },
    async session({ session, token }: any) {
      return { ...session, user: token }
    }
  }
}
