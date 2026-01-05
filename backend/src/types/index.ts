import { type User } from '../db/schema'

export interface JwtPayload {
  userId: number
  email: string
  role: number
  location?: number | null
}

export interface AuthResponse {
  user: UserData
}

export interface UserData {
  id: number
  email: string
  name: string
  role: number
  location: number | null
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  email: string
  password: string
  name: string
  role?: number
  location?: number | null
}

export interface StockInput {
  amount: number
  location: 'GENSET' | 'TUG_ASSIST'
  notes?: string
}

export interface StockHistoryQuery {
  page?: number
  limit?: number
  type?: 'IN' | 'OUT'
  location?: 'GENSET' | 'TUG_ASSIST'
  startDate?: string
  endDate?: string
  search?: string
}

export const UserRole = {
  ADMIN: 1,
  OPERASIONAL: 2,
} as const

export const UserLocation = {
  GENSET: 1,
  TUG_ASSIST: 2,
} as const

