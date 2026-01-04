<script lang="ts">
  import { onMount } from 'svelte'
  import { stockService } from '../lib/services/stock.service'
  import { notificationService } from '../lib/services/notification.service'
  import { toast } from '../lib/stores/toast'
  import { isAdmin } from '../lib/stores/auth'
  import { formatNumber } from '../lib/utils/format'
  import type { StockSummary, StockAlert, Alert } from '../lib/types'
  import AlertBanner from '../lib/components/AlertBanner.svelte'

  let summaries = $state<StockSummary[]>([])
  let alerts = $state<Alert[]>([])
  let loading = $state(true)
  let alertsDismissed = $state(false)

  onMount(async () => {
    await Promise.all([loadSummary(), checkLowStock()])
  })

  async function loadSummary() {
    try {
      loading = true
      summaries = await stockService.getSummary()
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat data')
    } finally {
      loading = false
    }
  }

  async function checkLowStock() {
    try {
      const response = await notificationService.checkLowStock()
      if (response.hasAlerts) {
        alerts = response.alerts.map((alert) => ({
          message: alert.message,
          type: alert.type || (alert.balance < response.threshold / 2 ? 'danger' : 'warning'),
        }))
        alertsDismissed = false
      }
    } catch (err: any) {
      console.error('Failed to check low stock:', err)
    }
  }

  function dismissAlerts() {
    alertsDismissed = true
  }
</script>

<div class="dashboard">
  <h1>Dashboard</h1>

  {#if alerts.length > 0 && !alertsDismissed}
    <AlertBanner alerts={alerts} onDismiss={dismissAlerts} />
  {/if}

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  {:else}
    <div class="summary-grid">
      {#each summaries as item}
        <div class="summary-card">
          <h2>{item.location}</h2>
          <div class="balance">
            {formatNumber(item.balance)} <span class="unit">Liter</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .summary-card {
    background: var(--surface, #ffffff);
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .summary-card h2 {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-muted, #64748b);
    margin-bottom: 0.5rem;
  }

  .balance {
    font-size: 2rem;
    font-weight: 700;
    color: var(--primary, #2563eb);
  }

  .unit {
    font-size: 1rem;
    font-weight: 400;
    color: var(--text-muted, #64748b);
  }

  @media (max-width: 768px) {
    .summary-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }

    .summary-card {
      padding: 1.25rem;
    }

    .balance {
      font-size: 1.75rem;
    }

    .unit {
      font-size: 0.875rem;
    }
  }
</style>
