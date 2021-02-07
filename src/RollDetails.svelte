<script>
  import Turn from "./Turn.svelte";
  import TurnSelector from "./TurnSelector.svelte";
  import {replay, replayCurrent} from "./stores.js";
  let rolls, rollsByTurn, selectedRoll, currentTurnRolls;

  function rollForReplayPosition(position) {
    let nextRoll = rolls.findIndex(roll => {
      return roll.startIndex.after(position);
    });
    return nextRoll > 0 ? rolls[nextRoll - 1].rollIndex : 0;
  }
  $: {
    rolls = $replay.rolls;
    selectedRoll = rollForReplayPosition($replayCurrent);
    updateRollLog(rolls, selectedRoll);
    currentTurnRolls = rollsByTurn.find(turnRolls => {
      let startIndex = turnRolls[0].startIndex;
      let endIndex = turnRolls[turnRolls.length - 1].endIndex;
      return $replayCurrent.atOrAfter(startIndex) && (endIndex && endIndex.after($replayCurrent));
    });
  }
  function updateRollLog(rolls, selectedRoll) {
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

    open = selectedRoll !== null;
  }
</script>

<div>
  <div class="turn-list">
    {#each rollsByTurn as rolls}
      <TurnSelector {rolls} />
    {/each}
  </div>
</div>

{#if selectedRoll && currentTurnRolls && currentTurnRolls.length > 0}
<div class="details-list">
  <Turn rolls={currentTurnRolls} {selectedRoll}/>
</div>
{/if}

<style>
</style>
