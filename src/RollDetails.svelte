<script lang="ts">
  import Turn from "./Turn.svelte";
  import { replay, replayCurrent } from "./stores.js";
  import type { Roll } from "./rolls.js";
  import { ReplayPosition, after, atOrAfter } from "./replay-utils.js";
  let rolls: Roll<any>[],
    rollsByTurn: Roll<any>[][],
    selectedRoll: number | undefined,
    currentTurnRolls: Roll<any>[] | undefined;

  function rollForReplayPosition(position: ReplayPosition) {
    let nextRoll = rolls.findIndex((roll) => {
      return after(roll.startIndex, position);
    });
    return nextRoll > 0 ? rolls[nextRoll - 1].rollIndex : 0;
  }
  $: {
    rolls = $replay!.rolls;
    selectedRoll = rollForReplayPosition($replayCurrent);
    rollsByTurn = rolls.reduce((groups: Roll<any>[][], roll: Roll<any>) => {
      const lastGroup: Roll<any>[] = groups[groups.length - 1];
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
    currentTurnRolls = rollsByTurn.find((turnRolls) => {
      let startIndex = turnRolls[0].startIndex;
      let endIndex = turnRolls[turnRolls.length - 1].endIndex;
      return (
        atOrAfter($replayCurrent, startIndex) &&
        endIndex &&
        after(endIndex, $replayCurrent)
      );
    });
  }
</script>

{#if selectedRoll && selectedRoll >= 0 && currentTurnRolls && currentTurnRolls.length > 0}
  <div class="details-list">
    <Turn rolls={currentTurnRolls} {selectedRoll} />
  </div>
{/if}

<style>
</style>
