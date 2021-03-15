<script>
  import { ACTION_TYPE, SIDE } from "../constants.js";
  import { ensureList } from "../replay-utils.js";
  import { replayPreview, replay } from "../stores.js";
  import OverlayMove from "./OverlayMove.svelte";

  let paths;

  function cellEqual(a, b) {
    return a.x == b.x && a.y == b.y;
  }
  $: {
    paths = [];
    for (const {step, action} of $replayPreview.start.sliceActionsTo($replay.fullReplay, $replayPreview.end)) {
      switch (action.ActionType || 0) {
        case ACTION_TYPE.Move:
          let from = action.Order.CellFrom;
          let to = action.Order.CellTo.Cell;
          let rolls = ensureList(action.Results.BoardActionResult).filter(result => result.Requirement).map(result => `${result.Requirement}+`).join(' ');
          let team = action.PlayerId < 30 ? SIDE.home : SIDE.away;
          let lastPath = paths[paths.length - 1];
          if (lastPath && lastPath.component === OverlayMove) {
            let lastCell = lastPath.path[lastPath.path.length - 1];
            if (cellEqual(lastCell, from)) {
              lastPath.path.push(to);
              if (rolls) {
                lastPath.rolls.push({from, to, rolls});
              }
              break;
            }
          }
          paths.push({
            component: OverlayMove,
            path: [from, to],
            rolls: rolls ? [{from, to, rolls}] : [],
            team
          });
          break;
      }
    }
  }
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="-0.5 -0.5 26 15"
  class="overlay svelte-7djegz"
>
  {#each paths as path, index}
    <svelte:component this={path.component} {...path} index={index+1} maxIndex={paths.length} />
  {/each}
</svg>
