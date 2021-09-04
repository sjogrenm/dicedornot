<script lang="typescript">
  import TurnSelectors from "./TurnSelectors.svelte";
  import RollDetails from "./RollDetails.svelte";

  import { replay } from "./stores.js";
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
    console.log(actions, actionsByTurn);
  }
</script>
<div>
  <TurnSelectors {actionsByTurn}/>
  <RollDetails {actionsByTurn}/>
</div>
