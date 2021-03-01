<script>
  import Roll from "./Roll.svelte";
  export let rolls, selectedRoll;
</script>

<div class="list-group" id="turn">
  {#each rolls as roll (roll.rollIndex)}
    <div
      class={`list-group-item list-group-item-action team-${roll.activeTeam.id}`}
      class:active={selectedRoll == roll.rollIndex}
    >
    <Roll {roll} selected={selectedRoll == roll.rollIndex} />
    </div>
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
