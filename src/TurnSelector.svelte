<script>
  export let rolls;
  import {replayCurrent, replayTarget} from "./stores.js";
  let turn, teamId, teamName, current, active, startIndex, endIndex;

  $: {
    turn = rolls[0].turn;
    teamId = rolls[0].activeTeam.id;
    teamName = rolls[0].activeTeam.name;
    startIndex = rolls[0].startIndex;
    endIndex = rolls[rolls.length - 1].endIndex;
    current = $replayCurrent.atOrAfter(startIndex) && $replayCurrent.before(endIndex);
  }

  function handleClick() {
    $replayTarget = startIndex;
  }
</script>

<div
  class={`btn team team-${teamId}`}
  class:current
  title={`${teamName}: Turn ${turn}`}
  on:click={handleClick}
>
  {turn}
</div>

<style>
  .team.btn {
    width: 2em;
    height: 2em;
    line-height: 2em;
    text-align: center;
    display: inline-block;
    border-width: 1px;
    border-style: solid;
    margin: 1px;
    padding: 0;
  }

  .team-0.current {
    text-shadow: -0.06ex 0 var(--team0-gray-9), 0.06ex 0 var(--team0-gray-9);
    background-color: var(--team0-color-5);
  }
  .team-1.current {
    text-shadow: -0.06ex 0 var(--team1-gray-9), 0.06ex 0 var(--team1-gray-9);
    background-color: var(--team1-color-5);
  }
  .team-0 {
    background-color: var(--team0-color-3);
    border-color: var(--team0-color-9);
    color: var(--team0-gray-9);
  }
  .team-1 {
    background-color: var(--team1-color-3);
    border-color: var(--team1-color-9);
    color: var(--team1-gray-9);
  }
</style>
