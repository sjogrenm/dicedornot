<script lang="ts">
  import type * as Internal from "./replay/Internal.js";

  import type { Action } from "./rolls.js";

  export let actions: Action[];
  import { replayCurrent, replayTarget, replayPreview } from "./stores.js";
  let turn: number,
    teamId: Internal.Side | undefined,
    teamName: string | undefined,
    current: boolean,
    startIndex: number,
    endIndex: number | undefined;

  $: {
    turn = actions[0].turn;
    teamId = actions[0].activeTeam?.id;
    teamName = actions[0].activeTeam?.name;
    startIndex = actions[0].startIndex;
    endIndex = actions[actions.length - 1].endIndex;
    current = startIndex <= $replayCurrent && (endIndex == undefined || $replayCurrent < endIndex);
  }
</script>

<div
  class={`btn team team-${teamId}`}
  class:current
  title={`${teamName}: Turn ${turn}`}
  on:click={() => (replayTarget.set(startIndex))}
  on:mouseover={() => (replayPreview.set({ start: startIndex, end: endIndex }))}
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

  .team-home {
    background-color: var(--home-color-1);
    border-color: var(--home-color-3);
    color: var(--home-gray-7);
  }
  .team-away {
    background-color: var(--away-color-1);
    border-color: var(--away-color-3);
    color: var(--away-gray-7);
  }
  .team-home:hover {
    background-color: var(--home-color-3);
    border-color: var(--home-color-7);
    color: var(--home-gray-9);
  }
  .team-away:hover {
    background-color: var(--away-color-3);
    border-color: var(--away-color-7);
    color: var(--away-gray-9);
  }
  .team-home.current {
    color: var(--home-gray-9);
    text-shadow: -0.06ex 0 var(--home-gray-9), 0.06ex 0 var(--home-gray-9);
    border-color: var(--home-color-9);
    background-color: var(--home-color-5);
  }
  .team-away.current {
    color: var(--home-gray-9);
    text-shadow: -0.06ex 0 var(--away-gray-9), 0.06ex 0 var(--away-gray-9);
    border-color: var(--away-color-9);
    background-color: var(--away-color-5);
  }
</style>
