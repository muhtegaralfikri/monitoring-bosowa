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

async function handleResponse(res: Response) {
  if (res.status === 401) {
    // Don't redirect if already on login page
    if (window.location.pathname === '/login') {
      throw new Error('Unauthorized')
    }

    // Try refresh token
    const refreshed = await refreshAccessToken()

    if (refreshed && accessToken) {
      // Retry original request with new token
      return fetch(res.url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
      }).then(handleResponse)
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
    }).then(handleResponse),

  post: (url: string, data: unknown) =>
    fetch(`${API_URL}${url}`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    }).then(handleResponse),

  put: (url: string, data: unknown) =>
    fetch(`${API_URL}${url}`, {
      method: 'PUT',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    }).then(handleResponse),

  delete: (url: string) =>
    fetch(`${API_URL}${url}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include',
    }).then(handleResponse),
}
