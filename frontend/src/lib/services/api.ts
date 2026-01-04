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

async function handleResponse(res: Response, retryCount = 0): Promise<unknown> {
  if (res.status === 401) {
    // Don't redirect if already on login page
    if (window.location.pathname === '/login') {
      throw new Error('Unauthorized')
    }

    // Check if we've already retried this request
    const requestKey = `${res.url}_${res.method}`
    if (retryCount >= MAX_RETRIES || retryMap.get(requestKey) || 0 >= MAX_RETRIES) {
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
      const retryRes = await fetch(res.url, {
        headers,
        credentials: 'include',
      })

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

      return handleResponse(retryRes, retryCount + 1)
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

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  return headers
}

export const api = {
  get: (url: string) =>
    fetch(`${API_URL}${url}`, {
      headers: getHeaders(),
      credentials: 'include',
    }).then((res) => handleResponse(res, 0)),

  post: (url: string, data: unknown) =>
    fetch(`${API_URL}${url}`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    }).then((res) => handleResponse(res, 0)),

  put: (url: string, data: unknown) =>
    fetch(`${API_URL}${url}`, {
      method: 'PUT',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    }).then((res) => handleResponse(res, 0)),

  patch: (url: string, data: unknown) =>
    fetch(`${API_URL}${url}`, {
      method: 'PATCH',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    }).then((res) => handleResponse(res, 0)),

  delete: (url: string) =>
    fetch(`${API_URL}${url}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include',
    }).then((res) => handleResponse(res, 0)),
}
