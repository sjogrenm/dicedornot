<script>
  import Roll from "./Roll.svelte";
  export let rolls;
  export let selectedRoll;
</script>

<style>
</style>

<ul class="list-group">
  {#each rolls as roll (roll.rollIndex)}
    <li
      class="list-group-item list-group-item-action"
      class:active={selectedRoll == roll.rollIndex}
      >
      <Roll {roll} selected={selectedRoll == roll.rollIndex}/>
    </li>
  {/each}
</ul>
