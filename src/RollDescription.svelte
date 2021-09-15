<script lang="ts">
  import { BLOCK_DIE, KICKOFF_RESULT_NAMES } from "./constants.js";
  import PlayerPill from "./PlayerPill.svelte";
  import {
    MoveAction,
    SetupAction,
    KickoffRoll,
    PitchInvasionRoll,
    ModifiedD6SumRoll,
    CasualtyRoll,
    InjuryRoll,
    BlockRoll,
    Action,
    Roll,
  } from "./rolls.js";
  import Dice from "./Dice.svelte";

  export let action: (Action | Roll);
</script>

<div>
  <span class="dice-line">
    {#if action instanceof BlockRoll}
      {action.actionName}: <PlayerPill player={action.activePlayer} />
      <Dice dice={action.dice.map(face => BLOCK_DIE[face])} uphill={action.isRedDice} separator="/" />
      {#if action.defender}
        <PlayerPill player={action.defender} />
      {:else}
        unknown defender
      {/if}
    {:else if action instanceof SetupAction}
      Set Up
    {:else if action instanceof MoveAction}
      Move: <PlayerPill player={action.activePlayer} /> - ({action.cellFrom.x || 0}, {action
        .cellFrom.y || 0}) {"\u2192"} ({action.cellTo.x || 0}, {action.cellTo.y ||
        0})
    {:else if action instanceof KickoffRoll}
      {action.actionName}: {KICKOFF_RESULT_NAMES[action.diceSum]}
    {:else if action instanceof PitchInvasionRoll}
      {action.actionName}: <PlayerPill player={action.activePlayer} />
      {action.stunned ? "stunned!" : "safe"} - <Dice dice={action.dice} /> ({action.modifiedTarget})
    {:else if action instanceof CasualtyRoll}
      {action.actionName}: <PlayerPill player={action.activePlayer} /> - <Dice
        dice={action.dice
          .toString()
          .split("")
          .map((char) => parseInt(char))}
      /> - {action.casName(action.dice)}
    {:else if action instanceof InjuryRoll}
      {action.actionName}: <PlayerPill player={action.activePlayer} /> - <Dice
        dice={action.dice}
        separator="+"
      /> - {action.injuryName}
    {:else if action instanceof ModifiedD6SumRoll && action.activePlayer}
      {action.actionName}: <PlayerPill player={action.activePlayer} /> - <Dice
        dice={action.dice}
        separator="+"
      /> ({action.modifiedTarget})
    {:else if action instanceof ModifiedD6SumRoll}
      {action.actionName}: <Dice dice={action.dice} separator="+" /> ({action.modifiedTarget})
    {:else if action.activePlayer && 'dice' in action}
      {action.actionName}: <PlayerPill player={action.activePlayer} /> - <Dice
        dice={action.dice}
      />
    {:else if 'dice' in action}
      {action.actionName}: <Dice dice={action.dice} />
    {:else}
      {action.actionName} />
    {/if}
  </span>
</div>

<style>
  .dice-line {
    vertical-align: middle;
  }
</style>
