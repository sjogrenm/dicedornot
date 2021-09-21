<script lang="ts">
  import Grid from "./Grid.svelte";
  import CasSquare from "./CasSquare.svelte";
  import type { Dugout, PlayerDefinitions, PlayerProperties } from "./types.js";
  import type {PlayerStates, Side} from "../replay/Internal.js";
  export let
    team: Side,
    casType: keyof Dugout,
    playerDefs: PlayerDefinitions,
    playerStates: PlayerStates,
    playerProperties: PlayerProperties,
    playerPositions: Record<string, number>;
  let width = 4,
    height = 2;

  $: squares = Object.fromEntries([...Array(width).keys()].flatMap(column => {
    return [...Array(height).keys()].map(row => {
      let playerNumber = column * height + row;
      const player = playerPositions[`${team}-${casType}-${playerNumber}`];
      if (player) {
        const playerDef = playerDefs[player];
        const playerState = playerStates[player];
        const playerProps = playerProperties[player];
        return [`${row}-${column}`, {playerDef, playerState, playerProps}];
      } else {
        return [`${row}-${column}`, {}];
      }
    })
  }));
</script>

<div class={`bench ${casType}`}>
  <Grid {width} {height} let:row let:column>
    <CasSquare
      {team}
      {casType}
      {row}
      {column}
      {...squares[`${row}-${column}`]}
    />
  </Grid>
</div>

<style>
</style>
