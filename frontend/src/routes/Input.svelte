<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { stockService } from '../lib/services/stock.service'
  import { toast } from '../lib/stores/toast'
  import { auth, isOperasional } from '../lib/stores/auth'
  import { formatDateTime, formatNumber } from '../lib/utils/format'
  import type { StockHistory, StockHistoryResponse, StockSummary } from '../lib/types'

  let data = $state<StockHistory[]>([])
  let pagination = $state({ page: 1, limit: 20, total: 0, totalPages: 0 })
  let pageSize = $state(20)
  let loading = $state(true)
  let exporting = $state(false)
  let submitting = $state(false)

  let summary = $state<StockSummary | null>(null)
  let currentTime = $state(new Date())
  let quickRange = $state('')
  let form = $state({
    usageDate: '',
    amount: '',
    notes: '',
  })
  let adminForm = $state({
    transactionDate: '',
    amount: '',
    notes: '',
    location: 'GENSET' as 'GENSET' | 'TUG_ASSIST',
  })
  let officerFilter = $state('')

  // Filters
  let filters = $state({
    type: '' as 'IN' | 'OUT' | '',
    location: '' as 'GENSET' | 'TUG_ASSIST' | '',
    startDate: '',
    endDate: '',
    search: '',
  })

  let timeInterval: ReturnType<typeof setInterval> | null = null

  const locationLabel = $derived.by(() => {
    const location = $auth.user?.location
    if (location === 1) return 'Genset'
    if (location === 2) return 'Tug Assist'
    return 'Lapangan'
  })

  const operatorLabel = $derived.by(() => `Operasional Lapangan ${locationLabel}`)
  const adminName = $derived.by(() => $auth.user?.name || 'Admin')
  const isAdminView = $derived.by(() => $auth.user?.role === 1)

  const lastUpdate = $derived.by(() => {
    if (!data.length) return null
    const rawDate = resolveCreatedAt(data[0])
    return rawDate ? formatTime(rawDate) : null
  })

  const filteredData = $derived.by(() => {
    const term = filters.search.trim().toLowerCase()
    let results = data
    if (term) {
      results = results.filter((row) => {
        const notes = row.notes ? row.notes.toLowerCase() : ''
        const userName = row.userName ? row.userName.toLowerCase() : ''
        return notes.includes(term) || userName.includes(term)
      })
    }
    if (officerFilter) {
      results = results.filter((row) => row.userName === officerFilter)
    }
    return results
  })

  const activeFilters = $derived.by(() => {
    const parts: string[] = []
    if (filters.type) {
      parts.push(`Jenis: ${filters.type === 'IN' ? 'Penambahan' : 'Pemakaian'}`)
    } else {
      parts.push('Jenis: Semua')
    }
    if (filters.location) {
      parts.push(`Monitoring: ${filters.location === 'GENSET' ? 'Genset' : 'Tug Assist'}`)
    } else {
      parts.push('Monitoring: Semua')
    }
    return parts.join(', ')
  })

  onMount(async () => {
    const today = new Date()
    currentTime = today
    form.usageDate = today.toISOString().slice(0, 10)
    adminForm.transactionDate = today.toISOString().slice(0, 10)

    if ($isOperasional) {
      filters.type = 'OUT'
      pageSize = 10
      pagination = { ...pagination, limit: 10 }
    } else if (isAdminView) {
      filters.type = 'IN'
      pageSize = 10
      pagination = { ...pagination, limit: 10 }
    }

    await loadHistory(1)

    if ($isOperasional) {
      await loadSummary()
    }

    timeInterval = setInterval(() => {
      currentTime = new Date()
    }, 60000)
  })

  onDestroy(() => {
    if (timeInterval) clearInterval(timeInterval)
  })

  function resolveCreatedAt(row: StockHistory) {
    return (row as any).created_at || (row as any).createdAt
  }

  function formatTime(date: string | Date) {
    return new Date(date).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  async function loadSummary() {
    try {
      const summaries = await stockService.getSummary()
      summary = summaries[0] || null
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat ringkasan stok')
    }
  }

  async function loadHistory(page = 1) {
    try {
      loading = true
      const params: any = {
        page,
        limit: pageSize,
      }

      if (filters.type) params.type = filters.type
      if (filters.location) params.location = filters.location
      if (filters.startDate) params.startDate = filters.startDate
      if (filters.endDate) params.endDate = filters.endDate

      const response: StockHistoryResponse = await stockService.getHistory(params)
      data = response.data
      pagination = { ...response.pagination }
      pageSize = response.pagination.limit
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat data')
    } finally {
      loading = false
    }
  }

  function applyFilters() {
    quickRange = ''
    loadHistory(1)
  }

  function resetFilters() {
    filters = {
      type: isAdminView ? 'IN' : '',
      location: '',
      startDate: '',
      endDate: '',
      search: '',
    }
    officerFilter = ''
    quickRange = ''
    loadHistory(1)
  }

  function handleQuickRange() {
    if (!quickRange) {
      filters.startDate = ''
      filters.endDate = ''
      loadHistory(1)
      return
    }

    const today = new Date()
    const end = new Date(today)
    const days = quickRange === 'today' ? 1 : Number(quickRange)
    const start = new Date(today)
    start.setDate(today.getDate() - (days - 1))

    filters.startDate = start.toISOString().slice(0, 10)
    filters.endDate = end.toISOString().slice(0, 10)
    loadHistory(1)
  }

  function handlePageSizeChange(event: Event) {
    const limit = Number((event.target as HTMLSelectElement).value)
    pageSize = limit
    loadHistory(1)
  }

  function getTypeBadge(type: string) {
    return type === 'IN' ? 'badge-in' : 'badge-out'
  }

  async function submitUsage(event: SubmitEvent) {
    try {
      event.preventDefault()
      submitting = true
      await stockService.stockOut({
        amount: Number(form.amount),
        notes: form.notes.trim(),
      })

      toast.success('Data pemakaian berhasil dikirim')
      form.amount = ''
      form.notes = ''
      form.usageDate = new Date().toISOString().slice(0, 10)

      await loadHistory(1)
      await loadSummary()
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim data pemakaian')
    } finally {
      submitting = false
    }
  }

  async function submitStockIn(event: SubmitEvent) {
    try {
      event.preventDefault()
      submitting = true
      await stockService.stockIn({
        amount: Number(adminForm.amount),
        location: adminForm.location,
        notes: adminForm.notes.trim(),
      })

      toast.success('Stok berhasil ditambahkan')
      adminForm.amount = ''
      adminForm.notes = ''
      adminForm.transactionDate = new Date().toISOString().slice(0, 10)

      await loadHistory(1)
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambahkan stok')
    } finally {
      submitting = false
    }
  }

  async function exportToExcel() {
    try {
      exporting = true
      const params: any = {}

      if (filters.type) params.type = filters.type
      if (filters.location) params.location = filters.location
      if (filters.startDate) params.startDate = filters.startDate
      if (filters.endDate) params.endDate = filters.endDate

      // Build query string
      const queryString = new URLSearchParams(params as any).toString()

      // Get API URL from environment or default
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

      // Fetch the file
      const response = await fetch(`${apiUrl}/api/stock/export?${queryString}`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Gagal mengekspor data')
      }

      // Get filename from headers or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `riwayat-stok-bbm-${new Date().toISOString().slice(0, 10)}.xlsx`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match && match[1]) {
          filename = match[1]
        }
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Data berhasil diekspor')
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengekspor data')
    } finally {
      exporting = false
    }
  }
