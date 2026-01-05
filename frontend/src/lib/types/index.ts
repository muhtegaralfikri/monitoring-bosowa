export interface User {
  id: number
  email: string
  name: string
  role: number // 1 = admin, 2 = operasional
  location: number | null // 1 = GENSET, 2 = TUG_ASSIST
  isActive: boolean
  createdAt: string
}

export interface CreateUserInput {
  email: string
  password: string
  name: string
  role: number
  location?: number | null
}

export interface UpdateUserInput {
  email?: string
  password?: string
  name?: string
  role?: number
  location?: number | null
  isActive?: boolean
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  email: string
  password: string
  name: string
}

export interface StockSummary {
  location: string
  balance: string
}

export interface StockInput {
  amount: number
  location: 'GENSET' | 'TUG_ASSIST'
  notes?: string
}

export interface StockOutInput {
  amount: number
  notes?: string
}

export interface StockHistory {
  id: number
  type: 'IN' | 'OUT'
  amount: string
  location: string
  balance: string
  notes: string | null
  created_at: string
  userName: string
}

export interface StockHistoryResponse {
  data: StockHistory[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface StockTrend {
  date: string
  location: string
  balance: string
}

export interface TodayStats {
  location: string
  initialStock: number
  todayIn: number
  todayOut: number
  finalStock: number
}

export interface AuthResponse {
  user: User
  token: string
}

export interface ApiError {
  error: string
}

export interface Alert {
  message: string
  type?: 'warning' | 'danger'
}

export interface StockAlert {
  location: string
  balance: number
  threshold: number
  message: string
  type?: 'warning' | 'danger'
}

export interface NotificationResponse {
  hasAlerts: boolean
  alerts: StockAlert[]
  threshold: number
}

export interface SystemLog {
  id: number
  userId: number | null
  action: string
  entityType: string | null
  entityId: number | null
  ipAddress: string | null
  details: string | null
  createdAt: string
  userName: string | null
  userEmail: string | null
}

export interface LogsQuery {
  page?: number
  limit?: number
  action?: string
  entityType?: string
  userId?: number
  startDate?: string
  endDate?: string
  search?: string
}

export interface LogsResponse {
  data: SystemLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface LogsStats {
  totalLogs: number
  actionCounts: { action: string; count: number }[]
  userActivity: { userId: number; userName: string; count: number }[]
}
