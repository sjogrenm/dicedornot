<script>
  import TurnSelector from "./TurnSelector.svelte";
  import {replay} from "./stores.js";
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

<div class="turn-list">
  {#each rollsByTurn as rolls}
    <TurnSelector {rolls} />
  {/each}
</div>


<style>
</style>
