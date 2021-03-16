<script>
  import TurnSelector from "./TurnSelector.svelte";
  import { replay, replayPreview } from "./stores.js";
  let rolls, rollsByTurn;

  $: {
    rolls = $replay.rolls;
    rollsByTurn = rolls.reduce((groups, roll) => {
      const lastGroup = groups[groups.length - 1];
      const lastRoll = lastGroup && lastGroup[lastGroup.length - 1];
      if (
        !lastGroup ||
        !lastRoll ||
        lastRoll.activeTeam.id != roll.activeTeam.id ||
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

<div on:mouseleave={() => ($replayPreview = null)}>
  {#each rollsByTurn as rolls}
    <TurnSelector {rolls} />
  {/each}
</div>
