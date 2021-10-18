<script lang="ts">
  import { hoveredPlayer, selectedPlayer } from "./stores.js";
  import type { Player } from "./rolls.js";
  export let player: Player;
</script>

<span
  class="badge badge-pill pill-team-{player.team.id}"
  on:click={() => {
    selectedPlayer.set(player.id);
  }}
  on:mouseover={() => {
    hoveredPlayer.set(player.id);
  }}
  on:mouseleave={() => {
    hoveredPlayer.set(undefined);
  }}>{player.name}</span
>

<style>
  .pill-team-away {
    background-color: var(--away-color-2);
    color: var(--away-gray-9);
  }
  .pill-team-home {
    background-color: var(--home-color-2);
    color: var(--home-gray-9);
  }
  .badge-pill {
    font-size: 85%;
  }
</style>
