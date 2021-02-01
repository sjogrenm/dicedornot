<script>
  import Grid from "./Grid.svelte";
  import PitchSquare from "./PitchSquare.svelte";
  export let homeTeam, awayTeam, pitch, send, receive;

  let homeLogo, awayLogo;
  $: {
    homeLogo = homeTeam.logo;
    awayLogo = awayTeam.logo;
  }
</script>

<div class="pitch">
  <Grid width={26} height={15} let:row let:column>
    <PitchSquare
      {homeLogo}
      {awayLogo}
      {pitch}
      {send}
      {receive}
      {row}
      {column}
    />
  </Grid>
</div>

<style>
  .pitch {
    left: 1.25%;
    width: 97.5%;
    position: relative;
  }
</style>
