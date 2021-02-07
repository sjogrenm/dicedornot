<script>
  export let error;
</script>

{#if error}
  <div class="alert alert-danger" role="alert" id="data-param-error">
    <span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true" />
    <span class="sr-only">Error:</span>
    {error}
  </div>
{/if}

<style>
  #data-param-error {
    margin-top: 20px;
  }
</style>
