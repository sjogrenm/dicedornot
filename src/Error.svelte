<script lang="ts">
  import {error} from './stores.js';
</script>

{#if $error}
  <div class="alert alert-danger" role="alert" id="data-param-error">
    <span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true" />
    <span class="sr-only">Error:</span>
    {#if $error.stack}
    <details>
      <summary>{$error}</summary>
      <pre>{$error.stack}</pre>
    </details>
    {:else}
    {$error}
    {/if}
  </div>
{/if}

<style>
  #data-param-error {
    margin-top: 20px;
  }
</style>
