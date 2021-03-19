<script>
  import { selectedPlayer, hoveredPlayer } from "../stores.js";
  import Ball from "./Ball.svelte";
  import Cell from "./Cell.svelte";
  import DiceResult from "./DiceResult.svelte";
  import Foul from "./Foul.svelte";
  import Player from "./Player.svelte";
  import TeamLogo from "./TeamLogo.svelte";
  export let pitchPlayers, row, column, pitch, homeLogo, awayLogo, send, receive;
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
    $selectedPlayer = player;
  }}
  on:mouseover={() => {
    $hoveredPlayer = player;
  }}
  on:mouseleave={() => {
    $hoveredPlayer = null;
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
    <Player {...pitchPlayers[player]} {send} {receive} />
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
