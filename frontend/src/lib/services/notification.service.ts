import { api } from './api'
import type { NotificationResponse } from '../types'

class NotificationService {
  async checkLowStock(): Promise<NotificationResponse> {
    return await api.get('/notifications/check') as Promise<NotificationResponse>
  }

  async getSettings(): Promise<Record<string, string>> {
    return await api.get('/notifications/settings') as Promise<Record<string, string>>
  }

  async updateSetting(key: string, value: string): Promise<{ message: string; key: string; value: string }> {
    return await api.post('/notifications/settings', { key, value }) as Promise<{ message: string; key: string; value: string }>
  }
}

export const notificationService = new NotificationService()
