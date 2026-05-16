export const getCsrfToken = () => {
  if (typeof document === 'undefined') {
    return ''
  }

  const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/)

  return match ? decodeURIComponent(match[1]) : ''
}

export const createCsrfHeaders = (headers?: HeadersInit) => {
  const csrfToken = getCsrfToken()
  const nextHeaders = new Headers(headers)

  if (csrfToken) {
    nextHeaders.set('x-csrf-token', csrfToken)
  }

  return nextHeaders
}
