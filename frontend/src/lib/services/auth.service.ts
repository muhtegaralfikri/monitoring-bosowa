import { api } from './api'
import type { LoginInput, RegisterInput, User, AuthResponse } from '../types'

export const authService = {
  async login(input: LoginInput): Promise<AuthResponse> {
    return api.post('/auth/login', input) as Promise<AuthResponse>
  },

  async register(input: RegisterInput): Promise<{ user: User }> {
    return api.post('/auth/register', input) as Promise<{ user: User }>
  },

  async getMe(): Promise<{ user: User }> {
    return api.get('/auth/me') as Promise<{ user: User }>
  },

  async refresh(): Promise<AuthResponse> {
    return api.post('/auth/refresh', {}) as Promise<AuthResponse>
  },

  async logout(): Promise<{ message: string }> {
    return api.post('/auth/logout', {}) as Promise<{ message: string }>
  },
}
