<script lang="ts">
  import {afterUpdate, onMount} from "svelte";

  import Grid from "./Grid.svelte";
  import PitchSquare from "./PitchSquare.svelte";
  import FixedRatio from "./FixedRatio.svelte";
  import Overlay from "./Overlay.svelte";
  import { replayPreview } from "../stores.js";
  import type { Team, Pitch, BallProps, PlayerDefinitions, PlayerProperties } from "./types.js";
  import type * as Internal from "../replay/Internal.js";
  import {cellString} from "../replay/Internal.js";
  export let teams: Internal.ByTeam<Team>,
    pitch: Pitch,
    playerPositions: Record<string, number>,
    playerDefinitions: PlayerDefinitions,
    playerProperties: PlayerProperties,
    playerStates: Internal.PlayerStates,
    ball: BallProps;

  let homeLogo: string, awayLogo: string;

  $: {
    homeLogo = teams.home.logo;
    awayLogo = teams.away.logo;
    console.log(playerPositions);
  }

	// afterUpdate(() => {
	// 	console.debug(`Updated Pitch ${JSON.stringify(playerPositions)}`);
	// });
</script>

<div class="pitch">
  <Grid width={26} height={15} let:row let:column>
    <PitchSquare
      {homeLogo}
      {awayLogo}
      {row}
      {column}
      {...(pitch[cellString({x: column, y: row})] || {})}
      playerDef={playerDefinitions[playerPositions[cellString({x: column, y: row})]]}
      playerState={playerStates[playerPositions[cellString({x: column, y: row})]]}
      playerProps={playerProperties[playerPositions[cellString({x: column, y: row})]]}
      ball={ball?.position?.x == column && ball?.position?.y == row ? ball : undefined}
    />
  </Grid>
  {#if $replayPreview}
    <div class="overlay">
      <FixedRatio width={26} height={15}>
        <Overlay />
      </FixedRatio>
    </div>
  {/if}
</div>

<style>
  .pitch {
    left: calc(18 / 1336 * 100%);
    width: calc(1300 / 1336 * 100%);
    position: relative;
  }
  .overlay {
    width: 100%;
    height: 100%;
    top: 0;
    position: absolute;
  }
</style>
