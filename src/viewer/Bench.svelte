<script lang="ts">
  import CasBox from "./CasBox.svelte";
  import type { Dugout, PlayerDefinitions, PlayerProperties } from "./types.js";
  import type {PlayerStates, Side} from "../replay/Internal.js";
  export let playerDefs: PlayerDefinitions,
    playerStates: PlayerStates,
    playerProperties: PlayerProperties,
    playerPositions: Record<string, number>,
    side: Side;
  const casTypes: (keyof Dugout)[] = ["cas", "ko", "reserve"];
</script>

<div class="bench {side}">
  {#each casTypes as casType}
  <CasBox
    team={side}
    {casType}
    {playerDefs}
    {playerStates}
    {playerProperties}
    {playerPositions}
  />
  {/each}
</div>

<style>
  .bench.home {
    width: calc(600 / 1338 * 100%);
    left: 2.1%;
    top: 4.7%;
    position: absolute;
    display: grid;
    grid-template-columns: repeat(3, auto);
    grid-template-rows: 1;
  }
  .bench.away {
    width: calc(600 / 1338 * 100%);
    right: calc((1338 - 1316) / 1338 * 100%);
    bottom: 5%;
    position: absolute;
    display: grid;
    grid-template-columns: repeat(3, auto);
    grid-template-rows: 1;
  }
</style>
