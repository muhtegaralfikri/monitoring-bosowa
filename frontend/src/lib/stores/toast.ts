import { writable, derived, get } from 'svelte/store'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([])

  return {
    subscribe,
    show: (message: string, type: Toast['type'] = 'info', duration = 3000) => {
      const id = Math.random().toString(36).slice(2)

      update((toasts) => [...toasts, { id, message, type, duration }])

      setTimeout(() => {
        update((toasts) => toasts.filter((t) => t.id !== id))
      }, duration)
    },
    success: (message: string) => {
      const store = createToastStore()
      return store.show(message, 'success')
    },
    error: (message: string) => {
      const store = createToastStore()
      return store.show(message, 'error')
    },
    hide: (id: string) => {
      update((toasts) => toasts.filter((t) => t.id !== id))
    },
  }
}

export const toast = createToastStore()
