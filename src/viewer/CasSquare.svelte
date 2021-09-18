<svelte:options immutable/>
<script lang="ts">
  import Player from "./Player.svelte";
  import { selectedPlayer, hoveredPlayer } from "../stores.js";
  import { SITUATION, Casualties } from "../constants.js";
  import type { Dugout, PlayerProps } from "./types";
  import type { Player as IPlayer, PlayerState, Side } from "../replay/Internal";
  export let
    team: Side,
    row: number,
    column: number,
    casType: keyof Dugout,
    playerDef: IPlayer | undefined = undefined,
    playerState: PlayerState | undefined = undefined,
    playerProps: PlayerProps | undefined = undefined;
  let
    id: string,
    cas: string | undefined = undefined;

  $: {
    id = `${team}-${casType}-${row}-${column}`;

    if (playerState && (playerState.situation>= SITUATION.Casualty)) {
      if (playerState.situation === SITUATION.Casualty) {
        cas =
          Casualties[
            Math.max(...(playerState.casualties || [])) - 1
          ]?.icon;
        if (!cas) {
          console.log("Couldn't find cas icon", {playerState, Casualties})
        }
      } else {
        cas = "Expelled";
      }
    }
  }
</script>

<div
  class="cas-square"
  {id}
  on:click={() => {
    selectedPlayer.set(playerDef && playerDef.id.number);
  }}
  on:mouseover={() => {
    hoveredPlayer.set(playerDef && playerDef.id.number);
  }}
  on:mouseleave={() => {
    hoveredPlayer.set(undefined);
  }}
>
  {#if playerDef && playerState && playerProps}
    <Player {playerDef} {playerState} {playerProps} />
    {#if cas}
      <img class="cas" src={`/images/skills/${cas}.png`} alt={cas} />
    {/if}
  {/if}
</div>

<style>
  .cas-square {
    border: 0.05vh dashed rgba(255, 255, 255, 0.2);
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    position: relative;
  }

  .cas {
    position: absolute;
    bottom: -5px;
    right: -5px;
    width: 50%;
    height: 50%;
    z-index: 10;
  }
</style>
