<script>
  import { Popover } from "sveltestrap";
  import { selectedPlayer } from "../stores.js";
  import Ball from "./Ball.svelte";
  import Cell from "./Cell.svelte";
  import DiceResult from "./DiceResult.svelte";
  import Foul from "./Foul.svelte";
  import Player from "./Player.svelte";
  import SelectedPlayer from "./SelectedPlayer.svelte";
  import TeamLogo from "./TeamLogo.svelte";
  export let row, column, pitch, homeLogo, awayLogo, send, receive;
  let player = null,
    cell = null,
    ball = null,
    dice = null,
    foul = false,
    id;

  $: {
    ({ player, cell, ball, dice, foul } = pitch[`${column}-${row}`] || {});
    id = `pitch-${row}-${column}`;
  }
</script>

<div
  class="pitch-square"
  {id}
  on:click={() => {
    console.log("Clicked player", { player });
    $selectedPlayer = player;
  }}
>
  {#if column == 0 && row == 7 && homeLogo}
    <TeamLogo logo={homeLogo.toLowerCase()} />
  {/if}
  {#if column == 25 && row == 7 && awayLogo}
    <TeamLogo logo={awayLogo.toLowerCase()} />
  {/if}
  {#if cell}
    <Cell {...cell} {send} {receive} {row} {column} />
  {/if}
  {#if player}
    <Player {...player} {send} {receive} />
  {/if}
  {#if dice}
    <DiceResult {dice} />
  {/if}
  {#if foul}
    <Foul />
  {/if}
  {#if ball}
    <Ball {...ball} {send} {receive} />
  {/if}
</div>

{#if player}
  <Popover trigger="hover" placement="right" target={id}>
    <div class="player-card">
      <SelectedPlayer {player} />
    </div>
  </Popover>
{/if}

<style>
  .player-card {
    width: 10vw;
  }
  .pitch-square {
    border: 1.5px dashed rgba(255, 255, 255, 0.31);
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    position: relative;
  }
</style>
