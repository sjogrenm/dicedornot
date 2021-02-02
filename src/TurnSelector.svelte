<script>
  import { replay } from "../js/replay";

  export let rolls, replayStepIndex, replayStart, replayEnd;
  let turn, teamId, teamName, current, active, startIndex, endIndex;

  $: {
    turn = rolls[0].turn;
    teamId = rolls[0].activeTeam.id;
    teamName = rolls[0].activeTeam.name;
    startIndex = rolls[0].startIndex;
    endIndex = rolls[rolls.length - 1].endIndex;
    current = startIndex <= replayStepIndex && endIndex >= replayStepIndex;
    active =
      current ||
      ((!replayStart || replayStart <= startIndex) &&
        (!replayEnd || (endIndex && replayEnd >= endIndex)));
  }

  function handleClick() {
    replayStart = startIndex;
    replayEnd = endIndex;
  }
</script>

<div
  class={`btn team team-${teamId}`}
  class:current
  class:active
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

  .team.current {
    text-shadow: -0.06ex 0 black, 0.06ex 0 black;
  }
  .team-0.active {
    background-color: hsl(240, 100%, 80%);
  }
  .team-1.active {
    background-color: hsl(39, 100%, 70%);
  }
  .team-0 {
    background-color: hsl(240, 100%, 95%);
    border-color: hsl(240, 100%, 50%);
  }
  .team-1 {
    background-color: hsl(39, 100%, 90%);
    border-color: hsl(39, 100%, 50%);
  }
</style>
