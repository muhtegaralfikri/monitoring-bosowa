# Frontend Architecture - Monitoring BBM Bosowa

> Version: 1.0
> Last Updated: 2026-01-04
> Framework: Svelte 5.x + Skeleton UI
> Build Tool: Vite

---

## 1. Project Structure

```
frontend/
├── src/
│   ├── lib/
│   │   ├── components/          # Reusable components
│   │   │   ├── Button.svelte
│   │   │   ├── Input.svelte
│   │   │   ├── Card.svelte
│   │   │   ├── Modal.svelte
│   │   │   ├── Table.svelte
│   │   │   └── Chart.svelte     # Chart.js wrapper
│   │   ├── stores/              # Svelte stores (state)
│   │   │   ├── auth.ts          # Auth state
│   │   │   ├── user.ts          # User state
│   │   │   └── toast.ts         # Notification
│   │   ├── services/            # API calls
│   │   │   ├── api.ts           # Axios/fetch wrapper
│   │   │   ├── auth.service.ts  # Auth API
│   │   │   ├── stock.service.ts # Stock API
│   │   │   └── user.service.ts  # User API
│   │   ├── types/               # TypeScript types
│   │   │   └── index.ts
│   │   ├── utils/               # Utilities
│   │   │   ├── format.ts        # Formatters (date, currency)
│   │   │   ├── validation.ts    # Client validation
│   │   │   └── export.ts        # Excel export
│   │   └── constants.ts         # Constants
│   ├── routes/                  # File-based routing (svelte-navigator)
│   │   ├── +layout.svelte       # Root layout
│   │   ├── +page.svelte         # Home/Landing
│   │   ├── login/
│   │   │   └── +page.svelte     # Login page
│   │   ├── dashboard/
│   │   │   ├── +page.svelte     # Dashboard (role-based)
│   │   │   └── components/
│   │   │       ├── StockSummary.svelte
│   │   │       └── QuickActions.svelte
│   │   ├── history/
│   │   │   ├── +page.svelte     # History page
│   │   │   └── components/
│   │   │       ├── HistoryTable.svelte
│   │   │       └── HistoryFilters.svelte
│   │   ├── charts/
│   │   │   └── +page.svelte     # Charts page
│   │   └── users/
│   │       ├── +page.svelte     # Users page (admin only)
│   │       └── components/
│   │           ├── UserTable.svelte
│   │           └── UserForm.svelte
│   ├── app.css                  # Global styles
│   └── app.ts                   # App entry
├── static/                      # Static assets
├── index.html
├── vite.config.ts
├── svelte.config.js
├── tsconfig.json
└── package.json
```

---

## 2. State Management (Svelte Stores)

### 2.1 Auth Store

```typescript
// src/lib/stores/auth.ts
import { writable, derived, get } from 'svelte/store'

interface User {
  id: number
  email: string
  name: string
  role: 'admin' | 'operasional'
  location: 'GENSET' | 'TUG_ASSIST' | null
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
  })

  return {
    subscribe,
    init: () => {
      // Check cookies on app load
      // Cookies are httpOnly, so we need to verify with server
      return fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
        credentials: 'include',
      })
        .then((res) => {
          if (res.ok) {
            return res.json()
          }
          throw new Error('Not authenticated')
        })
        .then((user) => {
          update((state) => ({
            ...state,
            user,
            isAuthenticated: true,
          }))
        })
        .catch(() => {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          })
        })
    },
    login: async (email: string, password: string) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Login failed')
      }

      const data = await res.json()
      update((state) => ({
        ...state,
        user: data.user,
        isAuthenticated: true,
      }))

      return data.user
    },
    logout: async () => {
      await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })

      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      })

      window.location.href = '/login'
    },
  }
}

export const auth = createAuthStore()

// Derived stores
export const user = derived(auth, ($auth) => $auth.user)
export const isAdmin = derived(auth, ($auth) => $auth.user?.role === 'admin')
export const isOperasional = derived(auth, ($auth) => $auth.user?.role === 'operasional')
```

