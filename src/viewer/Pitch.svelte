<script lang="ts">
  import Grid from "./Grid.svelte";
  import PitchSquare from "./PitchSquare.svelte";
  import FixedRatio from "./FixedRatio.svelte";
  import Overlay from "./Overlay.svelte";
  import {replayPreview} from "../stores.js";
  export let pitchPlayers, homeTeam, awayTeam, pitch, send, receive;

  let homeLogo, awayLogo;
  $: {
    homeLogo = homeTeam.logo;
    awayLogo = awayTeam.logo;
  }
</script>

<div class="pitch">
  <Grid width={26} height={15} let:row let:column>
    <PitchSquare
      {pitchPlayers}
      {homeLogo}
      {awayLogo}
      {pitch}
      {send}
      {receive}
      {row}
      {column}
    />
  </Grid>
  {#if $replayPreview}
    <div class="overlay">
      <FixedRatio width={26} height={15}>
        <Overlay/>
      </FixedRatio>
    </div>
  {/if}
</div>

<style>
  .pitch {
    left: calc(18/1336*100%);
    width: calc(1300/1336*100%);
    position: relative;
  }
  .overlay {
    width: 100%;
    height: 100%;
    top: 0;
    position: absolute;
  }
</style>
