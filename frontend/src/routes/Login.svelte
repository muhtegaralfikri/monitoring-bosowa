<script lang="ts">
  import { auth } from '../lib/stores/auth'
  import { toast } from '../lib/stores/toast'

  interface Props {
    onLogin: () => void
  }

  let { onLogin }: Props = $props()

  let email = $state('')
  let password = $state('')
  let isLoading = $state(false)

  async function handleLogin() {
    if (!email || !password) {
      toast.error('Email dan password harus diisi')
      return
    }

    try {
      isLoading = true
      await auth.login(email, password)
      toast.success('Login berhasil')
      onLogin()
    } catch (err: any) {
      toast.error(err.message || 'Login gagal')
    } finally {
      isLoading = false
    }
  }
</script>

<div class="login-container">
  <div class="login-card">
    <h1>Monitoring BBM Bosowa</h1>
    <p class="subtitle">Silakan login untuk melanjutkan</p>

    <form onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          type="email"
          class="input"
          bind:value={email}
          placeholder="admin@bosowa.com"
          autocomplete="email"
          required
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          class="input"
          bind:value={password}
          placeholder="•••••••••"
          autocomplete="current-password"
          required
        />
      </div>

      <button type="submit" class="btn btn-primary" disabled={isLoading}>
        {#if isLoading}
          <span class="spinner-small"></span>
          Loading...
        {:else}
          Login
        {/if}
      </button>
    </form>

    <p class="hint">
      Email test: <code>admin@bosowa.com</code><br>
      Password: <code>admin123</code>
    </p>
  </div>
</div>

<style>
  .login-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--bg, #f8fafc);
  }

  .login-card {
    background: var(--surface, #ffffff);
    border-radius: 0.5rem;
    padding: 2rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 400px;
  }

  h1 {
    text-align: center;
    margin-bottom: 0.5rem;
    color: var(--primary, #2563eb);
  }

  .subtitle {
    text-align: center;
    color: var(--text-muted, #64748b);
    margin-bottom: 2rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text, #0f172a);
  }

  .btn {
    width: 100%;
    padding: 0.75rem;
    margin-top: 1rem;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spinner-small {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid white;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .hint {
    margin-top: 1.5rem;
    padding: 1rem;
    background: var(--bg, #f8fafc);
    border-radius: 0.375rem;
    font-size: 0.875rem;
    color: var(--text-muted, #64748b);
  }

  .hint code {
    background: white;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: monospace;
  }
</style>
