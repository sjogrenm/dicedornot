<script>
  import Grid from './Grid.svelte';
  import CasSquare from './CasSquare.svelte';
  export let pitchPlayers, team, casType, dugout, send, receive;
  let width = 4, height = 2;
</script>

<div class={`bench ${casType}`}>
  <Grid {width} {height} let:row let:column>
    <CasSquare {pitchPlayers} {team} {width} {height} {send} {receive} {casType} {dugout} {row} {column}></CasSquare>
  </Grid>
</div>

<style>
</style>
