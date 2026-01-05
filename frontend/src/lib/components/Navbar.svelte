<script lang="ts">
  interface Props {
    currentPage: 'login' | 'dashboard' | 'input' | 'users'
    onNavigate: (page: 'dashboard' | 'input' | 'users' | 'login') => void
    onLogout: () => void
    isAdmin?: boolean
    isAuthenticated?: boolean
  }

  let { currentPage, onNavigate, onLogout, isAdmin = false, isAuthenticated = false }: Props = $props()

  const baseNavItems = [
    { id: 'dashboard' as const, label: 'Beranda' },
    { id: 'input' as const, label: 'Input' },
  ]

  const navItems = $derived([
    ...baseNavItems,
    ...(isAdmin ? [{ id: 'users' as const, label: 'Users' }] : [])
  ])

  let mobileMenuOpen = $state(false)

  function closeMobileMenu() {
    mobileMenuOpen = false
  }

  function handleNavigate(page: 'dashboard' | 'input' | 'users' | 'login') {
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
    {#if isAuthenticated}
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
    {:else}
      <button
        class="btn-login"
        onclick={() => handleNavigate('login')}
      >
        Login
      </button>
    {/if}
  </div>
</nav>

<style>
  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: #1f4b8f;
    border-bottom: none;
    box-shadow: none;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .brand-link {
    color: #ffffff;
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
    color: rgba(255, 255, 255, 0.85);
    font-weight: 600;
    cursor: pointer;
    border-radius: 0.375rem;
    transition: all 0.2s;
  }

  .nav-item:hover {
    background: rgba(255, 255, 255, 0.18);
    color: #ffffff;
  }

  .nav-item.active {
    background: transparent;
    color: #ffffff;
    font-weight: 700;
  }

  .btn-logout {
    padding: 0.5rem 1rem;
    border: 1px solid rgba(255, 255, 255, 0.7);
    background: transparent;
    color: #ffffff;
    font-weight: 600;
    cursor: pointer;
    border-radius: 0.375rem;
    transition: all 0.2s;
  }

  .btn-logout:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .btn-login {
    padding: 0.5rem 1.5rem;
    border: none;
    background: transparent;
    color: #ffffff;
    font-weight: 600;
    cursor: pointer;
    border-radius: 0.375rem;
    transition: all 0.2s;
  }

  .btn-login:hover {
    background: rgba(255, 255, 255, 0.2);
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
    background: #ffffff;
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
      background: #1f4b8f;
      border-bottom: none;
      box-shadow: 0 4px 6px rgba(15, 23, 42, 0.25);
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

    .btn-logout,
    .btn-login {
      width: 100%;
      text-align: center;
      margin-top: 0.5rem;
    }
  }
</style>
