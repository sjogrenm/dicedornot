<script>
  import Turn from "./Turn.svelte";
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
    currentTurnRolls = rollsByTurn.find(turnRolls => {
      let startIndex = turnRolls[0].startIndex;
      let endIndex = turnRolls[turnRolls.length - 1].endIndex;
      return $replayCurrent.atOrAfter(startIndex) && (endIndex && endIndex.after($replayCurrent));
    });
  }
</script>

{#if selectedRoll && currentTurnRolls && currentTurnRolls.length > 0}
  <div class="details-list">
    <Turn rolls={currentTurnRolls} {selectedRoll}/>
  </div>
{/if}


<style>
</style>
