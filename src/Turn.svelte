<script>
  import Roll from "./Roll.svelte";
  export let rolls, selectedRoll, replayStart, replayEnd;
  function handleClick(roll) {
    return () => {
      replayStart = roll.startIndex;
      replayEnd = roll.endIndex;
    };
  }
</script>

<style>
</style>

<div class="list-group">
  {#each rolls as roll (roll.rollIndex)}
    <button
      class="list-group-item list-group-item-action"
      class:active={selectedRoll == roll.rollIndex}
      on:click={handleClick(roll)}
      >
      <Roll {roll} selected={selectedRoll == roll.rollIndex}/>
    </button>
  {/each}
  </div>
