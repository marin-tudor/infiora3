import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { fetchBaseQuery } from '@reduxjs/toolkit/query';
import { Mutex } from 'async-mutex';
import { logout } from '../features/userSlice';
import { env } from '@/configs/env';

const baseUrl = typeof window !== 'undefined' ? '' : env.NEXT_PUBLIC_API_URL;

const getCsrfToken = () => {
  if (typeof document === 'undefined') {
    return '';
  }

  const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/);

  return match ? decodeURIComponent(match[1]) : '';
};

// Create a new mutex
const mutex = new Mutex();

const baseQuery = fetchBaseQuery({
  baseUrl,
  credentials: 'include',
  prepareHeaders: headers => {
    const csrfToken = getCsrfToken();

    if (csrfToken) {
      headers.set('x-csrf-token', csrfToken);
    }

    return headers;
  },
});

const customFetchBase: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // wait until the mutex is available without locking it
  await mutex.waitForUnlock();
  let result = await baseQuery(args, api, extraOptions);
  const url = typeof args === 'string' ? args : args.url;

  if (
    result.error &&
    result.error.status === 401 &&
    !url.includes('/auth')
  ) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();

      try {
        const refreshResult = await baseQuery(
          {
            credentials: 'include',
            url: '/v1/auth/refresh-tokens',
            method: 'POST',
          },
          api,
          extraOptions
        );

        if (refreshResult.error && window) {
          api.dispatch(logout());
          window.location.href = '/login';
        } else {
          result = await baseQuery(args, api, extraOptions);
        }
      } finally {
        // release must be called once the mutex should be released again.
        release();
      }
    } else {
      // wait until the mutex is available without locking it
      await mutex.waitForUnlock();
      result = await baseQuery(args, api, extraOptions);
    }
  }

  return result;
};

export default customFetchBase;
