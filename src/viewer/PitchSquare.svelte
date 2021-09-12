<script lang="ts">
  import {afterUpdate, onMount} from "svelte";
  import { selectedPlayer, hoveredPlayer } from "../stores.js";
  import Ball from "./Ball.svelte";
  import Cell from "./Cell.svelte";
  import DiceResult from "./DiceResult.svelte";
  import Foul from "./Foul.svelte";
  import Player from "./Player.svelte";
  import TeamLogo from "./TeamLogo.svelte";
  import type { PitchCellProps, Pitch } from "./types.js";
  export let
    row: number,
    column: number,
    homeLogo: string,
    awayLogo: string,
    player: PitchCellProps["player"] = undefined,
    cell: PitchCellProps["cell"] = undefined,
    ball: PitchCellProps["ball"] = undefined,
    dice: PitchCellProps["dice"] = undefined,
    foul: PitchCellProps["foul"] = false;
    let id: string;

  $: {
    id = `pitch-${row}-${column}`;
  }

	afterUpdate(() => {
		console.log(`Updated PitchSquare ${id}`);
	});

	onMount(() => {
		console.log(`Mounted PitchSquare ${id}`);
	});
</script>

<div
  class="pitch-square"
  {id}
  on:click={() => {
    $selectedPlayer = player;
  }}
  on:mouseover={() => {
    $hoveredPlayer = player;
  }}
  on:mouseleave={() => {
    $hoveredPlayer = undefined;
  }}
>
  {#if column == 0 && row == 7 && homeLogo}
    <TeamLogo logo={homeLogo.toLowerCase()} />
  {/if}
  {#if column == 25 && row == 7 && awayLogo}
    <TeamLogo logo={awayLogo.toLowerCase()} />
  {/if}
  {#if cell}
    <Cell {...cell}{row} {column} />
  {/if}
  {#if player}
    <Player {player}/>
  {/if}
  {#if dice}
    <DiceResult {dice} />
  {/if}
  {#if foul}
    <Foul />
  {/if}
  {#if ball}
    <Ball {...ball}/>
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
