<script>
  import { ROLL, KICKOFF_RESULT_NAMES } from "./constants.js";
  import PlayerPill from "./PlayerPill.svelte";
  import {
    MoveAction,
    SetupAction,
    KickoffRoll,
    PitchInvasionRoll,
    ModifiedD6SumRoll,
    CasualtyRoll,
    InjuryRoll,
  } from "./rolls.js";
  import Dice from "./Dice.svelte";

  export let roll;
</script>

<div>
  <span class="dice-line">
    {#if roll.rollType === ROLL.Block}
      {roll.rollName}: <PlayerPill player={roll.activePlayer} />
      <Dice dice={roll.dice} uphill={roll.isRedDice} separator="/" />
      <PlayerPill player={roll.defender} />
    {:else if roll instanceof SetupAction}
      Set Up
    {:else if roll instanceof MoveAction}
      Move: <PlayerPill player={roll.activePlayer} /> - ({roll.cellFrom.x || 0}, {roll
        .cellFrom.y || 0}) {"\u2192"} ({roll.cellTo.x || 0}, {roll.cellTo.y ||
        0})
    {:else if roll instanceof KickoffRoll}
      {roll.rollName}: {KICKOFF_RESULT_NAMES[roll.diceSum]}
    {:else if roll instanceof PitchInvasionRoll}
      {roll.rollName}: <PlayerPill player={roll.activePlayer} />
      {roll.stunned ? "stunned!" : "safe"} - {roll.roll} ({roll.target})`
    {:else if roll instanceof CasualtyRoll}
      {roll.rollName}: <PlayerPill player={roll.activePlayer} /> - <Dice
        dice={roll.dice
          .toString()
          .split("")
          .map((char) => parseInt(char))}
      /> - {roll.casName(roll.dice)}
    {:else if roll instanceof InjuryRoll}
      {roll.rollName}: <PlayerPill player={roll.activePlayer} /> - <Dice
        dice={roll.dice}
        separator="+"
      /> - {roll.injuryName(roll.diceSum)}
    {:else if roll instanceof ModifiedD6SumRoll}
      {roll.rollName}: <PlayerPill player={roll.activePlayer} /> - <Dice
        dice={roll.dice}
        separator="+"
      /> ({roll.modifiedTarget})
    {:else if roll.activePlayer}
      {roll.rollName}: <PlayerPill player={roll.activePlayer} /> - <Dice
        dice={roll.dice}
      />
    {:else}
      {roll.rollName}: <Dice dice={roll.dice} />
    {/if}
  </span>
</div>

<style>
  .dice-line {
    vertical-align: middle;
  }
</style>
