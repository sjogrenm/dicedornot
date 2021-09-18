<svelte:options immutable/>
<script lang="ts">
  import {afterUpdate, onMount} from "svelte";
  import { selectedPlayer, hoveredPlayer } from "../stores.js";
  import Ball from "./Ball.svelte";
  import Cell from "./Cell.svelte";
  import DiceResult from "./DiceResult.svelte";
  import Foul from "./Foul.svelte";
  import Player from "./Player.svelte";
  import TeamLogo from "./TeamLogo.svelte";
  import type { BallProps, PitchSquareProps, PlayerProps } from "./types.js";
  import type { Player as IPlayer, PlayerState } from "../replay/Internal";
  export let
    row: number,
    column: number,
    homeLogo: string,
    awayLogo: string,
    playerDef: IPlayer | undefined = undefined,
    playerState: PlayerState | undefined = undefined,
    playerProps: PlayerProps | undefined = undefined,
    cell: PitchSquareProps["cell"] = undefined,
    ball: BallProps | undefined = undefined,
    dice: PitchSquareProps["dice"] = undefined,
    foul: PitchSquareProps["foul"] = false;
    let id: string;

  $: {
    id = `pitch-${row}-${column}`;
  }

	// afterUpdate(() => {
	// 	console.debug(`Updated PitchSquare ${id}`, player, cell);
	// });

	// onMount(() => {
	// 	console.debug(`Mounted PitchSquare ${id}`);
	// });
</script>

<div
  class="pitch-square"
  {id}
  on:click={() => {
    selectedPlayer.set(playerDef?.id.number);
  }}
  on:mouseover={() => {
    hoveredPlayer.set(playerDef?.id.number);
  }}
  on:mouseleave={() => {
    hoveredPlayer.set(undefined);
  }}
>
  {#if column == 0 && row == 7 && homeLogo}
    <TeamLogo logo={homeLogo.toLowerCase()} />
  {/if}
  {#if column == 25 && row == 7 && awayLogo}
    <TeamLogo logo={awayLogo.toLowerCase()} />
  {/if}
  {#if cell}
    <Cell {...cell} {row} {column} />
  {/if}
  {#if playerDef && playerState}
    <Player {playerDef} {playerState} {playerProps} />
  {/if}
  {#if dice}
    <DiceResult {dice} />
  {/if}
  {#if foul}
    <Foul />
  {/if}
  {#if ball}
    <Ball held={ball.held}/>
  {/if}
</div>

<style>
  .pitch-square {
    border: 0.05vh dashed rgba(255, 255, 255, 0.2);
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    position: relative;
  }
</style>
