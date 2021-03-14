<script>
  import Roll from "./Roll.svelte";
  import { replayPreview } from "./stores.js";
  export let rolls, selectedRoll;
</script>

<div class="list-group" id="turn" on:mouseleave={() => ($replayPreview = null)}>
  {#each rolls as roll (roll.rollIndex)}
    <div
      class={`list-group-item list-group-item-action team-${roll.activeTeam.id}`}
      class:active={selectedRoll == roll.rollIndex}
      on:mouseover={() => ($replayPreview = {start: roll.startIndex, end: roll.endIndex})}
    >
      <Roll {roll} selected={selectedRoll == roll.rollIndex} />
    </div>
  {/each}
</div>

<style>
  .list-group-item.team-1:hover {
    background-color: var(--team1-color-1);
    color: var(--team1-gray-8);
  }
  .list-group-item.team-0:hover {
    background-color: var(--team0-color-1);
    color: var(--team0-gray-8);
  }
  .list-group-item.team-1 {
    background-color: var(--team1-color-0);
    color: var(--team1-gray-7);
  }
  .list-group-item.team-0 {
    background-color: var(--team0-color-0);
    color: var(--team0-gray-7);
  }

  .list-group-item.team-1.active {
    background-color: var(--team1-color-2);
    color: var(--team1-gray-9);
  }
  .list-group-item.team-0.active {
    background-color: var(--team0-color-2);
    color: var(--team0-gray-9);
  }
</style>
