import { API_URL } from '../constants'

let accessToken: string | null = null

export function setAccessToken(token: string) {
  accessToken = token
}

export function clearAccessToken() {
  accessToken = null
}

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  if (isRefreshing) {
    return refreshPromise || Promise.resolve(false)
  }

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })

      if (refreshRes.ok) {
        const data = await refreshRes.json() as { user: unknown; token: string }
        setAccessToken(data.token)
        return true
      }
      return false
    } catch {
      return false
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// Track retry attempts to prevent infinite loops
const retryMap = new Map<string, number>()
const MAX_RETRIES = 1

type RequestMeta = {
  url: string
  method: string
  body?: BodyInit | null
}

async function handleResponse(res: Response, request: RequestMeta, retryCount = 0): Promise<unknown> {
  if (res.status === 401) {
    // Don't redirect if already on login page
    if (window.location.pathname === '/login') {
      throw new Error('Unauthorized')
    }

    // Check if we've already retried this request
    const requestKey = `${request.url}_${request.method}`
    const retryAttempts = retryMap.get(requestKey) || 0
    if (retryCount >= MAX_RETRIES || retryAttempts >= MAX_RETRIES) {
      // Clear auth and redirect to login
      clearAccessToken()
      window.location.href = '/login'
      throw new Error('Session expired')
    }

    // Mark as retrying
    retryMap.set(requestKey, (retryMap.get(requestKey) || 0) + 1)

    // Try refresh token
    const refreshed = await refreshAccessToken()

    if (refreshed && accessToken) {
      // Retry original request with new token (non-recursive)
      const headers = getHeaders()
      const retryInit: RequestInit = {
        method: request.method,
        headers,
        credentials: 'include',
      }

      if (request.body && request.method !== 'GET' && request.method !== 'HEAD') {
        retryInit.body = request.body
      }

      const retryRes = await fetch(request.url, retryInit)

      // Clear retry map for successful request
      if (retryRes.ok) {
        retryMap.delete(requestKey)
        return retryRes.json()
      }

      // If still 401 after refresh, give up
      if (retryRes.status === 401) {
        clearAccessToken()
        window.location.href = '/login'
        throw new Error('Session expired')
      }

      return handleResponse(retryRes, request, retryCount + 1)
    } else {
      // Clear auth and redirect to login
      clearAccessToken()
      window.location.href = '/login'
      throw new Error('Session expired')
    }
  }

  if (!res.ok) {
    const error = await res.json() as { error: string }
    throw new Error(error.error || 'Something went wrong')
  }

  return res.json()
}

async function handleFileResponse(
  res: Response,
  request: RequestMeta,
  retryCount = 0
): Promise<Response> {
  if (res.status === 401) {
    if (window.location.pathname === '/login') {
      throw new Error('Unauthorized')
    }

    const requestKey = `${request.url}_${request.method}`
    const retryAttempts = retryMap.get(requestKey) || 0
    if (retryCount >= MAX_RETRIES || retryAttempts >= MAX_RETRIES) {
      clearAccessToken()
      window.location.href = '/login'
      throw new Error('Session expired')
    }

    retryMap.set(requestKey, (retryMap.get(requestKey) || 0) + 1)

    const refreshed = await refreshAccessToken()

    if (refreshed && accessToken) {
      const headers = getHeaders()
      const retryInit: RequestInit = {
        method: request.method,
        headers,
        credentials: 'include',
      }

      if (request.body && request.method !== 'GET' && request.method !== 'HEAD') {
        retryInit.body = request.body
      }

      const retryRes = await fetch(request.url, retryInit)

      if (retryRes.ok) {
        retryMap.delete(requestKey)
        return retryRes
      }

      if (retryRes.status === 401) {
        clearAccessToken()
        window.location.href = '/login'
        throw new Error('Session expired')
      }

      return handleFileResponse(retryRes, request, retryCount + 1)
    }

    clearAccessToken()
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    let errorMessage = 'Something went wrong'
    try {
      const error = await res.json() as { error?: string }
      if (error.error) {
        errorMessage = error.error
      }
    } catch {
      // Ignore JSON parse errors for binary responses
    }
    throw new Error(errorMessage)
  }

  return res
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  return headers
}

function request(url: string, init: RequestInit = {}) {
  const method = (init.method || 'GET').toUpperCase()
  const requestMeta: RequestMeta = {
    url,
    method,
    body: init.body ?? null,
  }

  return fetch(url, {
    ...init,
    headers: getHeaders(),
    credentials: 'include',
  }).then((res) => handleResponse(res, requestMeta, 0))
}

function requestFile(url: string, init: RequestInit = {}) {
  const method = (init.method || 'GET').toUpperCase()
  const requestMeta: RequestMeta = {
    url,
    method,
    body: init.body ?? null,
  }

  return fetch(url, {
    ...init,
    headers: getHeaders(),
    credentials: 'include',
  }).then((res) => handleFileResponse(res, requestMeta, 0))
}

export const api = {
  get: (url: string) =>
    request(`${API_URL}${url}`),

  post: (url: string, data: unknown) =>
    request(`${API_URL}${url}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  put: (url: string, data: unknown) =>
    request(`${API_URL}${url}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  patch: (url: string, data: unknown) =>
    request(`${API_URL}${url}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (url: string) =>
    request(`${API_URL}${url}`, {
      method: 'DELETE',
    }),

  getFile: (url: string) =>
    requestFile(`${API_URL}${url}`),
}
