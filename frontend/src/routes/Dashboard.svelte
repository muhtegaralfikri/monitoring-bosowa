<script lang="ts">
  import { onMount } from 'svelte'
  import { stockService } from '../lib/services/stock.service'
  import { toast } from '../lib/stores/toast'
  import { isAdmin } from '../lib/stores/auth'
  import { formatNumber } from '../lib/utils/format'
  import type { StockSummary } from '../lib/types'

  let summaries = $state<StockSummary[]>([])
  let loading = $state(true)

  onMount(async () => {
    await loadSummary()
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
</script>

<div class="dashboard">
  <h1>Dashboard</h1>

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
</style>
