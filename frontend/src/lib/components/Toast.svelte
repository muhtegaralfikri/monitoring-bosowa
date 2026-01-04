<script lang="ts">
  import { toast } from '../stores/toast'

  const toastClass = (type: string) => {
    switch (type) {
      case 'success': return 'toast-success'
      case 'error': return 'toast-error'
      case 'warning': return 'toast-warning'
      default: return 'toast-info'
    }
  }
</script>

<div class="toast-container">
  {#each $toast as t (t.id)}
    <div class="toast {toastClass(t.type)}">
      {t.message}
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .toast {
    padding: 0.75rem 1rem;
    border-radius: 0.375rem;
    color: white;
    font-size: 0.875rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.3s ease-out;
    min-width: 250px;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .toast-success {
    background: var(--success, #22c55e);
  }

  .toast-error {
    background: var(--danger, #ef4444);
  }

  .toast-warning {
    background: var(--warning, #f59e0b);
  }

  .toast-info {
    background: var(--primary, #2563eb);
  }
</style>
