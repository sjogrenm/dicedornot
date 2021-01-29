<script>
  import Roll from "./Roll.svelte";
  export let rolls;
  export let selectedRoll;
  let open = false;
  $: open =
    open ||
    (rolls && selectedRoll &&
      selectedRoll >= rolls[0].rollIndex &&
      selectedRoll <= rolls[rolls.length - 1].rollIndex);
</script>

<style>
</style>

<details {open} on:click|stopPropagation|preventDefault={() => (open = !open)}>
  <summary>{rolls[0].activeTeam.name} - Turn {rolls[0].turn}</summary>
  {#if open}
    <ul class="list-group" on:click|stopPropagation>
      {#each rolls as roll (roll.rolLIndex)}
        <li
          class="list-group-item list-group-item-action"
          class:active={selectedRoll == roll.rollIndex}
          on:click|stopPropagation={() => (roll.open = !roll.open)}>
          <Roll {roll} bind:open={roll.open}/>
        </li>
      {/each}
    </ul>
  {/if}
</details>
