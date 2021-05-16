<script lang="ts">
  import RollDescription from "./RollDescription.svelte";
  import type { Roll } from "./rolls.js";
  export let roll: Roll<any>;
</script>

<RollDescription {roll} />
{#if !roll.hideDependents}
  {#each roll.dependentRolls as depRoll}
    <RollDescription roll={depRoll} />
  {/each}
{/if}
