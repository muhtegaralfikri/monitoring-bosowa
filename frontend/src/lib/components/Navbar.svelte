<script lang="ts">
  interface Props {
    currentPage: 'login' | 'dashboard' | 'history' | 'charts' | 'users'
    onNavigate: (page: 'dashboard' | 'history' | 'charts' | 'users') => void
    onLogout: () => void
    isAdmin?: boolean
  }

  let { currentPage, onNavigate, onLogout, isAdmin = false }: Props = $props()

  const baseNavItems = [
    { id: 'dashboard' as const, label: 'Dashboard' },
    { id: 'history' as const, label: 'Riwayat' },
    { id: 'charts' as const, label: 'Grafik' },
  ]

  const navItems = $derived([
    ...baseNavItems,
    ...(isAdmin ? [{ id: 'users' as const, label: 'Users' }] : [])
  ])
</script>

<nav class="navbar">
  <div class="navbar-brand">
    <a onclick={() => onNavigate('dashboard')}>Monitoring BBM</a>
  </div>
  <div class="navbar-menu">
    {#each navItems as item}
      <button
        class="nav-item"
        class:active={currentPage === item.id}
        onclick={() => onNavigate(item.id)}
      >
        {item.label}
      </button>
    {/each}
    <button class="btn-logout" onclick={onLogout}>Logout</button>
  </div>
</nav>

<style>
  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: white;
    border-bottom: 1px solid var(--border, #e2e8f0);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .navbar-brand a {
    font-weight: 700;
    font-size: 1.25rem;
    color: var(--primary, #2563eb);
    text-decoration: none;
    cursor: pointer;
  }

  .navbar-menu {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .nav-item {
    padding: 0.5rem 1rem;
    border: none;
    background: transparent;
    color: var(--text-muted, #64748b);
    font-weight: 500;
    cursor: pointer;
    border-radius: 0.375rem;
    transition: all 0.2s;
  }

  .nav-item:hover {
    background: var(--bg, #f8fafc);
    color: var(--text, #0f172a);
  }

  .nav-item.active {
    background: var(--primary, #2563eb);
    color: white;
  }

  .btn-logout {
    padding: 0.5rem 1rem;
    border: 1px solid var(--danger, #ef4444);
    background: transparent;
    color: var(--danger, #ef4444);
    font-weight: 500;
    cursor: pointer;
    border-radius: 0.375rem;
    transition: all 0.2s;
  }

  .btn-logout:hover {
    background: var(--danger, #ef4444);
    color: white;
  }
</style>
