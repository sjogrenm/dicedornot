<script lang="ts">
  import Roll from "./Roll.svelte";
  import { replayPreview } from "./stores.js";
  import type {Action} from "./rolls.js";
  export let actions: Action[], selectedAction: number;
</script>

<div class="list-group" id="turn" on:mouseleave={() => (replayPreview.set(undefined))}>
  {#each actions as action (action.actionIndex)}
    <div
      class={`list-group-item list-group-item-action team-${action.activeTeam?.id || 'home'}`}
      class:active={selectedAction == action.actionIndex}
      on:mouseover={() => (replayPreview.set({start: action.startIndex, end: action.endIndex}))}
    >
      <Roll {action} selected={selectedAction == action.actionIndex} />
    </div>
  {/each}
</div>

<style>
  .list-group-item.team-away:hover {
    background-color: var(--away-color-1);
    color: var(--away-gray-8);
  }
  .list-group-item.team-home:hover {
    background-color: var(--home-color-1);
    color: var(--home-gray-8);
  }
  .list-group-item.team-away {
    background-color: var(--away-color-0);
    color: var(--away-gray-7);
  }
  .list-group-item.team-home {
    background-color: var(--home-color-0);
    color: var(--home-gray-7);
  }

  .list-group-item.team-away.active {
    background-color: var(--away-color-2);
    color: var(--away-gray-9);
  }
  .list-group-item.team-home.active {
    background-color: var(--home-color-2);
    color: var(--home-gray-9);
  }
</style>
