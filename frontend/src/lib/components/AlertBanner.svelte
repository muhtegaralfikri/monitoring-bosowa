<script lang="ts">
  import type { Alert } from '../types'

  interface Props {
    alerts: Alert[]
    onDismiss?: (() => void)
  }

  let { alerts = [], onDismiss }: Props = $props()
</script>

{#if alerts.length > 0}
  <div class="alert-banner">
    {#each alerts as alert}
      <div class="alert-item {alert.type || 'warning'}">
        <span class="alert-icon">⚠️</span>
        <span class="alert-message">{alert.message}</span>
        {#if onDismiss}
          <button class="alert-dismiss" onclick={onDismiss}>×</button>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .alert-banner {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .alert-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: 0.5rem;
    animation: slideIn 0.3s ease-out;
  }

  .alert-item.warning {
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
  }

  .alert-item.danger {
    background: #fee2e2;
    border-left: 4px solid #ef4444;
  }

  .alert-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .alert-message {
    flex: 1;
    font-weight: 500;
    font-size: 0.875rem;
  }

  .alert-item.warning .alert-message {
    color: #78350f;
  }

  .alert-item.danger .alert-message {
    color: #991b1b;
  }

  .alert-dismiss {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    opacity: 0.6;
    padding: 0;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .alert-dismiss:hover {
    opacity: 1;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
