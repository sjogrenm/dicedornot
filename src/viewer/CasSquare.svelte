<script>
  import Player from "./Player.svelte";
  import { Popover } from "sveltestrap";
  import SelectedPlayer from "./SelectedPlayer.svelte";
  import { selectedPlayer } from "../stores.js";
  import {SITUATION, Casualties} from "../constants.js";
  import {translateStringNumberList} from "../replay-utils.js";
  export let team, dugout, row, column, width, height, casType, send, receive;
  let player = null,
    players,
    id, cas = null;

  $: {
    id = `${team}-${casType}-${row}-${column}`;
    if (dugout) {
      if (casType == "ko") {
        players = dugout["cas"].slice(width * height).concat(dugout[casType]);
      } else if (casType == "reserve") {
        players = dugout["ko"].slice(width * height).concat(dugout[casType]);
      } else {
        players = dugout[casType];
      }
      player = players[column * height + row];
    }

    if (player && player.data.Situation >= SITUATION.Casualty) {
      if (player.data.Situation === SITUATION.Casualty) {
        cas =
          Casualties[
            Math.max(...translateStringNumberList(player.data.ListCasualties))
          ].icon;
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
    console.log("Clicked player", { player });
    $selectedPlayer = player;
  }}
>
  {#if player}
    <Player {...player} {send} {receive} />
    {#if cas}
      <img class="cas" src={`/images/skills/${cas}.png`} alt={cas} />
    {/if}
  {/if}
</div>

{#if player}
  <Popover
    trigger="hover"
    placement={team == "home" ? "bottom" : "top"}
    target={id}
  >
    <div class="player-card">
      <SelectedPlayer {player} />
    </div>
  </Popover>
{/if}

<style>
  .cas-square {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    position: relative;
  }

  .cas{
    position: absolute;
    bottom: -5px;
    right: -5px;
    width: 50%;
    height: 50%;
    z-index: 10;
  }
</style>
