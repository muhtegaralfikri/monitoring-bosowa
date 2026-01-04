import { api } from './api'
import type { User, CreateUserInput, UpdateUserInput } from '../types'

export interface UsersResponse {
  data: User[]
}

export const userService = {
  getUsers(): Promise<UsersResponse> {
    return api.get('/users') as Promise<UsersResponse>
  },

  getUserById(id: number): Promise<{ data: User }> {
    return api.get(`/users/${id}`) as Promise<{ data: User }>
  },

  createUser(data: CreateUserInput): Promise<{ data: User }> {
    return api.post('/users', data) as Promise<{ data: User }>
  },

  updateUser(id: number, data: UpdateUserInput): Promise<{ data: User }> {
    return api.put(`/users/${id}`, data) as Promise<{ data: User }>
  },

  deleteUser(id: number): Promise<void> {
    return api.delete(`/users/${id}`) as Promise<void>
  },

  toggleUserStatus(id: number): Promise<{ data: User }> {
    return api.patch(`/users/${id}/toggle-status`) as Promise<{ data: User }>
  },
}
