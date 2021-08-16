<script lang="ts">
  import Turn from "./Turn.svelte";
  import { replay, replayCurrent } from "./stores.js";
  import type { Action } from "./rolls.js";
  let actions: Action[],
    actionsByTurn: Action[][],
    selectedAction: number | undefined,
    currentTurnActions: Action[] | undefined;

  function actionForReplayPosition(position: number): number | undefined {
    let nextAction = actions.findIndex((action) => {
      return position < action.startIndex;
    });
    return nextAction > 0 ? actions[nextAction - 1].actionIndex : 0;
  }
  $: {
    actions = $replay!.actions;
    selectedAction = actionForReplayPosition($replayCurrent);
    actionsByTurn = actions.reduce((groups: Action[][], action: Action) => {
      const lastGroup: Action[] = groups[groups.length - 1];
      const lastAction = lastGroup && lastGroup[lastGroup.length - 1];
      if (
        !lastGroup ||
        !lastAction ||
        lastAction.activeTeam?.id != action.activeTeam?.id ||
        lastAction.turn != action.turn
      ) {
        groups.push([action]);
      } else {
        lastGroup.push(action);
      }
      return groups;
    }, []);
    currentTurnActions = actionsByTurn.find((turnActions) => {
      let startIndex = turnActions[0].startIndex;
      let endIndex = turnActions[turnActions.length - 1].endIndex;
      return (
        startIndex <= $replayCurrent &&
        (!endIndex || $replayCurrent < endIndex)
      );
    });
  }
</script>

{#if selectedAction && selectedAction >= 0 && currentTurnActions && currentTurnActions.length > 0}
  <div class="details-list">
    <Turn actions={currentTurnActions} {selectedAction} />
  </div>
{/if}

<style>
</style>
