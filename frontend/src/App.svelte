<script lang="ts">
  import { onMount } from 'svelte'
  import { auth } from './lib/stores/auth'
  import { toast } from './lib/stores/toast'
  import Login from './routes/Login.svelte'
  import Dashboard from './routes/Dashboard.svelte'
  import History from './routes/History.svelte'
  import Users from './routes/Users.svelte'
  import Logs from './routes/Logs.svelte'
  import Navbar from './lib/components/Navbar.svelte'
  import Toast from './lib/components/Toast.svelte'

  let currentPage = $state<'login' | 'dashboard' | 'history' | 'users' | 'logs'>('dashboard')
  let isLoading = $state(true)

  // URL to page mapping
  const pageRoutes: Record<string, 'login' | 'dashboard' | 'history' | 'users' | 'logs'> = {
    '': 'dashboard',
    '/': 'dashboard',
    '/login': 'login',
    '/dashboard': 'dashboard',
    '/history': 'history',
    '/users': 'users',
    '/logs': 'logs',
  }

  // Page to URL mapping
  const pageUrls: Record<'login' | 'dashboard' | 'history' | 'users' | 'logs', string> = {
    login: '/login',
    dashboard: '/',
    history: '/history',
    users: '/users',
    logs: '/logs',
  }

  onMount(async () => {
    // Set initial URL to dashboard (clean URL)
    if (window.location.pathname === '/login') {
      window.history.replaceState({}, '', '/')
    }

    await auth.init()
    isLoading = false

    // Set initial page based on URL
    const path = window.location.pathname
    currentPage = pageRoutes[path] || 'dashboard'

    // Handle browser back/forward
    window.addEventListener('popstate', handlePopState)
  })

  function handlePopState() {
    const path = window.location.pathname
    currentPage = pageRoutes[path] || 'dashboard'
  }

  function navigate(page: typeof currentPage) {
    currentPage = page
    const url = pageUrls[page]
    window.history.pushState({}, '', url)
  }

  function handleLogout() {
    auth.logout()
  }

  function handleLogin() {
    navigate('dashboard')
  }
</script>

{#if isLoading}
  <div class="loading">
    <div class="spinner"></div>
    <p>Loading...</p>
  </div>
{:else}
  <div class="app">
    <Navbar
      {currentPage}
      onNavigate={navigate}
      onLogout={handleLogout}
      isAdmin={$auth.user?.role === 1}
      isAuthenticated={$auth.isAuthenticated}
    />

    {#if currentPage === 'login'}
      <Login onLogin={handleLogin} />
    {:else}
      <main class="main">
        {#if currentPage === 'dashboard'}
          <Dashboard />
        {:else if currentPage === 'history'}
          <History />
        {:else if currentPage === 'users' && $auth.user?.role === 1}
          <Users />
        {:else if currentPage === 'logs' && $auth.user?.role === 1}
          <Logs />
        {/if}
      </main>
    {/if}

    <Toast />
  </div>
{/if}

<style>
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 1rem;
  }

  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .main {
    flex: 1;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  @media (max-width: 768px) {
    .main {
      padding: 1rem 0.75rem;
    }
  }
</style>