</script>

<div class="history-page">
  {#if $isOperasional}
    <section class="operasional-card">
      <div class="operasional-header">
        <p class="section-eyebrow">Dashboard Operasional</p>
        <h1>Catat Pemakaian Lapangan</h1>
        <p class="section-subtitle">
          Hadirkan bukti pemakaian dengan detail tanggal, jumlah liter, dan keterangan aktivitas.
          Data otomatis tersinkron ke admin untuk approval stok.
        </p>
      </div>

      <div class="meta-grid">
        <div class="meta-card">
          <div class="meta-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2"></rect>
              <path d="M8 2v4M16 2v4M3 10h18"></path>
            </svg>
          </div>
          <div>
            <span class="meta-label">Hak Akses</span>
            <p class="meta-value">OPERASIONAL</p>
          </div>
        </div>
        <div class="meta-card">
          <div class="meta-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v20"></path>
              <path d="M5 7l7-5 7 5"></path>
              <path d="M5 17l7 5 7-5"></path>
            </svg>
          </div>
          <div>
            <span class="meta-label">Monitoring</span>
            <p class="meta-value">{locationLabel}</p>
          </div>
        </div>
        <div class="meta-card">
          <div class="meta-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="7" r="4"></circle>
              <path d="M5.5 21a6.5 6.5 0 0 1 13 0"></path>
            </svg>
          </div>
          <div>
            <span class="meta-label">Petugas</span>
            <p class="meta-value">{operatorLabel}</p>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <p class="stat-label">Tanggal Input</p>
          <p class="stat-value">{formatDateTime(currentTime)}</p>
        </div>
        <div class="stat-card highlight">
          <p class="stat-label">Sisa Stok Lapangan</p>
          <p class="stat-value">{summary ? `${formatNumber(summary.balance)} L` : '-'}</p>
          <p class="stat-meta">
            Pembaruan terakhir {lastUpdate || '-'}
          </p>
        </div>
      </div>

      <form class="input-form" onsubmit={submitUsage}>
        <div class="form-grid">
          <div class="field">
            <label for="usage-date">Tanggal Pemakaian</label>
            <div class="input-with-icon">
              <input
                id="usage-date"
                type="date"
                class="input"
                bind:value={form.usageDate}
                required
              />
              <span class="input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                  <path d="M8 2v4M16 2v4M3 10h18"></path>
                </svg>
              </span>
            </div>
          </div>
          <div class="field">
            <label for="usage-amount">Jumlah Pemakaian (Liter)</label>
            <input
              id="usage-amount"
              type="number"
              class="input"
              min="0"
              step="0.01"
              bind:value={form.amount}
              placeholder="Masukkan jumlah liter"
              required
            />
          </div>
        </div>
        <div class="field">
          <label for="usage-notes">Uraian Pemakaian (Wajib)</label>
          <textarea
            id="usage-notes"
            class="input textarea"
            rows="3"
            bind:value={form.notes}
            placeholder="Contoh: Pemakaian untuk Kapal X"
            required
          ></textarea>
        </div>
        <button class="btn-submit" type="submit" disabled={submitting}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m22 2-7 20-4-9-9-4z"></path>
            <path d="M22 2 11 13"></path>
          </svg>
          {submitting ? 'Mengirim...' : 'Kirim Data Pemakaian'}
        </button>
      </form>
    </section>

    <section class="history-card">
      <div class="history-header">
        <div>
          <p class="section-eyebrow">Pemakaian Bahan Bakar</p>
          <h2>Riwayat Pemakaian</h2>
        </div>
        <div class="history-actions">
          <button class="btn-outline" type="button" onclick={() => loadHistory(pagination.page)} disabled={loading}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 3-7"></path>
              <path d="M3 4v4h4"></path>
            </svg>
            Muat Ulang
          </button>
          <button class="btn-success" type="button" onclick={exportToExcel} disabled={exporting}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <path d="M14 2v6h6"></path>
              <path d="M8 13h8"></path>
              <path d="M8 17h8"></path>
            </svg>
            {exporting ? 'Mengekspor...' : 'Export Excel'}
          </button>
        </div>
      </div>

      <p class="history-desc">
        Pantau catatan pemakaian terakhir untuk memastikan aktivitas lapangan tercatat rapi.
      </p>

      <div class="filters-grid">
        <div class="field">
          <label for="search">Cari deskripsi/petugas</label>
          <input
            id="search"
            type="text"
            class="input"
            placeholder="Masukkan kata kunci"
            bind:value={filters.search}
          />
        </div>
        <div class="field">
          <label for="period-start">Periode</label>
          <div class="date-range">
            <input
              id="period-start"
              type="date"
              class="input"
              aria-label="Tanggal mulai"
              bind:value={filters.startDate}
              onchange={applyFilters}
            />
            <span class="range-sep">-</span>
            <input
              type="date"
              class="input"
              aria-label="Tanggal akhir"
              bind:value={filters.endDate}
              onchange={applyFilters}
            />
          </div>
        </div>
        <div class="field">
          <label for="quick-range">Rentang Cepat</label>
          <select id="quick-range" bind:value={quickRange} onchange={handleQuickRange}>
            <option value="">Pilih rentang cepat</option>
            <option value="today">Hari ini</option>
            <option value="7">7 hari terakhir</option>
            <option value="30">30 hari terakhir</option>
          </select>
        </div>
        <div class="field">
          <label for="page-size">Jumlah/Halaman</label>
          <select id="page-size" bind:value={pageSize} onchange={handlePageSizeChange}>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      {#if loading}
        <div class="table-loading">
          <div class="spinner"></div>
          <p>Memuat data...</p>
        </div>
      {:else}
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Petugas</th>
                <th>Jumlah (L)</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredData as row, index}
                <tr>
                  <td>{index + 1 + (pagination.page - 1) * pagination.limit}</td>
                  <td>{formatDateTime(resolveCreatedAt(row))}</td>
                  <td>{row.userName}</td>
                  <td class="cell-strong">{formatNumber(row.amount)}</td>
                  <td>{row.notes || '-'}</td>
                </tr>
              {/each}
            </tbody>
          </table>

          {#if filteredData.length === 0}
            <div class="empty-state">Belum ada catatan pemakaian.</div>
          {/if}
        </div>

        {#if pagination.totalPages > 1}
          <div class="pagination">
            <button
              class="btn btn-secondary"
              disabled={pagination.page === 1}
              onclick={() => loadHistory(pagination.page - 1)}
            >
              Prev
            </button>
            <span>
              Hal {pagination.page} dari {pagination.totalPages}
            </span>
            <button
              class="btn btn-secondary"
              disabled={pagination.page === pagination.totalPages}
              onclick={() => loadHistory(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        {/if}
      {/if}
    </section>
  {:else}
    <section class="admin-card">
      <div class="admin-header">
        <p class="section-eyebrow">Dashboard Admin</p>
        <h1>Tambah Stok Bahan Bakar</h1>
        <p class="section-subtitle">
          Input pembelian atau penyesuaian stok terbaru. Sistem otomatis mencatat audit trail beserta pengguna yang melakukan perubahan.
        </p>
      </div>

      <div class="meta-grid">
        <div class="meta-card">
          <div class="meta-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3l7 4v5c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V7l7-4z"></path>
              <path d="M9 12l2 2 4-4"></path>
            </svg>
          </div>
          <div>
            <span class="meta-label">Hak Akses</span>
            <p class="meta-value">ADMIN</p>
          </div>
        </div>
        <div class="meta-card">
          <div class="meta-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="7" r="4"></circle>
              <path d="M5.5 21a6.5 6.5 0 0 1 13 0"></path>
            </svg>
          </div>
          <div>
            <span class="meta-label">Pengguna</span>
            <p class="meta-value">{adminName}</p>
          </div>
        </div>
        <div class="meta-card">
          <div class="meta-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <ellipse cx="12" cy="5" rx="8" ry="3"></ellipse>
              <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"></path>
              <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"></path>
            </svg>
          </div>
          <div>
            <span class="meta-label">Status Stok</span>
            <p class="meta-value">Realtime</p>
          </div>
        </div>
      </div>

      <form class="input-form admin-input-form" onsubmit={submitStockIn}>
        <div class="admin-form-grid">
          <div class="field">
            <label for="transaction-date">Tanggal Transaksi</label>
            <div class="input-with-icon">
              <input
                id="transaction-date"
                type="date"
                class="input"
                bind:value={adminForm.transactionDate}
                required
              />
              <span class="input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                  <path d="M8 2v4M16 2v4M3 10h18"></path>
                </svg>
              </span>
            </div>
          </div>
          <div class="field">
            <label for="transaction-amount">Jumlah (Liter)</label>
            <input
              id="transaction-amount"
              type="number"
              class="input"
              min="0"
              step="0.01"
              bind:value={adminForm.amount}
              placeholder="Masukkan jumlah liter"
              required
            />
          </div>
          <div class="field">
            <label for="transaction-notes">Deskripsi</label>
            <textarea
              id="transaction-notes"
              class="input textarea"
              rows="3"
              bind:value={adminForm.notes}
              placeholder="Contoh: Pembelian premium 5 KL dari Pertamina"
              required
            ></textarea>
          </div>
          <div class="field">
            <label for="transaction-location">Monitoring</label>
            <select
              id="transaction-location"
              class="input"
              bind:value={adminForm.location}
              required
            >
              <option value="GENSET">Genset</option>
              <option value="TUG_ASSIST">Tug Assist</option>
            </select>
          </div>
        </div>
        <button class="btn-submit btn-full" type="submit" disabled={submitting}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 5v14"></path>
            <path d="M5 12h14"></path>
          </svg>
          {submitting ? 'Menyimpan...' : 'Tambah Stok'}
        </button>
      </form>
    </section>

    <section class="history-card admin-history-card">
      <div class="history-header">
        <div>
          <p class="section-eyebrow">Penambahan Stok</p>
          <h2>Riwayat Penambahan Stok</h2>
        </div>
        <div class="history-actions">
          <button class="btn-outline" type="button" onclick={() => loadHistory(pagination.page)} disabled={loading}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 3-7"></path>
              <path d="M3 4v4h4"></path>
            </svg>
            Muat Ulang
          </button>
          <button class="btn-success" type="button" onclick={exportToExcel} disabled={exporting}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <path d="M14 2v6h6"></path>
              <path d="M8 13h8"></path>
              <path d="M8 17h8"></path>
            </svg>
            {exporting ? 'Mengekspor...' : 'Export Excel'}
          </button>
        </div>
      </div>

      <p class="history-desc">
        Daftar transaksi penambahan stok terbaru untuk mendukung audit trail tim.
      </p>

      <div class="admin-filters-grid">
        <div class="field">
          <label for="filter-type">Jenis</label>
          <select id="filter-type" bind:value={filters.type} onchange={applyFilters}>
            <option value="">Semua</option>
            <option value="IN">Penambahan</option>
            <option value="OUT">Pemakaian</option>
          </select>
        </div>
        <div class="field">
          <label for="filter-location">Monitoring</label>
          <select id="filter-location" bind:value={filters.location} onchange={applyFilters}>
            <option value="">Semua</option>
            <option value="GENSET">Genset</option>
            <option value="TUG_ASSIST">Tug Assist</option>
          </select>
        </div>
        <div class="field">
          <label for="filter-officer">Petugas</label>
          <select id="filter-officer" bind:value={officerFilter}>
            <option value="">Semua petugas</option>
          </select>
        </div>
        <div class="field">
          <label for="filter-search">Cari deskripsi/petugas</label>
          <input
            id="filter-search"
            type="text"
            class="input"
            placeholder="Masukkan kata kunci"
            bind:value={filters.search}
          />
        </div>
        <div class="field">
          <label for="filter-period-start">Periode</label>
          <div class="date-range">
            <input
              id="filter-period-start"
              type="date"
              class="input"
              aria-label="Tanggal mulai"
              bind:value={filters.startDate}
              onchange={applyFilters}
            />
            <span class="range-sep">-</span>
            <input
              type="date"
              class="input"
              aria-label="Tanggal akhir"
              bind:value={filters.endDate}
              onchange={applyFilters}
            />
          </div>
        </div>
        <div class="field">
          <label for="filter-quick-range">Rentang Cepat</label>
          <select id="filter-quick-range" bind:value={quickRange} onchange={handleQuickRange}>
            <option value="">Pilih rentang cepat</option>
            <option value="today">Hari ini</option>
            <option value="7">7 hari terakhir</option>
            <option value="30">30 hari terakhir</option>
          </select>
        </div>
      </div>

      <div class="admin-filter-footer">
        <div class="field">
          <label for="filter-page-size">Jumlah/Halaman</label>
          <select id="filter-page-size" bind:value={pageSize} onchange={handlePageSizeChange}>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
        <button class="btn-reset" type="button" onclick={resetFilters}>Reset Semua</button>
      </div>

      <div class="filter-active">Filter aktif: {activeFilters}</div>

      {#if loading}
        <div class="table-loading">
          <div class="spinner"></div>
          <p>Memuat data...</p>
        </div>
      {:else}
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Petugas</th>
                <th>Jumlah (L)</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredData as row, index}
                <tr>
                  <td>{index + 1 + (pagination.page - 1) * pagination.limit}</td>
                  <td>{formatDateTime(resolveCreatedAt(row))}</td>
                  <td>{row.userName}</td>
                  <td class="cell-strong">{formatNumber(row.amount)}</td>
                  <td>{row.notes || '-'}</td>
                </tr>
              {/each}
            </tbody>
          </table>

          {#if filteredData.length === 0}
            <div class="empty-state">Belum ada catatan penambahan stok.</div>
          {/if}
        </div>

        {#if pagination.totalPages > 1}
          <div class="pagination">
            <button
              class="btn btn-secondary"
              disabled={pagination.page === 1}
              onclick={() => loadHistory(pagination.page - 1)}
            >
              Prev
            </button>
            <span>
              Hal {pagination.page} dari {pagination.totalPages}
            </span>
            <button
              class="btn btn-secondary"
              disabled={pagination.page === pagination.totalPages}
              onclick={() => loadHistory(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        {/if}
      {/if}
    </section>
  {/if}
</div>

<style>
  .history-page {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .operasional-card,
  .admin-card,
  .history-card {
    background: var(--surface, #ffffff);
    border-radius: 1rem;
    padding: 2rem;
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
    border: 1px solid #eef2f7;
  }

  .operasional-header h1,
  .admin-header h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: #1f2937;
  }

  .section-eyebrow {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #94a3b8;
    margin-bottom: 0.4rem;
  }

  .section-subtitle {
    color: #64748b;
    max-width: 720px;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .meta-card {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    border-radius: 0.75rem;
    padding: 1rem;
  }

  .meta-icon {
    width: 40px;
    height: 40px;
    border-radius: 0.75rem;
    background: #f1f5f9;
    color: #1f4b8f;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .meta-icon svg {
    width: 20px;
    height: 20px;
  }

  .meta-label {
    display: block;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #94a3b8;
  }

  .meta-value {
    font-weight: 700;
    color: #1e293b;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    margin-top: 1.25rem;
  }

  .stat-card {
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    border-radius: 0.75rem;
    padding: 1rem 1.25rem;
  }

  .stat-card.highlight {
    background: #fff7ed;
    border-color: #fed7aa;
  }

  .stat-label {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #94a3b8;
    margin-bottom: 0.35rem;
  }

  .stat-value {
    font-size: 1.3rem;
    font-weight: 700;
    color: #1f2937;
  }

  .stat-card.highlight .stat-value {
    color: #f97316;
  }

  .stat-meta {
    font-size: 0.8rem;
    color: #64748b;
    margin-top: 0.35rem;
  }

  .input-form {
    margin-top: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .admin-form-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .field label {
    display: block;
    font-weight: 600;
    color: #334155;
    margin-bottom: 0.35rem;
  }

  .input-with-icon {
    position: relative;
  }

  .input-with-icon .input {
    padding-right: 2.5rem;
  }

  .input-icon {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
  }

  .input-icon svg {
    width: 18px;
    height: 18px;
  }

  .textarea {
    min-height: 96px;
    resize: vertical;
  }

  .btn-submit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.85rem 1.5rem;
    border-radius: 0.75rem;
    border: none;
    background: #16a34a;
    color: #ffffff;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .btn-full {
    width: 100%;
  }

  .btn-submit svg {
    width: 18px;
    height: 18px;
  }

  .btn-submit:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(22, 163, 74, 0.25);
  }

  .btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .history-header h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
  }

  .history-actions {
    display: flex;
    gap: 0.75rem;
  }

  .btn-outline,
  .btn-success {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.9rem;
    border-radius: 0.6rem;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid;
    background: #ffffff;
  }

  .btn-outline {
    border-color: #cbd5f5;
    color: #2563eb;
  }

  .btn-success {
    border-color: #16a34a;
    background: #16a34a;
    color: #ffffff;
  }

  .btn-outline svg,
  .btn-success svg {
    width: 16px;
    height: 16px;
  }

  .btn-outline:disabled,
  .btn-success:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .history-desc {
    margin-top: 0.75rem;
    color: #64748b;
  }

  .admin-filters-grid {
    margin-top: 1.25rem;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }

  .admin-filters-grid select {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 0.5rem;
    background: #ffffff;
  }

  .admin-filter-footer {
    margin-top: 1rem;
    display: flex;
    align-items: flex-end;
    gap: 1.5rem;
    justify-content: space-between;
  }

  .admin-filter-footer .field {
    flex: 1;
  }

  .btn-reset {
    border: none;
    background: none;
    color: #16a34a;
    font-weight: 600;
    cursor: pointer;
  }

  .filter-active {
    margin-top: 0.75rem;
    color: #64748b;
    font-size: 0.875rem;
  }

  .filters-grid {
    margin-top: 1.25rem;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
  }

  .filters-grid select {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 0.5rem;
    background: #ffffff;
  }

  .date-range {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 0.5rem;
  }

  .range-sep {
    color: #94a3b8;
    font-weight: 600;
  }

  .table-container {
    background: var(--surface, #ffffff);
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow-x: auto;
    margin-top: 1rem;
  }

  .table {
    width: 100%;
    border-collapse: collapse;
  }

  .table th,
  .table td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--border, #e2e8f0);
  }

  .table th {
    font-weight: 600;
    color: var(--text-muted, #64748b);
    background: var(--bg, #f8fafc);
  }

  .cell-strong {
    font-weight: 700;
    color: #0f172a;
  }

  .empty-state {
    padding: 1rem 1.25rem 1.5rem;
    color: #94a3b8;
  }

  .table-loading {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1.5rem 0;
    color: #64748b;
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 1024px) {
    .meta-grid {
      grid-template-columns: 1fr;
    }

    .admin-filters-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .filters-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 768px) {
    .operasional-card,
    .admin-card,
    .history-card {
      padding: 1.5rem;
    }

    .form-grid {
      grid-template-columns: 1fr;
    }

    .admin-filter-footer {
      flex-direction: column;
      align-items: flex-start;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .history-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .history-actions {
      width: 100%;
      flex-direction: column;
    }

    .filters-grid {
      grid-template-columns: 1fr;
    }

    .admin-filters-grid {
      grid-template-columns: 1fr;
    }

    .table th,
    .table td {
      padding: 0.5rem 0.625rem;
      font-size: 0.8125rem;
    }

    .pagination {
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .pagination span {
      font-size: 0.875rem;
    }
  }
</style>
