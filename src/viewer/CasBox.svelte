<script lang="ts">
  import Grid from "./Grid.svelte";
  import CasSquare from "./CasSquare.svelte";
  import type { Dugout, PlayerDefinitions, PlayerProperties } from "./types.js";
  import type {PlayerStates, Side} from "../replay/Internal.js";
  export let
    team: Side,
    casType: keyof Dugout,
    dugout: Dugout,
    playerDefs: PlayerDefinitions,
    playerStates: PlayerStates,
    playerProperties: PlayerProperties;
  let width = 4,
    height = 2;

  function playerInSquare(row: number, column: number) {
    if (dugout) {
      let players;
      if (casType == "ko") {
        players = dugout["cas"].slice(width * height).concat(dugout[casType]);
      } else if (casType == "reserve") {
        players = dugout["ko"].slice(width * height).concat(dugout[casType]);
      } else {
        players = dugout[casType];
      }
      let playerNumber = players[column * height + row];
      const playerDef = playerDefs[playerNumber];
      const playerState = playerStates[playerNumber];
      const playerProps = playerProperties[playerNumber];
      return {playerDef, playerState, playerProps};
    } else {
      return {}
    }
  }
</script>

<div class={`bench ${casType}`}>
  <Grid {width} {height} let:row let:column>
    <CasSquare
      {team}
      {casType}
      {row}
      {column}
      {...playerInSquare(row, column)}
    />
  </Grid>
</div>

<style>
</style>
