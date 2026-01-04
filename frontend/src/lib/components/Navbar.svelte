<script lang="ts">
  interface Props {
    currentPage: 'login' | 'dashboard' | 'history' | 'charts' | 'users' | 'logs'
    onNavigate: (page: 'dashboard' | 'history' | 'charts' | 'users' | 'logs') => void
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
    ...(isAdmin ? [{ id: 'users' as const, label: 'Users' }, { id: 'logs' as const, label: 'Logs' }] : [])
  ])

  let mobileMenuOpen = $state(false)

  function closeMobileMenu() {
    mobileMenuOpen = false
  }

  function handleNavigate(page: 'dashboard' | 'history' | 'charts' | 'users' | 'logs') {
    onNavigate(page)
    closeMobileMenu()
  }
</script>

<nav class="navbar">
  <div class="navbar-brand">
    <button
      class="brand-link"
      onclick={() => handleNavigate('dashboard')}
      onkeydown={(e) => e.key === 'Enter' && handleNavigate('dashboard')}
    >
      <img src="/logo.png" alt="Monitoring BBM" class="brand-logo" />
    </button>
  </div>

  <button
    class="mobile-menu-toggle"
    class:open={mobileMenuOpen}
    onclick={() => mobileMenuOpen = !mobileMenuOpen}
    aria-label="Toggle menu"
  >
    <span></span>
    <span></span>
    <span></span>
  </button>

  <div class="navbar-menu" class:mobile-open={mobileMenuOpen}>
    {#each navItems as item}
      <button
        class="nav-item"
        class:active={currentPage === item.id}
        onclick={() => handleNavigate(item.id)}
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
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .brand-link {
    color: var(--primary, #2563eb);
    text-decoration: none;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
  }

  .brand-logo {
    height: 40px;
    width: auto;
    display: block;
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

  /* Mobile menu toggle (hamburger) */
  .mobile-menu-toggle {
    display: none;
    flex-direction: column;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
  }

  .mobile-menu-toggle span {
    width: 24px;
    height: 2px;
    background: var(--text, #0f172a);
    border-radius: 2px;
    transition: all 0.3s ease;
  }

  .mobile-menu-toggle.open span:nth-child(1) {
    transform: rotate(45deg) translate(6px, 6px);
  }

  .mobile-menu-toggle.open span:nth-child(2) {
    opacity: 0;
  }

  .mobile-menu-toggle.open span:nth-child(3) {
    transform: rotate(-45deg) translate(6px, -6px);
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .navbar {
      padding: 0.75rem 1rem;
    }

    .brand-logo {
      height: 32px;
    }

    .mobile-menu-toggle {
      display: flex;
    }

    .navbar-menu {
      position: fixed;
      top: 60px;
      left: 0;
      right: 0;
      flex-direction: column;
      gap: 0;
      background: white;
      border-bottom: 1px solid var(--border, #e2e8f0);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 0;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }

    .navbar-menu.mobile-open {
      max-height: 400px;
      padding: 1rem;
    }

    .nav-item {
      width: 100%;
      text-align: left;
      padding: 0.875rem 1rem;
      border-radius: 0.375rem;
    }

    .btn-logout {
      width: 100%;
      text-align: center;
      margin-top: 0.5rem;
    }
  }
</style>
