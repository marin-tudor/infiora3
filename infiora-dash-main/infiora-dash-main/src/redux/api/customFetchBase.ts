import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { fetchBaseQuery } from '@reduxjs/toolkit/query'
import { Mutex } from 'async-mutex'
import { signOut } from 'next-auth/react'

import { getCsrfToken } from '@/libs/csrf'

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  credentials: 'include',
  prepareHeaders: headers => {
    const csrfToken = getCsrfToken()

    if (csrfToken) {
      headers.set('x-csrf-token', csrfToken)
    }

    return headers
  }
})

const mutex = new Mutex()

const refreshAuthToken = async (api: any, extraOptions: any) => {
  const result: any = await baseQuery(
    {
      url: '/v1/auth/refresh-tokens',
      method: 'POST'
    },
    api,
    extraOptions
  )

  if (result.error) {
    await signOut()
    throw new Error(result.error.data?.message || result.error.message)
  }

  return result
}

const customFetchBase: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  await mutex.waitForUnlock()

  let result = await baseQuery(args, api, extraOptions)
  const url = typeof args === 'string' ? args : args.url

  if (result.error && result.error.status === 401 && !url.includes('/auth')) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire()

      try {
        await refreshAuthToken(api, extraOptions)
        result = await baseQuery(args, api, extraOptions)
      } catch (error: any) {
        console.error(error.message)
      } finally {
        release()
      }
    } else {
      await mutex.waitForUnlock()
      result = await baseQuery(args, api, extraOptions)
    }
  }

  return result
}

export default customFetchBase
