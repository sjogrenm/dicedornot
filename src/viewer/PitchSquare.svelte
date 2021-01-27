<script>
  import TeamLogo from "./TeamLogo.svelte";
  import Cell from "./Cell.svelte";
  import Player from "./Player.svelte";
  import Ball from "./Ball.svelte";
  import DiceResult from "./DiceResult.svelte";
  import About from "../About.svelte";
  export let id, row, column, width, height, pitch, homeLogo, awayLogo;
  let player = null,
    cell = null,
    ball = null,
    dice = null;

  $: {
    ({ player, cell, ball, dice } = pitch[`${column}-${row}`] || {});
  };
</script>

<div {id} class="pitch-square">
  {#if column == 0 && row == 7 && homeLogo}
    <TeamLogo logo={homeLogo.toLowerCase()} />
  {/if}
  {#if column == 25 && row == 7 && awayLogo}
    <TeamLogo logo={awayLogo.toLowerCase()} />
  {/if}
  {#if cell}
    <Cell {...cell} />
  {/if}
  {#if player}
    <Player {...player} />
  {/if}
  {#if dice}
    <DiceResult {dice} />
  {/if}
  {#if ball}
    <Ball {...ball} />
  {/if}
</div>

<style>
  .pitch-square {
    border: 1.5px dashed rgba(255, 255, 255, 0.31);
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
