<script>
  import TeamLogo from "./TeamLogo.svelte";
  import Cell from "./Cell.svelte";
  import Player from "./Player.svelte";
  import Ball from "./Ball.svelte";
  import { pitch, homeTeam, awayTeam } from "../stores.js";
  export let id, row, column;
  let player = null,
    cell = null,
    ball = null;

  $: {
    ({ player, cell, ball } = $pitch[row][column]);
  };
</script>

<div {id} class="pitch-square">
  {#if column == 0 && row == 7 && $homeTeam.logo}
    <TeamLogo logo={$homeTeam.logo.toLowerCase()} />
  {/if}
  {#if column == 25 && row == 7 && $awayTeam.logo}
    <TeamLogo logo={$awayTeam.logo.toLowerCase()} />
  {/if}
  {#if cell}
    <Cell {...cell} />
  {/if}
  {#if player}
    <Player {...player} />
  {/if}
  {#if ball}
    <Ball {...ball} />
  {/if}
</div>

<style>
  .pitch-square {
    border: 1px dashed rgba(170, 173, 179, 0.31);
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    -webkit-box-pack: center;
    -ms-flex-pack: center;
    justify-content: center;
    -webkit-box-align: center;
    -ms-flex-align: center;
    align-items: center;
    width: 100%;
    height: 100%;
    position: relative;
  }
</style>
