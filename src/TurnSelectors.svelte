<script lang="ts">
  import TurnSelector from "./TurnSelector.svelte";
  import { replayPreview } from "./stores.js";
  import type { Action } from "./rolls";
  export let actionsByTurn: Action[][];
</script>

<div on:mouseleave={() => (replayPreview.set(undefined))}>
  {#each actionsByTurn as actions}
    <TurnSelector {actions} />
  {/each}
</div>
