<script lang="ts">
  import { onMount } from 'svelte'
  import { userService } from '../lib/services/user.service'
  import { toast } from '../lib/stores/toast'
  import { formatDateTime } from '../lib/utils/format'
  import type { User } from '../lib/types'

  let users = $state<User[]>([])
  let loading = $state(true)
  let editingUser = $state<User | null>(null)
  let isSubmitting = $state(false)
  let showPassword = $state(false)
  let locationChoice = $state<'all' | '1' | '2'>('all')

  // Form state
  let formData = $state({
    email: '',
    name: '',
    password: '',
    role: 1, // 1 = admin, 2 = operasional
    isActive: true,
  })

  onMount(async () => {
    await loadUsers()
  })

  async function loadUsers() {
    try {
      loading = true
      const response = await userService.getUsers()
      users = response.data
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat data user')
    } finally {
      loading = false
    }
  }

  function resetForm() {
    editingUser = null
    formData = {
      email: '',
      name: '',
      password: '',
      role: 1,
      isActive: true,
    }
    locationChoice = 'all'
    showPassword = false
  }

  function openEditForm(user: User) {
    editingUser = user
    formData = {
      email: user.email,
      name: user.name,
      password: '',
      role: user.role,
      isActive: user.isActive,
    }
    locationChoice = user.location === 1 ? '1' : user.location === 2 ? '2' : 'all'
    showPassword = false
  }

  function cancelEdit() {
    resetForm()
  }

  function resolveLocationValue() {
    return locationChoice === 'all' ? null : Number(locationChoice)
  }

  function formatDateTimeLines(value: string) {
    const [datePart, timePart] = formatDateTime(value).split(', ')
    return {
      date: datePart || formatDateTime(value),
      time: timePart || '',
    }
  }

  async function handleSubmit() {
    if (!formData.email || !formData.name || (!editingUser && !formData.password)) {
      toast.error('Email, nama, dan password harus diisi')
      return
    }

    try {
      isSubmitting = true
      const locationValue = resolveLocationValue()

      if (editingUser) {
        // Update existing user
        await userService.updateUser(editingUser.id, {
          email: formData.email,
          name: formData.name,
          role: formData.role,
          location: locationValue,
          isActive: formData.isActive,
          ...(formData.password ? { password: formData.password } : {}),
        })
        toast.success('User berhasil diperbarui')
      } else {
        // Create new user
        await userService.createUser({
          email: formData.email,
          name: formData.name,
          password: formData.password,
          role: formData.role,
          location: locationValue,
        })
        toast.success('User berhasil ditambahkan')
      }

      resetForm()
      await loadUsers()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan user')
    } finally {
      isSubmitting = false
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Yakin ingin menghapus user "${user.name}"?`)) {
      return
    }

    try {
      await userService.deleteUser(user.id)
      toast.success('User berhasil dihapus')
      await loadUsers()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus user')
    }
  }

  function getRoleBadge(role: number) {
    return role === 1 ? 'badge-admin' : 'badge-op'
  }

  function getRoleName(role: number) {
    return role === 1 ? 'Admin' : 'Operasional'
  }

  function getLocationName(location: number | null) {
    if (!location) return 'ALL'
    return location === 1 ? 'Genset' : 'Tug Assist'
  }
</script>

<div class="users-page">
  <section class="users-card">
    <div class="card-heading">
      <p class="card-kicker">Kelola Pengguna</p>
      <h2 class="card-title">{editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h2>
    </div>

    <form class="user-form" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <div class="form-grid">
        <div class="form-group">
          <label for="name">Nama Lengkap</label>
          <input
            id="name"
            type="text"
            class="form-input"
            bind:value={formData.name}
            placeholder="Mis. Admin Bosowa"
            required
          />
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            class="form-input"
            bind:value={formData.email}
            placeholder="admin@example.com"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Password Awal</label>
          <div class="input-with-action">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              class="form-input"
              bind:value={formData.password}
              placeholder={editingUser ? 'Kosongkan jika tidak diubah' : 'Minimal 8 karakter'}
              minlength={editingUser ? undefined : 8}
              required={!editingUser}
            />
            <button
              type="button"
              class="toggle-visibility"
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              onclick={() => showPassword = !showPassword}
            >
              {#if showPassword}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M3 12s3.6-6 9-6 9 6 9 6-3.6 6-9 6-9-6-9-6Z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8" />
                </svg>
              {:else}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M3 12s3.6-6 9-6 9 6 9 6-3.6 6-9 6-9-6-9-6Z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M5 5l14 14"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                </svg>
              {/if}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="role">Peran</label>
          <div class="select-wrapper">
            <select id="role" class="form-input" bind:value={formData.role}>
              <option value={1}>Admin</option>
              <option value={2}>Operasional</option>
            </select>
          </div>
        </div>
      </div>

      <div class="form-footer">
        <div class="form-group monitoring">
          <label for="location">Monitoring</label>
          <div class="select-wrapper">
            <select id="location" class="form-input" bind:value={locationChoice}>
              <option value="all">Semua (ALL)</option>
              <option value="1">Genset</option>
              <option value="2">Tug Assist</option>
            </select>
          </div>
        </div>

        <div class="form-actions">
          {#if editingUser}
            <button type="button" class="btn btn-outline" onclick={cancelEdit}>Batal</button>
          {/if}
          <button type="submit" class="btn btn-save" disabled={isSubmitting}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M16 19a4 4 0 0 0-8 0"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
              <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.8" />
              <path
                d="M19 8v6M16 11h6"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
            {#if isSubmitting}
              Menyimpan...
            {:else}
              {editingUser ? 'Simpan Perubahan' : 'Simpan Pengguna'}
            {/if}
          </button>
        </div>
      </div>
    </form>
  </section>

  <section class="users-card">
    <div class="card-heading">
      <p class="card-kicker">Daftar Pengguna</p>
      <h2 class="card-title">Pengguna Aktif</h2>
    </div>

    {#if loading}
      <div class="table-loading">
        <div class="spinner"></div>
        <span>Memuat data pengguna...</span>
      </div>
    {:else if users.length === 0}
      <p class="empty-state">Belum ada pengguna terdaftar.</p>
    {:else}
      <div class="table-wrapper">
        <table class="user-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Peran</th>
              <th>Monitoring</th>
              <th>Dibuat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {#each users as user}
              {@const created = formatDateTimeLines(user.createdAt)}
              <tr>
                <td class="name-cell">{user.name}</td>
                <td class="muted">{user.email}</td>
                <td>
                  <span class="role-badge {getRoleBadge(user.role)}">
                    {getRoleName(user.role)}
                  </span>
                </td>
                <td>{getLocationName(user.location)}</td>
                <td class="date-cell">
                  <span>{created.date}</span>
                  <span>{created.time}</span>
                </td>
                <td>
                  <div class="actions">
                    <button class="action-link edit" onclick={() => openEditForm(user)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linejoin="round"
                        />
                      </svg>
                      Edit
                    </button>
                    <button class="action-link delete" onclick={() => handleDelete(user)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</div>

<style>
  .users-page {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  .users-card {
    background: #ffffff;
    border-radius: 0.75rem;
    padding: 1.75rem 2rem;
    border: 1px solid #edf2f7;
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
  }

  .card-heading {
    margin-bottom: 1.5rem;
  }

  .card-kicker {
    font-size: 0.9rem;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 0.35rem;
  }

  .card-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
  }

  .user-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1.25rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-weight: 600;
    color: #334155;
    font-size: 0.95rem;
  }

  .form-input {
    width: 100%;
    padding: 0.65rem 0.85rem;
    border-radius: 0.5rem;
    border: 1px solid #d7dee8;
    background: #ffffff;
    font-size: 0.9rem;
    color: #0f172a;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .form-input:focus {
    outline: none;
    border-color: #93c5fd;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }

  .input-with-action {
    display: flex;
    align-items: center;
    position: relative;
  }

  .input-with-action .form-input {
    padding-right: 2.5rem;
  }

  .toggle-visibility {
    position: absolute;
    right: 0.7rem;
    background: none;
    border: none;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    cursor: pointer;
  }

  .toggle-visibility svg {
    width: 18px;
    height: 18px;
  }

  .select-wrapper {
    position: relative;
  }

  .select-wrapper::after {
    content: '';
    position: absolute;
    right: 0.85rem;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 6px solid #94a3b8;
    pointer-events: none;
  }

  .select-wrapper .form-input {
    appearance: none;
    padding-right: 2rem;
  }

  .form-footer {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .monitoring {
    min-width: 220px;
  }

  .form-actions {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
  }

  .btn-save {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: #16a34a;
    color: #ffffff;
    padding: 0.65rem 1.25rem;
    border-radius: 0.5rem;
    border: none;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(22, 163, 74, 0.25);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .btn-save svg {
    width: 18px;
    height: 18px;
  }

  .btn-save:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 14px rgba(22, 163, 74, 0.3);
  }

  .btn-save:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .btn-outline {
    padding: 0.6rem 1.1rem;
    border-radius: 0.5rem;
    border: 1px solid #d1d5db;
    background: #ffffff;
    color: #475569;
    font-weight: 600;
    cursor: pointer;
  }

  .table-loading {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    color: #475569;
    font-weight: 600;
  }

  .empty-state {
    color: #64748b;
    font-weight: 500;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  .user-table {
    width: 100%;
    border-collapse: collapse;
  }

  .user-table th,
  .user-table td {
    padding: 0.9rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid #eef2f7;
    font-size: 0.92rem;
  }

  .user-table th {
    color: #475569;
    font-weight: 700;
  }

  .name-cell {
    font-weight: 700;
    color: #1f2937;
  }

  .muted {
    color: #64748b;
  }

  .date-cell {
    display: flex;
    flex-direction: column;
    color: #475569;
    line-height: 1.3;
    font-size: 0.85rem;
  }

  .role-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .badge-admin {
    background: #ede9fe;
    color: #6d28d9;
  }

  .badge-op {
    background: #dcfce7;
    color: #15803d;
  }

  .actions {
    display: inline-flex;
    gap: 1rem;
    align-items: center;
  }

  .action-link {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border: none;
    background: none;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
  }

  .action-link svg {
    width: 16px;
    height: 16px;
  }

  .action-link.edit {
    color: #16a34a;
  }

  .action-link.delete {
    color: #ef4444;
  }

  @media (max-width: 1024px) {
    .form-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .users-card {
      padding: 1.5rem;
    }
  }

  @media (max-width: 768px) {
    .form-grid {
      grid-template-columns: 1fr;
    }

    .form-footer {
      flex-direction: column;
      align-items: stretch;
    }

    .form-actions {
      width: 100%;
      justify-content: flex-start;
      flex-wrap: wrap;
    }

    .btn-save,
    .btn-outline {
      width: 100%;
      justify-content: center;
    }

    .user-table th,
    .user-table td {
      padding: 0.75rem 0.5rem;
      font-size: 0.85rem;
    }

    .actions {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>
