<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import Chart from 'chart.js/auto'
  import { stockService } from '../lib/services/stock.service'
  import { toast } from '../lib/stores/toast'
  import type { StockHistory, StockTrend, TodayStats } from '../lib/types'

  type LocationKey = 'GENSET' | 'TUG_ASSIST'

  const locationMeta: Record<LocationKey, { label: string; site: string; color: string }> = {
    GENSET: { label: 'Genset', site: 'Lantebung', color: '#2563eb' },
    TUG_ASSIST: { label: 'Tug Assist', site: 'Jeneponto', color: '#0ea5e9' },
  }

  const defaultStats = (location: LocationKey): TodayStats => ({
    location,
    initialStock: 0,
    todayIn: 0,
    todayOut: 0,
    finalStock: 0,
  })

  let statsByLocation = $state<Record<LocationKey, TodayStats>>({
    GENSET: defaultStats('GENSET'),
    TUG_ASSIST: defaultStats('TUG_ASSIST'),
  })

  let chartLabels = $state<string[]>([])
  let loading = $state(true)

  let gensetTrendCanvas = $state<HTMLCanvasElement | undefined>(undefined)
  let gensetInOutCanvas = $state<HTMLCanvasElement | undefined>(undefined)
  let tugTrendCanvas = $state<HTMLCanvasElement | undefined>(undefined)
  let tugInOutCanvas = $state<HTMLCanvasElement | undefined>(undefined)

  let gensetTrendChart: Chart | null = null
  let gensetInOutChart: Chart | null = null
  let tugTrendChart: Chart | null = null
  let tugInOutChart: Chart | null = null

  onMount(() => {
    loadDashboard()
  })

  onDestroy(() => {
    gensetTrendChart?.destroy()
    gensetInOutChart?.destroy()
    tugTrendChart?.destroy()
    tugInOutChart?.destroy()
  })

  function toDateKey(date: Date) {
    return date.toLocaleDateString('en-CA')
  }

  function buildDateRange(days: number) {
    const end = new Date()
    end.setHours(0, 0, 0, 0)
    const start = new Date(end)
    start.setDate(end.getDate() - (days - 1))

    const labels: string[] = []
    const keys: string[] = []

    for (let i = 0; i < days; i++) {
      const current = new Date(start)
      current.setDate(start.getDate() + i)
      labels.push(
        current.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      )
      keys.push(toDateKey(current))
    }

    return { labels, keys, startKey: keys[0], endKey: keys[keys.length - 1] }
  }

  function fillTrendData(trend: StockTrend[], keys: string[]) {
    const balances: Record<string, number> = {}
    trend.forEach((item) => {
      const key = toDateKey(new Date(item.date))
      balances[key] = Number(item.balance)
    })

    let lastValue = 0
    return keys.map((key) => {
      if (balances[key] !== undefined) {
        lastValue = balances[key]
      }
      return lastValue
    })
  }

  function aggregateInOut(history: StockHistory[], keys: string[]) {
    const inTotals: Record<string, number> = {}
    const outTotals: Record<string, number> = {}

    history.forEach((item) => {
      const rawDate = resolveCreatedAt(item)
      if (!rawDate) return
      const key = toDateKey(new Date(rawDate))
      const amount = Number(item.amount)
      if (item.type === 'IN') {
        inTotals[key] = (inTotals[key] || 0) + amount
      } else {
        outTotals[key] = (outTotals[key] || 0) + amount
      }
    })

    return {
      inData: keys.map((key) => inTotals[key] || 0),
      outData: keys.map((key) => outTotals[key] || 0),
    }
  }

  function resolveCreatedAt(row: StockHistory) {
    return (row as any).created_at || (row as any).createdAt
  }

  function resolveFillColor(color: string) {
    if (color === '#2563eb') {
      return 'rgba(37, 99, 235, 0.15)'
    }
    if (color === '#0ea5e9') {
      return 'rgba(14, 165, 233, 0.15)'
    }
    return 'rgba(15, 23, 42, 0.08)'
  }

  function renderTrendChart(
    canvas: HTMLCanvasElement | undefined,
    existingChart: Chart | null,
    labels: string[],
    values: number[],
    color: string,
    label: string
  ) {
    if (!canvas) return existingChart
    existingChart?.destroy()
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label,
            data: values,
            borderColor: color,
            backgroundColor: resolveFillColor(color),
            fill: true,
            tension: 0.35,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.parsed.y} L`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `${value} L`,
            },
            grid: {
              color: 'rgba(15, 23, 42, 0.08)',
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    })
  }

  function renderInOutChart(
    canvas: HTMLCanvasElement | undefined,
    existingChart: Chart | null,
    labels: string[],
    inData: number[],
    outData: number[]
  ) {
    if (!canvas) return existingChart
    existingChart?.destroy()
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Penambahan (IN)',
            data: inData,
            backgroundColor: '#22c55e',
            borderRadius: 6,
          },
          {
            label: 'Pemakaian (OUT)',
            data: outData,
            backgroundColor: '#f97316',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'center',
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.parsed.y} L`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `${value} L`,
            },
            grid: {
              color: 'rgba(15, 23, 42, 0.08)',
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    })
  }

  async function loadDashboard() {
    loading = true
    const range = buildDateRange(7)
    chartLabels = range.labels

    try {
      const [todayStats, gensetTrend, tugTrend, gensetHistory, tugHistory] = await Promise.all([
        stockService.getTodayStats(),
        stockService.getTrend({ days: 7, location: 'GENSET' }),
        stockService.getTrend({ days: 7, location: 'TUG_ASSIST' }),
        stockService.getHistory({
          location: 'GENSET',
          startDate: range.startKey,
          endDate: range.endKey,
          limit: 10000,
        }),
        stockService.getHistory({
          location: 'TUG_ASSIST',
          startDate: range.startKey,
          endDate: range.endKey,
          limit: 10000,
        }),
      ])

      const updatedStats = {
        GENSET: defaultStats('GENSET'),
        TUG_ASSIST: defaultStats('TUG_ASSIST'),
      }

      todayStats.forEach((stat) => {
        if (stat.location === 'GENSET' || stat.location === 'TUG_ASSIST') {
          updatedStats[stat.location] = stat
        }
      })

      statsByLocation = updatedStats

      const gensetTrendData = fillTrendData(gensetTrend, range.keys)
      const tugTrendData = fillTrendData(tugTrend, range.keys)
      const gensetInOut = aggregateInOut(gensetHistory.data, range.keys)
      const tugInOut = aggregateInOut(tugHistory.data, range.keys)

      gensetTrendChart = renderTrendChart(
        gensetTrendCanvas,
        gensetTrendChart,
        chartLabels,
        gensetTrendData,
        locationMeta.GENSET.color,
        'GENSET'
      )
      tugTrendChart = renderTrendChart(
        tugTrendCanvas,
        tugTrendChart,
        chartLabels,
        tugTrendData,
        locationMeta.TUG_ASSIST.color,
        'TUG ASSIST'
      )
      gensetInOutChart = renderInOutChart(
        gensetInOutCanvas,
        gensetInOutChart,
        chartLabels,
        gensetInOut.inData,
        gensetInOut.outData
      )
      tugInOutChart = renderInOutChart(
        tugInOutCanvas,
        tugInOutChart,
        chartLabels,
        tugInOut.inData,
        tugInOut.outData
      )
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat data dashboard')
    } finally {
      loading = false
    }
  }
