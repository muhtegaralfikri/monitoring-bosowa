<script lang="ts">
  import { onMount } from 'svelte'
  import { stockService } from '../lib/services/stock.service'
  import { toast } from '../lib/stores/toast'
  import { formatDateTime, formatNumber } from '../lib/utils/format'
  import type { StockHistory, StockHistoryResponse } from '../lib/types'

  let data = $state<StockHistory[]>([])
  let pagination = $state({ page: 1, limit: 20, total: 0, totalPages: 0 })
  let loading = $state(true)

  // Filters
  let filters = $state({
    type: '' as 'IN' | 'OUT' | '',
    location: '' as 'GENSET' | 'TUG_ASSIST' | '',
    startDate: '',
    endDate: '',
  })

  onMount(async () => {
    await loadHistory()
  })

  async function loadHistory(page = 1) {
    try {
      loading = true
      const params: any = {
        page,
        limit: pagination.limit,
      }

      if (filters.type) params.type = filters.type
      if (filters.location) params.location = filters.location
      if (filters.startDate) params.startDate = filters.startDate
      if (filters.endDate) params.endDate = filters.endDate

      const response: StockHistoryResponse = await stockService.getHistory(params)
      data = response.data
      pagination = { ...response.pagination }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat data')
    } finally {
      loading = false
    }
  }

  function applyFilters() {
    loadHistory(1)
  }

  function resetFilters() {
    filters = {
      type: '',
      location: '',
      startDate: '',
      endDate: '',
    }
    loadHistory(1)
  }

  function getTypeBadge(type: string) {
    return type === 'IN' ? 'badge-in' : 'badge-out'
  }
</script>

<div class="history-page">
  <h1>Riwayat Stok BBM</h1>

  <div class="filters">
    <select bind:value={filters.type} onchange={applyFilters}>
      <option value="">Semua Tipe</option>
      <option value="IN">Masuk</option>
      <option value="OUT">Keluar</option>
    </select>

    <select bind:value={filters.location} onchange={applyFilters}>
      <option value="">Semua Lokasi</option>
      <option value="GENSET">GENSET</option>
      <option value="TUG_ASSIST">TUG ASSIST</option>
    </select>

    <input
      type="date"
      class="input"
      bind:value={filters.startDate}
      onchange={applyFilters}
    />

    <input
      type="date"
      class="input"
      bind:value={filters.endDate}
      onchange={applyFilters}
    />

    <button class="btn btn-secondary" onclick={resetFilters}>Reset</button>
  </div>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  {:else}
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Tipe</th>
            <th>Lokasi</th>
            <th>Jumlah</th>
            <th>Saldo</th>
            <th>Keterangan</th>
            <th>User</th>
          </tr>
        </thead>
        <tbody>
          {#each data as row}
            <tr>
              <td>{formatDateTime(row.created_at)}</td>
              <td>
                <span class="badge {getTypeBadge(row.type)}">
                  {row.type}
                </span>
              </td>
              <td>{row.location}</td>
              <td>{formatNumber(row.amount)} Liter</td>
              <td>{formatNumber(row.balance)} Liter</td>
              <td>{row.notes || '-'}</td>
              <td>{row.userName}</td>
            </tr>
          {/each}
        </tbody>
      </table>
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
</div>

<style>
  .filters {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .filters select,
  .filters input {
    padding: 0.5rem;
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 0.375rem;
  }

  .table-container {
    background: var(--surface, #ffffff);
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow-x: auto;
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

  .badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .badge-in {
    background: #dcfce7;
    color: #166534;
  }

  .badge-out {
    background: #fee2e2;
    color: #991b1b;
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
</style>
