import { api } from './api'
import type { StockSummary, StockInput, StockOutInput, StockHistoryResponse, StockTrend, TodayStats } from '../types'

export const stockService = {
  getSummary(): Promise<StockSummary[]> {
    return api.get('/stock/summary') as Promise<StockSummary[]>
  },

  getTodayStats(location?: string): Promise<TodayStats[]> {
    const searchParams = location ? `?location=${location}` : ''
    return api.get(`/stock/today${searchParams}`) as Promise<TodayStats[]>
  },

  stockIn(data: StockInput): Promise<unknown> {
    return api.post('/stock/in', data)
  },

  stockOut(data: StockOutInput): Promise<unknown> {
    return api.post('/stock/out', data)
  },

  getHistory(params: {
    page?: number
    limit?: number
    type?: 'IN' | 'OUT'
    location?: 'GENSET' | 'TUG_ASSIST'
    startDate?: string
    endDate?: string
  }): Promise<StockHistoryResponse> {
    const searchParams = new URLSearchParams(params as Record<string, string>)
    return api.get(`/stock/history?${searchParams}`) as Promise<StockHistoryResponse>
  },

  exportHistory(params: {
    type?: 'IN' | 'OUT'
    location?: 'GENSET' | 'TUG_ASSIST'
    startDate?: string
    endDate?: string
  }): Promise<Response> {
    const searchParams = new URLSearchParams(params as Record<string, string>)
    return api.getFile(`/stock/export?${searchParams}`) as Promise<Response>
  },

  getTrend(params: { days?: number; location?: string }): Promise<StockTrend[]> {
    const searchParams = new URLSearchParams(params as Record<string, string>)
    return api.get(`/stock/trend?${searchParams}`) as Promise<StockTrend[]>
  },
}
