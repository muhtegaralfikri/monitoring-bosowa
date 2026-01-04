<script lang="ts">
  import { onMount } from 'svelte'
  import { stockService } from '../lib/services/stock.service'
  import { toast } from '../lib/stores/toast'
  import { formatDateTime } from '../lib/utils/format'
  import Chart from 'chart.js/auto'

  let loading = $state(true)
  let chartInstance: Chart | null = null
  let canvasElement = $state<HTMLCanvasElement | undefined>(undefined)

  // Filter options
  let timeRange = $state<'7d' | '30d' | '90d' | 'custom'>('30d')
  let selectedLocation = $state<'GENSET' | 'TUG_ASSIST' | 'ALL'>('ALL')

  // Custom date range
  let customStartDate = $state('')
  let customEndDate = $state('')

  onMount(async () => {
    await loadChartData()
  })

  async function loadChartData() {
    try {
      loading = true

      let startDate: Date
      let endDate = new Date()
      let days: number

      if (timeRange === 'custom') {
        // Validate custom dates
        if (!customStartDate || !customEndDate) {
          toast.error('Pilih tanggal mulai dan tanggal akhir')
          loading = false
          return
        }

        startDate = new Date(customStartDate)
        endDate = new Date(customEndDate)

        // Validate end date >= start date
        if (endDate < startDate) {
          toast.error('Tanggal akhir harus lebih besar atau sama dengan tanggal mulai')
          loading = false
          return
        }

        // Calculate days between dates
        days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      } else {
        // Predefined ranges
        startDate = new Date()
        days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
        startDate.setDate(startDate.getDate() - days)
      }

      const response = await stockService.getHistory({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        location: selectedLocation === 'ALL' ? undefined : selectedLocation,
        limit: 10000,
      })

      // Process data for chart
      const chartData = processChartData(response.data, days, startDate, endDate)
      renderChart(chartData)
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat data grafik')
    } finally {
      loading = false
    }
  }

  function processChartData(data: any[], days: number, startDate: Date, endDate: Date) {
    // Initialize date labels
    const labels: string[] = []
    const gensetData: number[] = []
    const tugAssistData: number[] = []

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      labels.push(date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }))
    }

    // Track balances per location per day
    const gensetBalances: Record<string, number> = {}
    const tugAssistBalances: Record<string, number> = {}

    // Initialize with first known balance or 0
    data.forEach((item) => {
      const dateKey = new Date(item.created_at).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
      })

      if (item.location === 'GENSET') {
        gensetBalances[dateKey] = Number(item.balance)
      } else {
        tugAssistBalances[dateKey] = Number(item.balance)
      }
    })

    // Fill arrays with balances (use last known balance)
    let lastGenset = 0
    let lastTugAssist = 0

    labels.forEach((label) => {
      if (gensetBalances[label] !== undefined) {
        lastGenset = gensetBalances[label]
      }
      if (tugAssistBalances[label] !== undefined) {
        lastTugAssist = tugAssistBalances[label]
      }
      gensetData.push(lastGenset)
      tugAssistData.push(lastTugAssist)
    })

    return { labels, gensetData, tugAssistData }
  }

  function renderChart(data: { labels: string[]; gensetData: number[]; tugAssistData: number[] }) {
    if (chartInstance) {
      chartInstance.destroy()
    }

    if (!canvasElement) return

    const ctx = canvasElement.getContext('2d')
    if (!ctx) return

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'GENSET',
            data: data.gensetData,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            fill: true,
            tension: 0.4,
          },
          {
            label: 'TUG ASSIST',
            data: data.tugAssistData,
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22, 163, 74, 0.1)',
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${context.parsed.y} Liter`
              },
            },
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
      },
    })
  }

  function refreshChart() {
    loadChartData()
  }
</script>

<div class="charts-page">
  <h1>Grafik Stok BBM</h1>

  <div class="filters">
    <div class="filter-group">
      <label for="timeRange">Rentang Waktu</label>
      <select id="timeRange" bind:value={timeRange} onchange={refreshChart}>
        <option value="7d">7 Hari Terakhir</option>
        <option value="30d">30 Hari Terakhir</option>
        <option value="90d">90 Hari Terakhir</option>
        <option value="custom">Custom</option>
      </select>
    </div>

    {#if timeRange === 'custom'}
      <div class="filter-group">
        <label for="startDate">Tanggal Mulai</label>
        <input
          id="startDate"
          type="date"
          class="input"
          bind:value={customStartDate}
        />
      </div>

      <div class="filter-group">
        <label for="endDate">Tanggal Akhir</label>
        <input
          id="endDate"
          type="date"
          class="input"
          bind:value={customEndDate}
        />
      </div>

      <div class="filter-group">
        <button class="btn btn-primary" onclick={refreshChart}>Terapkan</button>
      </div>
    {/if}

    <div class="filter-group">
      <label for="location">Lokasi</label>
      <select id="location" bind:value={selectedLocation} onchange={refreshChart}>
        <option value="ALL">Semua Lokasi</option>
        <option value="GENSET">GENSET</option>
        <option value="TUG_ASSIST">TUG ASSIST</option>
      </select>
    </div>
  </div>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  {:else}
    <div class="chart-container">
      <canvas bind:this={canvasElement}></canvas>
    </div>
  {/if}
</div>

<style>
  .filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .filter-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-muted, #64748b);
  }

  .filter-group select,
  .filter-group input {
    padding: 0.5rem;
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 0.375rem;
    min-width: 180px;
  }

  .chart-container {
    background: var(--surface, #ffffff);
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    height: 400px;
  }

  @media (max-width: 768px) {
    .filters {
      gap: 0.5rem;
    }

    .filter-group {
      flex: 1 1 100%;
    }

    .filter-group select,
    .filter-group input {
      min-width: 100%;
      font-size: 0.8125rem;
      padding: 0.5rem 0.625rem;
    }

    .chart-container {
      padding: 1rem;
      height: 300px;
    }
  }
</style>
