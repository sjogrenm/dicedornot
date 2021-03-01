<script>
  import RollDescription from "./RollDescription.svelte";
  export let roll;
</script>

<RollDescription {roll} />
{#if !roll.constructor.hideDependents}
  {#each roll.dependentRolls as depRoll}
    <RollDescription roll={depRoll} />
  {/each}
{/if}
