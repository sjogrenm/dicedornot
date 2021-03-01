<script>
  import { ROLL, KICKOFF_RESULT_NAMES } from "./constants.js";
  import PlayerPill from "./PlayerPill.svelte";
  import { MoveAction, SetupAction, KickoffRoll, PitchInvasionRoll, ModifiedD6SumRoll } from "./rolls.js";

  export let roll;
</script>

<div>
{#if roll.rollType === ROLL.Block}
    {roll.rollName}: <PlayerPill player={roll.activePlayer} /> against <PlayerPill
      player={roll.defender}
    /> -
    <span class:redDice={roll.isRedDice}
      >{roll.dice.join(roll.constructor.diceSeparator)}</span
    >
{:else if roll instanceof SetupAction}
  Set Up
{:else if roll instanceof MoveAction}
  Move: <PlayerPill player={roll.activePlayer} /> - ({roll.cellFrom.x || 0}, {roll.cellFrom.y || 0}) {'\u2192'} ({roll.cellTo.x || 0}, {roll.cellTo.y || 0})
{:else if roll instanceof KickoffRoll}
  {roll.rollName}: {KICKOFF_RESULT_NAMES[roll.diceSum]}
{:else if roll instanceof PitchInvasionRoll}

  {roll.rollName}: <PlayerPill player={roll.activePlayer}/> {roll.stunned ? 'stunned!' : 'safe'} - {roll.roll} ({roll.target})`
{:else if roll instanceof ModifiedD6SumRoll}
  {roll.rollName}: <PlayerPill player={roll.activePlayer} /> - {roll.dice} ({roll.modifiedTarget})
{:else if roll.activePlayer}
  {roll.rollName}: <PlayerPill player={roll.activePlayer} /> - {roll.dice}
{:else}
  {roll.rollName}: {roll.dice}
{/if}
</div>
