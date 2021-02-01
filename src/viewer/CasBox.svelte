<script>
  import Grid from './Grid.svelte';
  import CasSquare from './CasSquare.svelte';
  export let casType, dugout, send, receive;
</script>

<div class={`bench ${casType}`}>
  <Grid width={4} height={2} prefix={casType} component={CasSquare} componentProps={{casType, dugout, send, receive}}/>
</div>

<style>
</style>