</script>

<div class="dashboard">
  {#if loading}
    <div class="dashboard-loading">
      <div class="spinner"></div>
      <span>Memuat data dashboard...</span>
    </div>
  {/if}

  <section class="dashboard-section">
    <header class="section-header">
      <h2 class="section-title">
        Monitoring Solar {locationMeta.GENSET.label} ({locationMeta.GENSET.site})
      </h2>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <p class="stat-title">Stok Awal Hari Ini</p>
        <p class="stat-value neutral">{statsByLocation.GENSET.initialStock} Liter</p>
      </div>
      <div class="stat-card">
        <p class="stat-title">Input Hari Ini</p>
        <p class="stat-value success">{statsByLocation.GENSET.todayIn} Liter</p>
      </div>
      <div class="stat-card">
        <p class="stat-title">Output Hari Ini</p>
        <p class="stat-value warning">{statsByLocation.GENSET.todayOut} Liter</p>
      </div>
      <div class="stat-card">
        <p class="stat-title">Stok Akhir Hari Ini</p>
        <p class="stat-value primary">{statsByLocation.GENSET.finalStock} Liter</p>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-header">
          <h3>Tren Stok 7 Hari - Genset</h3>
        </div>
        <div class="chart-frame">
          <canvas bind:this={gensetTrendCanvas}></canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <h3>IN vs OUT - Genset</h3>
        </div>
        <div class="chart-frame">
          <canvas bind:this={gensetInOutCanvas}></canvas>
        </div>
      </div>
    </div>
  </section>

  <section class="dashboard-section">
    <header class="section-header">
      <h2 class="section-title">
        Monitoring Solar {locationMeta.TUG_ASSIST.label} ({locationMeta.TUG_ASSIST.site})
      </h2>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <p class="stat-title">Stok Awal Hari Ini</p>
        <p class="stat-value neutral">{statsByLocation.TUG_ASSIST.initialStock} Liter</p>
      </div>
      <div class="stat-card">
        <p class="stat-title">Input Hari Ini</p>
        <p class="stat-value success">{statsByLocation.TUG_ASSIST.todayIn} Liter</p>
      </div>
      <div class="stat-card">
        <p class="stat-title">Output Hari Ini</p>
        <p class="stat-value warning">{statsByLocation.TUG_ASSIST.todayOut} Liter</p>
      </div>
      <div class="stat-card">
        <p class="stat-title">Stok Akhir Hari Ini</p>
        <p class="stat-value primary">{statsByLocation.TUG_ASSIST.finalStock} Liter</p>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-header">
          <h3>Tren Stok 7 Hari - Tug Assist</h3>
        </div>
        <div class="chart-frame">
          <canvas bind:this={tugTrendCanvas}></canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <h3>IN vs OUT - Tug Assist</h3>
        </div>
        <div class="chart-frame">
          <canvas bind:this={tugInOutCanvas}></canvas>
        </div>
      </div>
    </div>
  </section>
</div>

<style>
  .dashboard {
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
  }

  .dashboard-loading {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    color: #475569;
    font-weight: 600;
  }

  .section-header {
    margin-bottom: 1rem;
  }

  .section-title {
    font-size: 1.35rem;
    font-weight: 700;
    color: #1f2937;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .stat-card {
    background: #ffffff;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    padding: 1.25rem 1.5rem;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  }

  .stat-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: #334155;
    margin-bottom: 0.75rem;
  }

  .stat-value {
    font-size: 1.6rem;
    font-weight: 700;
    color: #0f172a;
  }

  .stat-value.success {
    color: #16a34a;
  }

  .stat-value.warning {
    color: #f97316;
  }

  .stat-value.primary {
    color: #2563eb;
  }

  .charts-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.5rem;
  }

  .chart-card {
    background: #ffffff;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    padding: 1.25rem 1.5rem 1.5rem;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  }

  .chart-header {
    margin-bottom: 1rem;
  }

  .chart-header h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #1f2937;
  }

  .chart-frame {
    height: 260px;
  }

  @media (max-width: 1024px) {
    .stats-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .charts-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .section-title {
      font-size: 1.1rem;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .stat-card {
      padding: 1rem 1.25rem;
    }

    .stat-value {
      font-size: 1.4rem;
    }

    .chart-card {
      padding: 1rem 1.25rem 1.25rem;
    }

    .chart-frame {
      height: 220px;
    }
  }
</style>
