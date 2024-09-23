<script lang="ts">
    import type { Action } from "./rolls.js";
    export let actionsByTurn: Action[][];
    let collapsed = true;
  </script>
  
  <details>
    <summary>Full Game Log</summary>
    {#each actionsByTurn as turn}
      <h1>Turn {turn[0].turn} ({turn[0].gameState.teams[turn[0].gameState.activeTeam].name})</h1>
      <p>
      {#each turn as action}
          {action.shortDescription}<br>
      {/each}
      </p>
    {/each}
  </details>
  
  <style>
    h1 {
      font-size: 1rem;
      font-weight: bold;
    }
  </style>
  