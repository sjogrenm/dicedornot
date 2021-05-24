<script lang="ts">
  import TurnSelector from "./TurnSelector.svelte";
  import { replay, replayPreview } from "./stores.js";
  import type { Action } from "./rolls";
  let actions: Action[], actionsByTurn: Action[][];

  $: {
    actions = $replay!.actions;
    actionsByTurn = actions.reduce((groups: Action[][], roll: Action) => {
      const lastGroup = groups[groups.length - 1];
      const lastRoll = lastGroup && lastGroup[lastGroup.length - 1];
      if (
        !lastGroup ||
        !lastRoll ||
        lastRoll.activeTeam?.id != roll.activeTeam?.id ||
        lastRoll.turn != roll.turn
      ) {
        groups.push([roll]);
      } else {
        lastGroup.push(roll);
      }
      return groups;
    }, []);
  }
</script>

<div on:mouseleave={() => ($replayPreview = undefined)}>
  {#each actionsByTurn as actions}
    <TurnSelector {actions} />
  {/each}
</div>
