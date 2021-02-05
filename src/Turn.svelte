<script>
  import Roll from "./Roll.svelte";
  import {replayStart, replayEnd} from "./stores.js";
  export let rolls, selectedRoll;
  function handleClick(roll) {
    return () => {
      $replayStart = roll.startIndex;
      $replayEnd = roll.endIndex;
    };
  }
</script>

<div class="list-group">
  {#each rolls as roll (roll.rollIndex)}
    <button
      class={`list-group-item list-group-item-action team-${roll.activeTeam.id}`}
      class:active={selectedRoll == roll.rollIndex}
      on:click={handleClick(roll)}
    >
      <Roll {roll} selected={selectedRoll == roll.rollIndex} />
    </button>
  {/each}
</div>

<style>
  .list-group-item.team-1 {
    background-color: var(--team1-color-0);
    color: var(--team1-gray-7);
  }
  .list-group-item.team-0 {
    background-color: var(--team0-color-0);
    color: var(--team0-gray-7);
  }

  .list-group-item.team-1.active {
    background-color: var(--team1-color-1);
    color: var(--team1-gray-9);
  }
  .list-group-item.team-0.active {
    background-color: var(--team0-color-1);
    color: var(--team0-gray-9);
  }
</style>
