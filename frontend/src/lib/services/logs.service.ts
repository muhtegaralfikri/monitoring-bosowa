import { api } from './api'
import type { LogsResponse, LogsQuery, LogsStats } from '../types'

class LogsService {
  async getLogs(params: LogsQuery): Promise<LogsResponse> {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.action) queryParams.append('action', params.action)
    if (params.entityType) queryParams.append('entityType', params.entityType)
    if (params.userId) queryParams.append('userId', params.userId.toString())
    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)
    if (params.search) queryParams.append('search', params.search)

    const queryString = queryParams.toString()
    return await api.get(`/logs${queryString ? `?${queryString}` : ''}`) as Promise<LogsResponse>
  }

  async getStats(): Promise<LogsStats> {
    return await api.get('/logs/stats') as Promise<LogsStats>
  }

  async cleanOldLogs(): Promise<{ message: string }> {
    return await api.delete('/logs/clean') as Promise<{ message: string }>
  }
}

export const logsService = new LogsService()
