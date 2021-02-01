<script>
import { replay } from "../js/replay";

export let rolls, replayStepIndex, replayStart, replayEnd;
let turn, teamId, current, active;

$: {
  turn = rolls[0].turn;
  teamId = rolls[0].activeTeam.id;
  let startIndex = rolls[0].startIndex;
  let endIndex = rolls[rolls.length - 1].endIndex;
  current = startIndex <= replayStepIndex && endIndex >= replayStepIndex;
  active = current || (!replayStart || replayStart <= startIndex) && (!replayEnd || endIndex && replayEnd >= endIndex);
}
</script>
<div class={`team team-${teamId}`} class:current class:active title={turn}>
  {turn}
</div>

<style>
  .team {
    width: 2em;
    height: 2em;
    line-height: 2em;
    text-align: center;
    display: inline-block;
    border: 1px solid;
    margin: 1px;
  }

  .team.current{
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
