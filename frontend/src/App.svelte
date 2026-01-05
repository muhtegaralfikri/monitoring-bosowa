<script lang="ts">
  import { onMount } from 'svelte'
  import { auth } from './lib/stores/auth'
  import { toast } from './lib/stores/toast'
  import Login from './routes/Login.svelte'
  import Dashboard from './routes/Dashboard.svelte'
  import Input from './routes/Input.svelte'
  import Users from './routes/Users.svelte'
  import Navbar from './lib/components/Navbar.svelte'
  import Toast from './lib/components/Toast.svelte'

  let currentPage = $state<'login' | 'dashboard' | 'input' | 'users'>('dashboard')
  let isLoading = $state(true)

  // URL to page mapping
  const pageRoutes: Record<string, 'login' | 'dashboard' | 'input' | 'users'> = {
    '': 'dashboard',
    '/': 'dashboard',
    '/login': 'login',
    '/dashboard': 'dashboard',
    '/input': 'input',
    '/users': 'users',
  }

  // Page to URL mapping
  const pageUrls: Record<'login' | 'dashboard' | 'input' | 'users', string> = {
    login: '/login',
    dashboard: '/',
    input: '/input',
    users: '/users',
  }

  onMount(async () => {
    await auth.init()
    isLoading = false

    applyRoute(window.location.pathname, true)

    // Handle browser back/forward
    window.addEventListener('popstate', handlePopState)
  })

  function resolvePage(path: string) {
    const target = pageRoutes[path] || 'dashboard'
    const publicPages: Array<typeof currentPage> = ['dashboard', 'login']

    if (!$auth.isAuthenticated) {
      return publicPages.includes(target) ? target : 'login'
    }

    if (target === 'login') {
      return 'dashboard'
    }

    if (target === 'users' && $auth.user?.role !== 1) {
      return 'dashboard'
    }

    return target
  }

  function applyRoute(path: string, replace = false) {
    const nextPage = resolvePage(path)
    currentPage = nextPage
    const url = pageUrls[nextPage]
    if (replace) {
      window.history.replaceState({}, '', url)
      return
    }
    window.history.pushState({}, '', url)
  }

  function handlePopState() {
    applyRoute(window.location.pathname, true)
  }

  function navigate(page: typeof currentPage) {
    const path = pageUrls[page]
    applyRoute(path)
  }

  function handleLogout() {
    auth.logout().finally(() => {
      applyRoute('/login', true)
    })
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
        {:else if currentPage === 'input'}
          <Input />
        {:else if currentPage === 'users' && $auth.user?.role === 1}
          <Users />
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
