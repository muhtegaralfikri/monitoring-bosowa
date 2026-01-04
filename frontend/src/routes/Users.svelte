<script lang="ts">
  import { onMount } from 'svelte'
  import { userService } from '../lib/services/user.service'
  import { toast } from '../lib/stores/toast'
  import { isAdmin } from '../lib/stores/auth'
  import { formatDateTime } from '../lib/utils/format'
  import type { User } from '../lib/types'

  let users = $state<User[]>([])
  let loading = $state(true)
  let showModal = $state(false)
  let editingUser = $state<User | null>(null)
  let isSubmitting = $state(false)

  // Form state
  let formData = $state({
    email: '',
    name: '',
    password: '',
    role: 2, // 1 = admin, 2 = operasional
    location: 1, // 1 = GENSET, 2 = TUG_ASSIST
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

  function openAddModal() {
    editingUser = null
    formData = {
      email: '',
      name: '',
      password: '',
      role: 2,
      location: 1,
      isActive: true,
    }
    showModal = true
  }

  function openEditModal(user: User) {
    editingUser = user
    formData = {
      email: user.email,
      name: user.name,
      password: '',
      role: user.role,
      location: user.location || 1,
      isActive: user.isActive,
    }
    showModal = true
  }

  function closeModal() {
    showModal = false
    editingUser = null
  }

  function handleModalClick(event: MouseEvent) {
    event.stopPropagation()
  }

  async function handleSubmit() {
    if (!formData.email || !formData.name || (!editingUser && !formData.password)) {
      toast.error('Email, nama, dan password harus diisi')
      return
    }

    try {
      isSubmitting = true

      if (editingUser) {
        // Update existing user
        await userService.updateUser(editingUser.id, {
          email: formData.email,
          name: formData.name,
          role: formData.role,
          location: formData.location,
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
          location: formData.location,
        })
        toast.success('User berhasil ditambahkan')
      }

      closeModal()
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
    if (!location) return '-'
    return location === 1 ? 'GENSET' : 'TUG ASSIST'
  }
</script>

<div class="users-page">
  <div class="page-header">
    <h1>Manajemen User</h1>
    <button class="btn btn-primary" onclick={openAddModal}>+ Tambah User</button>
  </div>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  {:else}
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Nama</th>
            <th>Email</th>
            <th>Role</th>
            <th>Lokasi</th>
            <th>Status</th>
            <th>Dibuat</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {#each users as user}
            <tr>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>
                <span class="badge {getRoleBadge(user.role)}">
                  {getRoleName(user.role)}
                </span>
              </td>
              <td>{getLocationName(user.location)}</td>
              <td>
                <span class="status-badge {user.isActive ? 'active' : 'inactive'}">
                  {user.isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              </td>
              <td>{formatDateTime(user.createdAt)}</td>
              <td>
                <div class="actions">
                  <button class="btn-icon" onclick={() => openEditModal(user)} title="Edit">
                    ✏️
                  </button>
                  <button class="btn-icon btn-danger" onclick={() => handleDelete(user)} title="Hapus">
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if showModal}
    <div
      class="modal-overlay"
      role="presentation"
      onclick={closeModal}
      onkeydown={(e) => e.key === 'Escape' && closeModal()}
    >
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabindex="-1"
        onclick={handleModalClick}
        onkeydown={(e) => e.key === 'Escape' && closeModal()}
      >
        <div class="modal-header">
          <h2 id="modal-title">{editingUser ? 'Edit User' : 'Tambah User Baru'}</h2>
          <button class="btn-close" onclick={closeModal} aria-label="Tutup modal">✕</button>
        </div>

        <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <div class="modal-body">
            <div class="form-group">
              <label for="name">Nama</label>
              <input
                id="name"
                type="text"
                class="input"
                bind:value={formData.name}
                placeholder="Nama lengkap"
                required
              />
            </div>

            <div class="form-group">
              <label for="email">Email</label>
              <input
                id="email"
                type="email"
                class="input"
                bind:value={formData.email}
                placeholder="email@example.com"
                required
              />
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <input
                id="password"
                type="password"
                class="input"
                bind:value={formData.password}
                placeholder={editingUser ? 'Kosongkan jika tidak diubah' : 'Password minimal 6 karakter'}
                minlength={editingUser ? undefined : 6}
                required={!editingUser}
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="role">Role</label>
                <select id="role" class="input" bind:value={formData.role}>
                  <option value={1}>Admin</option>
                  <option value={2}>Operasional</option>
                </select>
              </div>

              <div class="form-group">
                <label for="location">Lokasi</label>
                <select id="location" class="input" bind:value={formData.location}>
                  <option value={1}>GENSET</option>
                  <option value={2}>TUG ASSIST</option>
                </select>
              </div>
            </div>

            {#if editingUser}
              <div class="form-group">
                <label>
                  <input type="checkbox" bind:checked={formData.isActive} />
                  Aktif
                </label>
              </div>
            {/if}
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick={closeModal}>Batal</button>
            <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
              {#if isSubmitting}
                <span class="spinner-small"></span>
                Menyimpan...
              {:else}
                {editingUser ? 'Simpan Perubahan' : 'Tambah User'}
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>

<style>
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .table-container {
    background: var(--surface, #ffffff);
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow-x: auto;
  }

  .table {
    width: 100%;
    border-collapse: collapse;
  }

  .table th,
  .table td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--border, #e2e8f0);
  }

  .table th {
    font-weight: 600;
    color: var(--text-muted, #64748b);
    background: var(--bg, #f8fafc);
  }

  .badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .badge-admin {
    background: #dbeafe;
    color: #1e40af;
  }

  .badge-op {
    background: #e2e8f0;
    color: #475569;
  }

  .status-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .status-badge.active {
    background: #dcfce7;
    color: #166534;
  }

  .status-badge.inactive {
    background: #fee2e2;
    color: #991b1b;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-icon {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 0.25rem;
    background: white;
    cursor: pointer;
    font-size: 1rem;
  }

  .btn-icon:hover {
    background: var(--bg, #f8fafc);
  }

  .btn-danger:hover {
    background: #fee2e2;
    border-color: #ef4444;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: var(--surface, #ffffff);
    border-radius: 0.5rem;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border, #e2e8f0);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  .btn-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text-muted, #64748b);
  }

  .modal-body {
    padding: 1.5rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border, #e2e8f0);
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
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 768px) {
    .page-header {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }

    .page-header .btn {
      width: 100%;
    }

    .table th,
    .table td {
      padding: 0.5rem 0.625rem;
      font-size: 0.8125rem;
    }

    .table th:not(:first-child):not(:last-child),
    .table td:not(:first-child):not(:last-child) {
      white-space: nowrap;
    }

    .modal {
      max-width: 100%;
      height: 100%;
      max-height: 100vh;
      border-radius: 0;
    }

    .modal-header {
      padding: 0.875rem 1rem;
    }

    .modal-header h2 {
      font-size: 1.125rem;
    }

    .modal-body {
      padding: 1rem;
    }

    .form-row {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }

    .modal-footer {
      padding: 0.875rem 1rem;
      flex-direction: column-reverse;
    }

    .modal-footer .btn {
      width: 100%;
    }

    .actions {
      flex-direction: column;
      gap: 0.25rem;
    }
  }
</style>
