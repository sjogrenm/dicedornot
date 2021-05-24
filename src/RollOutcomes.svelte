<script lang="ts">
  import RollDescription from "./RollDescription.svelte";
  import type { Action } from "./rolls.js";
  export let action: Action;
</script>

<RollDescription {action} />
{#if !action.hideDependents}
  {#each action.dependentActions as depRoll}
    <RollDescription action={depRoll} />
  {/each}
{/if}
