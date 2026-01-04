<script lang="ts">
  import { onMount } from 'svelte'
  import { logsService } from '../lib/services/logs.service'
  import { toast } from '../lib/stores/toast'
  import { formatDateTime } from '../lib/utils/format'
  import type { SystemLog, LogsQuery } from '../lib/types'

  let data = $state<SystemLog[]>([])
  let pagination = $state({ page: 1, limit: 50, total: 0, totalPages: 0 })
  let loading = $state(true)
  let cleaning = $state(false)

  // Filters
  let filters = $state<LogsQuery>({
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
    search: '',
  })

  onMount(async () => {
    await loadLogs()
  })

  async function loadLogs(page = 1) {
    try {
      loading = true
      const params: LogsQuery = {
        page,
        limit: pagination.limit,
        ...filters,
      }

      const response = await logsService.getLogs(params)
      data = response.data
      pagination = { ...response.pagination }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat data')
    } finally {
      loading = false
    }
  }

  function applyFilters() {
    loadLogs(1)
  }

  function resetFilters() {
    filters = {
      action: '',
      entityType: '',
      startDate: '',
      endDate: '',
      search: '',
    }
    loadLogs(1)
  }

  function getActionBadge(action: string) {
    const badges: Record<string, string> = {
      LOGIN: 'badge-info',
      LOGOUT: 'badge-secondary',
      LOGIN_FAILED: 'badge-danger',
      TOKEN_REFRESH: 'badge-secondary',
      STOCK_IN: 'badge-success',
      STOCK_OUT: 'badge-warning',
      USER_CREATED: 'badge-primary',
      USER_UPDATED: 'badge-info',
      USER_DELETED: 'badge-danger',
      SETTINGS_UPDATED: 'badge-info',
      LOGS_VIEWED: 'badge-secondary',
    }
    return badges[action] || 'badge-secondary'
  }

  async function cleanOldLogs() {
    if (!confirm('Hapus log lebih dari 90 hari?')) return

    try {
      cleaning = true
      await logsService.cleanOldLogs()
      toast.success('Log lama berhasil dihapus')
      await loadLogs(pagination.page)
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus log lama')
    } finally {
      cleaning = false
    }
  }
</script>

<div class="logs-page">
  <div class="page-header">
    <h1>System Logs</h1>
    <button
      class="btn btn-danger"
      onclick={cleanOldLogs}
      disabled={cleaning}
    >
      {cleaning ? 'Menghapus...' : 'Hapus Log > 90 Hari'}
    </button>
  </div>

  <div class="filters">
    <input
      type="text"
      class="input"
      placeholder="Cari action atau details..."
      bind:value={filters.search}
      onkeypress={(e) => e.key === 'Enter' && applyFilters()}
    />

    <select bind:value={filters.action} onchange={applyFilters}>
      <option value="">Semua Action</option>
      <option value="LOGIN">Login</option>
      <option value="LOGOUT">Logout</option>
      <option value="LOGIN_FAILED">Login Failed</option>
      <option value="STOCK_IN">Stock IN</option>
      <option value="STOCK_OUT">Stock OUT</option>
      <option value="USER_CREATED">User Created</option>
      <option value="USER_UPDATED">User Updated</option>
      <option value="USER_DELETED">User Deleted</option>
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
            <th>Timestamp</th>
            <th>Action</th>
            <th>User</th>
            <th>Entity</th>
            <th>IP Address</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {#each data as row}
            <tr>
              <td>{formatDateTime(row.createdAt)}</td>
              <td>
                <span class="badge {getActionBadge(row.action)}">
                  {row.action}
                </span>
              </td>
              <td>{row.userName || row.userEmail || '-'}</td>
              <td>
                {row.entityType
                  ? `${row.entityType}${row.entityId ? ` #${row.entityId}` : ''}`
                  : '-'}
              </td>
              <td>{row.ipAddress || '-'}</td>
              <td class="details-cell">{row.details || '-'}</td>
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
          onclick={() => loadLogs(pagination.page - 1)}
        >
          Prev
        </button>
        <span>
          Hal {pagination.page} dari {pagination.totalPages} ({pagination.total} total)
        </span>
        <button
          class="btn btn-secondary"
          disabled={pagination.page === pagination.totalPages}
          onclick={() => loadLogs(pagination.page + 1)}
        >
          Next
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

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

  .filters input[type='text'] {
    flex: 1;
    min-width: 200px;
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

  .details-cell {
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .badge-secondary {
    background: #e2e8f0;
    color: #475569;
  }

  .badge-primary {
    background: #dbeafe;
    color: #1e40af;
  }

  .badge-success {
    background: #dcfce7;
    color: #166534;
  }

  .badge-warning {
    background: #fef3c7;
    color: #92400e;
  }

  .badge-danger {
    background: #fee2e2;
    color: #991b1b;
  }

  .badge-info {
    background: #e0f2fe;
    color: #075985;
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

  .btn-danger {
    background: #ef4444;
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: #dc2626;
  }

  @media (max-width: 768px) {
    .page-header {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }

    .page-header .btn {
      width: 100%;
      font-size: 0.875rem;
      padding: 0.625rem;
    }

    .filters {
      gap: 0.5rem;
    }

    .filters select,
    .filters input,
    .filters button {
      font-size: 0.8125rem;
      padding: 0.5rem 0.625rem;
    }

    .filters input[type='text'] {
      min-width: 150px;
      flex: 1;
    }

    .filters input[type='date'] {
      flex: 1;
      min-width: 120px;
    }

    .table th,
    .table td {
      padding: 0.5rem 0.625rem;
      font-size: 0.8125rem;
    }

    .details-cell {
      max-width: 150px;
    }

    .badge {
      font-size: 0.6875rem;
      padding: 0.1875rem 0.375rem;
    }

    .pagination {
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .pagination span {
      font-size: 0.875rem;
    }

    .pagination .btn {
      font-size: 0.8125rem;
      padding: 0.5rem 0.75rem;
    }
  }
</style>
