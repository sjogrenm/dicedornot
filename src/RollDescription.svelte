<script>
  import { ROLL } from "./constants.js";
  import PlayerPill from "./PlayerPill.svelte";
  import { MoveAction, SetupAction } from "./rolls.js";

  export let roll;
</script>

{#if roll.rollType === ROLL.Block}
  <div>
    {roll.rollName}: <PlayerPill player={roll.activePlayer} /> against <PlayerPill
      player={roll.defender}
    /> -
    <span class:redDice={roll.isRedDice}
      >{roll.dice.join(roll.constructor.diceSeparator)}</span
    >
  </div>
{:else if roll.constructor === SetupAction}
  <div>Set Up</div>
{:else if roll.constructor === MoveAction}
  <div>Move: <PlayerPill player={roll.activePlayer} /> - ({roll.cellFrom.x || 0}, {roll.cellFrom.y || 0}) {'\u2192'} ({roll.cellTo.x || 0}, {roll.cellTo.y || 0})</div>
{:else if roll.activePlayer}
  <div>
    {roll.rollName}: <PlayerPill player={roll.activePlayer} /> - {roll.dice} ({roll.modifiedTarget})
  </div>
{:else}
  <div>{roll.rollName}: {roll.dice}</div>
{/if}
