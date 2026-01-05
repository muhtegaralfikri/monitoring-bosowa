<script lang="ts">
  import { auth } from '../lib/stores/auth'
  import { toast } from '../lib/stores/toast'

  interface Props {
    onLogin: () => void
  }

  let { onLogin }: Props = $props()

  let email = $state('')
  let password = $state('')
  let showPassword = $state(false)
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

<!-- Main Content -->
<main class="login-main">
  <!-- Left Column - Informational -->
  <section class="info-section">
    <p class="section-label">MONITORING LEDGER BOSOWA</p>
    <h1 class="main-title">Catat stok & pemakaian solar dengan presisi.</h1>
    <p class="main-description">
      Platform terintegrasi untuk tim admin & operasional Bosowa. Data real time, approval jelas, audit trail otomatis.
    </p>

    <!-- Feature Cards -->
    <div class="feature-cards">
      <div class="feature-card">
        <span class="feature-value">98%</span>
        <span class="feature-label">Pencatatan tersinkron dalam 1 jam terakhir.</span>
      </div>
      <div class="feature-card">
        <span class="feature-value">24/7</span>
        <span class="feature-label">Pemantauan stok & konsumsi di dashboard.</span>
      </div>
      <div class="feature-card">
        <span class="feature-value">Audit</span>
        <span class="feature-label">Jejak lengkap untuk inspeksi internal.</span>
      </div>
    </div>
  </section>

  <!-- Right Column - Login Form -->
  <section class="form-section">
    <div class="login-card">
      <p class="card-label">MASUK KE AKUN ANDA</p>
      <h2 class="card-title">Login Sistem</h2>
      <p class="card-description">
        Gunakan kredensial yang diberikan admin untuk mengakses dashboard.
      </p>

      <form onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            class="input"
            bind:value={email}
            placeholder="Masukkan Email"
            autocomplete="email"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <div class="password-input">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              class="input"
              bind:value={password}
              placeholder="Masukkan password"
              autocomplete="current-password"
              required
            />
            <button
              type="button"
              class="toggle-password"
              onclick={() => showPassword = !showPassword}
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {#if showPassword}
                <!-- Eye Off Icon -->
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 6C6.68629 6 4 10 4 10C4 10 6.68629 14 10 14C13.3137 14 16 10 16 10C16 10 13.3137 6 10 6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="10" cy="10" r="2" stroke="currentColor" stroke-width="1.5"/>
                </svg>
              {:else}
                <!-- Eye Icon -->
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 4C5.58172 4 2 10 2 10C2 10 5.58172 16 10 16C14.4183 16 18 10 18 10C18 10 14.4183 4 10 4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/>
                </svg>
              {/if}
            </button>
          </div>
        </div>

        <button type="submit" class="btn-submit" disabled={isLoading}>
          {#if isLoading}
            <span class="spinner"></span>
            Memuat...
          {:else}
            <span>Masuk</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 10H16M16 10L12 6M16 10L12 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          {/if}
        </button>
      </form>

      <div class="card-footer">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M11 11L14.5 14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>Perlu akses baru? Hubungi administrator Bosowa Fuel Ledger.</span>
      </div>
    </div>
  </section>
</main>

<style>
  /* Main Layout */
  .login-main {
    display: grid;
    grid-template-columns: 1fr 480px;
    min-height: calc(100vh - 72px);
    background: #f8f9fa;
  }

  /* Left Section - Info */
  .info-section {
    padding: 3rem 4rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .section-label {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 1rem;
  }

  .main-title {
    font-size: 2.75rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 1.5rem 0;
    line-height: 1.2;
  }

  .main-description {
    font-size: 1.125rem;
    color: #64748b;
    line-height: 1.7;
    margin-bottom: 3rem;
    max-width: 600px;
  }

  .feature-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }

  .feature-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .feature-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: #1e3a8a;
  }

  .feature-label {
    font-size: 0.875rem;
    color: #64748b;
    line-height: 1.5;
  }

  /* Right Section - Form */
  .form-section {
    padding: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .login-card {
    background: white;
    border-radius: 1rem;
    padding: 2.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 400px;
  }

  .card-label {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 0.75rem;
  }

  .card-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 0.75rem 0;
  }

  .card-description {
    font-size: 0.9375rem;
    color: #64748b;
    margin-bottom: 2rem;
    line-height: 1.6;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    font-size: 0.875rem;
    color: #374151;
  }

  .input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 0.9375rem;
    transition: border-color 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
  }

  .input:focus {
    outline: none;
    border-color: #1e3a8a;
    box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.1);
  }

  .input::placeholder {
    color: #9ca3af;
  }

  .password-input {
    position: relative;
  }

  .password-input .input {
    padding-right: 3rem;
  }

  .toggle-password {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }

  .toggle-password:hover {
    color: #374151;
  }

  .btn-submit {
    width: 100%;
    padding: 0.875rem 1.5rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: background 0.2s;
    margin-top: 0.5rem;
  }

  .btn-submit:hover:not(:disabled) {
    background: #059669;
  }

  .btn-submit:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .btn-submit svg {
    flex-shrink: 0;
  }

  .spinner {
    display: inline-block;
    width: 18px;
    height: 18px;
    border: 2px solid white;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .card-footer {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
    font-size: 0.8125rem;
    color: #6b7280;
    line-height: 1.5;
  }

  .card-footer svg {
    flex-shrink: 0;
    margin-top: 0.125rem;
    color: #9ca3af;
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .login-main {
      grid-template-columns: 1fr;
    }

    .form-section {
      order: -1;
      padding: 2rem 1.5rem;
    }

    .info-section {
      padding: 3rem 2rem;
      text-align: center;
    }

    .main-description {
      margin-left: auto;
      margin-right: auto;
    }

    .feature-cards {
      max-width: 600px;
      margin: 0 auto;
    }
  }

  @media (max-width: 768px) {
    .info-section {
      padding: 2rem 1.5rem;
    }

    .main-title {
      font-size: 2rem;
    }

    .main-description {
      font-size: 1rem;
      margin-bottom: 2rem;
    }

    .feature-cards {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .feature-card {
      flex-direction: row;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .feature-value {
      font-size: 1.5rem;
      min-width: 60px;
    }

    .feature-label {
      font-size: 0.8125rem;
      text-align: left;
    }

    .login-card {
      padding: 2rem 1.5rem;
    }

    .card-title {
      font-size: 1.5rem;
    }
  }

  @media (max-width: 480px) {
    .info-section {
      padding: 1.5rem 1rem;
    }

    .main-title {
      font-size: 1.5rem;
    }

    .main-description {
      font-size: 0.9375rem;
    }

    .login-card {
      padding: 1.5rem 1rem;
    }

    .card-title {
      font-size: 1.25rem;
    }

    .card-description {
      font-size: 0.875rem;
    }

    .form-group label {
      font-size: 0.8125rem;
    }

    .input {
      padding: 0.625rem 0.75rem;
      font-size: 0.875rem;
    }

    .password-input .input {
      padding-right: 2.75rem;
    }

    .toggle-password {
      right: 0.625rem;
    }

    .btn-submit {
      padding: 0.75rem 1rem;
      font-size: 0.9375rem;
    }

    .card-footer {
      font-size: 0.75rem;
      flex-direction: column;
      gap: 0.25rem;
    }
  }
</style>
