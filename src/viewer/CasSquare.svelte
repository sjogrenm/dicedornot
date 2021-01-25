<script>
  import Player from "./Player.svelte";
  import { homeTeam, awayTeam } from "../stores.js";
  export let id, row, column, width, height, casType, team;
  let player = null, dugout, players;

  $: {
    dugout = team == 'home' ? $homeTeam.dugout : $awayTeam.dugout;
    if (casType == 'ko') {
      players = dugout['cas'].slice(width*height).concat(dugout[casType]);
    } else if (casType == 'reserve') {
      players = dugout['ko'].slice(width*height).concat(dugout[casType]);
    } else {
      players = dugout[casType];
    }
    player = players[column*height + row];
  };
</script>

<div {id} class="pitch-square">
  {#if player}
    <Player {...player} />
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