---

### 2.2 Toast Store (Notifications)

```typescript
// src/lib/stores/toast.ts
import { writable } from 'svelte/store'

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
      return createToastStore().show(message, 'success')
    },
    error: (message: string) => {
      return createToastStore().show(message, 'error')
    },
    hide: (id: string) => {
      update((toasts) => toasts.filter((t) => t.id !== id))
    },
  }
}

export const toast = createToastStore()
```

---

## 3. API Service Layer

### 3.1 API Client

```typescript
// src/lib/services/api.ts
import { auth } from '$lib/stores/auth'
import { toast } from '$lib/stores/toast'

const API_URL = import.meta.env.VITE_API_URL

async function handleResponse(res: Response) {
  if (res.status === 401) {
    // Try refresh token
    const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })

    if (refreshRes.ok) {
      // Retry original request
      return fetch(res.url, {
        ...res,
        credentials: 'include',
      })
    } else {
      // Redirect to login
      auth.logout()
      throw new Error('Session expired')
    }
  }

  if (!res.ok) {
    const error = await res.json()
    toast.error(error.error || 'Something went wrong')
    throw new Error(error.error)
  }

  return res.json()
}

export const api = {
  get: (url: string) =>
    fetch(`${API_URL}${url}`, { credentials: 'include' }).then(handleResponse),

  post: (url: string, data: any) =>
    fetch(`${API_URL}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    }).then(handleResponse),

  put: (url: string, data: any) =>
    fetch(`${API_URL}${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    }).then(handleResponse),

  delete: (url: string) =>
    fetch(`${API_URL}${url}`, {
      method: 'DELETE',
      credentials: 'include',
    }).then(handleResponse),
}
```

---

### 3.2 Stock Service

```typescript
// src/lib/services/stock.service.ts
import { api } from './api'

export const stockService = {
  getSummary: () => api.get('/stock/summary'),

  stockIn: (data: {
    amount: number
    location: 'GENSET' | 'TUG_ASSIST'
    notes?: string
  }) => api.post('/stock/in', data),

  stockOut: (data: {
    amount: number
    notes?: string
  }) => api.post('/stock/out', data),

  getHistory: (params: {
    page?: number
    limit?: number
    type?: 'IN' | 'OUT'
    location?: 'GENSET' | 'TUG_ASSIST'
    startDate?: string
    endDate?: string
    search?: string
  }) => {
    const searchParams = new URLSearchParams(params as any)
    return api.get(`/stock/history?${searchParams}`)
  },

  getTrend: (params: {
    days?: number
    location?: 'GENSET' | 'TUG_ASSIST'
  }) => {
    const searchParams = new URLSearchParams(params as any)
    return api.get(`/stock/trend?${searchParams}`)
  },

  export: (filters: any) => api.post('/stock/export', filters),
}
```

---

## 4. Components

### 4.1 Layout Component

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { auth } from '$lib/stores/auth'
  import { page } from '$app/stores'

  onMount(() => {
    auth.init()
  })

  $: isProtectedRoute = $page.url.pathname !== '/login'
  $: isAuthenticated = $auth.isAuthenticated

  if (isProtectedRoute && !isAuthenticated) {
    // Redirect to login will be handled by the load function
  }
</script>

<svelte:head>
  <title>Monitoring BBM Bosowa</title>
  <meta name="description" content="Sistem monitoring BBM" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght=400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

{#if isAuthenticated}
  <nav class="navbar">
    <div class="nav-brand">
      <a href="/">Monitoring BBM</a>
    </div>
    <div class="nav-menu">
      <a href="/dashboard">Dashboard</a>
      <a href="/history">Riwayat</a>
      <a href="/charts">Grafik</a>
      {#if $auth.user?.role === 'admin'}
        <a href="/users">Users</a>
      {/if}
      <button on:click={auth.logout}>Logout</button>
    </div>
  </nav>
{/if}

<main class="container">
  <slot />
</main>

<style>
  :global(:root) {
    --primary: #2563eb;
    --success: #22c55e;
    --danger: #ef4444;
    --warning: #f59e0b;
    --bg: #f8fafc;
    --surface: #ffffff;
    --text: #0f172a;
    --text-muted: #64748b;
    --border: #e2e8f0;
  }

  :global(body) {
    margin: 0;
    font-family: 'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
  }

  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }

  .nav-menu {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .container {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
</style>
```

---

### 4.2 Dashboard Page

```svelte
<!-- src/routes/dashboard/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { auth, isAdmin } from '$lib/stores/auth'
  import { toast } from '$lib/stores/toast'
  import { stockService } from '$lib/services/stock.service'
  import Card from '$lib/components/Card.svelte'
  import Button from '$lib/components/Button.svelte'

  let summary = $state<{ location: string; total_balance: number }[]>([])
  let loading = $state(true)
  let showStockInModal = $state(false)

  // Form state
  let stockInForm = $state({
    amount: 0,
    location: 'GENSET' as 'GENSET' | 'TUG_ASSIST',
    notes: '',
  })

  onMount(async () => {
    await loadSummary()
  })

  async function loadSummary() {
    try {
      loading = true
      summary = await stockService.getSummary()
    } catch (err) {
      toast.error('Gagal memuat data')
    } finally {
      loading = false
    }
  }

  async function handleStockIn() {
    try {
      await stockService.stockIn(stockInForm)
      toast.success('Stok berhasil ditambahkan')
      showStockInModal = false
      stockInForm = { amount: 0, location: 'GENSET', notes: '' }
      await loadSummary()
    } catch (err) {
      toast.error('Gagal menambah stok')
    }
  }
</script>

<div class="dashboard">
  <h1>Dashboard</h1>

  {#if loading}
    <p>Loading...</p>
  {:else}
    <div class="summary-cards">
      {#each summary as item}
        <Card title={item.location}>
          <div class="stock-value">
            {item.total_balance.toLocaleString()} Liter
          </div>
        </Card>
      {/each}
    </div>
  {/if}

  {#if isAdmin}
    <Button on:click={() => showStockInModal = true}>Input Stok Masuk</Button>
  {/if}
</div>

<!-- Modal Stock In -->
{#if showStockInModal}
  <div class="modal-overlay">
    <div class="modal">
      <h2>Input Stok Masuk</h2>
      <form on:submit={(e) => { e.preventDefault(); handleStockIn(); }}>
        <label>
          Jumlah (Liter)
          <input
            type="number"
            step="0.01"
            min="0.01"
            bind:value={stockInForm.amount}
            required
          />
        </label>

        <label>
          Lokasi
          <select bind:value={stockInForm.location}>
            <option value="GENSET">GENSET</option>
            <option value="TUG_ASSIST">TUG ASSIST</option>
          </select>
        </label>

        <label>
          Keterangan
          <textarea bind:value={stockInForm.notes}></textarea>
        </label>

        <div class="modal-actions">
          <Button type="button" variant="secondary" on:click={() => showStockInModal = false}>
            Batal
          </Button>
          <Button type="submit">Simpan</Button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stock-value {
    font-size: 2rem;
    font-weight: bold;
    color: var(--primary);
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: var(--surface);
    padding: 2rem;
    border-radius: 0.5rem;
    width: 100%;
    max-width: 400px;
  }

  .modal form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }
</style>
```

---

### 4.3 Chart Component (Chart.js Wrapper)

```svelte
<!-- src/lib/components/Chart.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Chart, type ChartConfiguration, type ChartType } from 'chart.js/auto'

  export let type: ChartType = 'line'
  export let data: ChartConfiguration['data']
  export let options: ChartConfiguration['options'] = {}

  let canvasElement: HTMLCanvasElement
  let chart: Chart

  onMount(() => {
    const ctx = canvasElement.getContext('2d')!
    chart = new Chart(ctx, {
      type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...options,
      },
    })
  })

  onDestroy(() => {
    chart?.destroy()
  })
</script>

<div class="chart-container">
  <canvas bind:this={canvasElement}></canvas>
</div>

<style>
  .chart-container {
    position: relative;
    height: 300px;
  }
</style>
```

---

### 4.4 Charts Page

```svelte
<!-- src/routes/charts/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { stockService } from '$lib/services/stock.service'
  import { toast } from '$lib/stores/toast'
  import Chart from '$lib/components/Chart.svelte'
  import Card from '$lib/components/Card.svelte'

  let trendData = $state<any[]>([])
  let selectedDays = $state(7)
  let selectedLocation = $state<'ALL' | 'GENSET' | 'TUG_ASSIST'>('ALL')
  let loading = $state(true)

  onMount(async () => {
    await loadTrend()
  })

  async function loadTrend() {
    try {
      loading = true
      const params: any = { days: selectedDays }
      if (selectedLocation !== 'ALL') {
        params.location = selectedLocation
      }
      trendData = await stockService.getTrend(params)
    } catch (err) {
      toast.error('Gagal memuat data grafik')
    } finally {
      loading = false
    }
  }

  $: chartData = {
    labels: [...new Set(trendData.map((d) => d.transaction_date))].sort(),
    datasets: [
      {
        label: 'Stok GENSET',
        data: trendData
          .filter((d) => d.location === 'GENSET')
          .map((d) => d.balance),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: true,
      },
      {
        label: 'Stok TUG ASSIST',
        data: trendData
          .filter((d) => d.location === 'TUG_ASSIST')
          .map((d) => d.balance),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
      },
    ],
  }

  $: chartOptions = {
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Tren Stok ${selectedDays} Hari Terakhir`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Liter',
        },
      },
    },
  }
</script>

<div class="charts-page">
  <h1>Grafik Tren Stok</h1>

  <div class="filters">
    <select bind:value={selectedDays} on:change={loadTrend}>
      <option value={7}>7 Hari</option>
      <option value={30}>30 Hari</option>
    </select>

    <select bind:value={selectedLocation} on:change={loadTrend}>
      <option value="ALL">Semua Lokasi</option>
      <option value="GENSET">GENSET</option>
      <option value="TUG_ASSIST">TUG ASSIST</option>
    </select>
  </div>

  <Card>
    {#if loading}
      <p>Loading...</p>
    {:else}
      <Chart type="line" data={chartData} options={chartOptions} />
    {/if}
  </Card>
</div>

<style>
  .charts-page h1 {
    margin-bottom: 1rem;
  }

  .filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }
</style>
```

---

## 5. Route Protection

```typescript
// src/routes/+layout.ts (or in a separate guard file)
import { auth } from '$lib/stores/auth'
import { redirect } from '@sveltejs/kit'

export async function load({ url }) {
  const isProtectedRoute = url.pathname !== '/login'

  if (isProtectedRoute && !$auth.isAuthenticated) {
    throw redirect(302, '/login')
  }

  // Role-based redirect
  if ($auth.user?.role === 'operasional' && url.pathname === '/users') {
    throw redirect(302, '/dashboard')
  }

  return {}
}
```

---

## 6. Utilities

### 6.1 Formatters

```typescript
// src/lib/utils/format.ts
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num)
}

export function formatCurrency(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
  }).format(num)
}
```

---

## 7. Package.json

```json
{
  "name": "monitoring-bosowa-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-check --tsconfig ./tsconfig.json"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "@skeletonlabs/skeleton": "^2.10.0",
    "svelte": "^5.0.0",
    "svelte-check": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^6.0.0"
  },
  "dependencies": {
    "chart.js": "^4.4.0",
    "xlsx": "^0.18.5"
  }
}
```

---

## 8. Performance Tips

1. **Lazy load routes**: SvelteKit supports lazy loading
2. **Optimize images**: Use WebP format
3. **Minimize bundle**: Tree-shaking sudah otomatis di Vite
4. **Use Svelte's reactivity**: Lebih efficient dari React
5. **Debounce search**: Di filter form
