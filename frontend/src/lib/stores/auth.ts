import { writable, derived, get } from 'svelte/store'
import type { User } from '../types'
import { authService } from '../services/auth.service'
import { setAccessToken, clearAccessToken } from '../services/api'
import { API_URL } from '../constants'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    isAuthenticated: false,
  })

  return {
    subscribe,
    init: async () => {
      try {
        // First, try to refresh token to get new access token
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })

        if (refreshRes.ok) {
          const data = await refreshRes.json() as { user: User; token: string }
          setAccessToken(data.token)
          update((state) => ({
            ...state,
            user: data.user,
            isAuthenticated: true,
          }))
          return
        }

        // If refresh fails, try getMe (in case access token still valid)
        const meData = await authService.getMe()
        update((state) => ({
          ...state,
          user: meData.user,
          isAuthenticated: true,
        }))
      } catch {
        set({ user: null, isAuthenticated: false })
      }
    },
    login: async (email: string, password: string) => {
      const data = await authService.login({ email, password })
      // Store access token
      setAccessToken(data.token)
      update((state) => ({
        ...state,
        user: data.user,
        isAuthenticated: true,
      }))
      return data
    },
    logout: async () => {
      await authService.logout()
      clearAccessToken()
      set({ user: null, isAuthenticated: false })
      window.location.href = '/login'
    },
  }
}

export const auth = createAuthStore()

// Derived stores
export const user = derived(auth, ($auth) => $auth.user)
export const isAdmin = derived(auth, ($auth) => $auth.user?.role === 1)
export const isOperasional = derived(auth, ($auth) => $auth.user?.role === 2)
