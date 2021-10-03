<svelte:options immutable/>
<script lang="ts">
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
    let id: string, kickoffTarget: boolean | undefined = false;

  $: {
    id = `pitch-${row}-${column}`;
    kickoffTarget = ball && ('futurePositions' in ball);
    if (ball) {
      console.log(ball, kickoffTarget);
    }
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
  {#if cell || kickoffTarget}
    <Cell {...cell} {row} {column} {kickoffTarget}/>
  {/if}
  {#if playerDef}
    <Player {playerDef} {playerState} {playerProps} />
  {/if}
  {#if dice}
    <DiceResult {dice} />
  {/if}
  {#if foul}
    <Foul />
  {/if}
  {#if ball && !('futurePositions' in ball)}
    <Ball held={'heldBy' in ball}/>
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
