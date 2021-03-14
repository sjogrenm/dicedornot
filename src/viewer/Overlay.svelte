<script>
  import { ACTION_TYPE } from "../constants.js";
  import { ensureList } from "../replay-utils.js";
  import { replayPreview, replay } from "../stores.js";
  import OverlayMove from "./OverlayMove.svelte";

  let paths;

  function cellEqual(a, b) {
    return a.x == b.x && a.y == b.y;
  }
  $: {
      // paths = [{component: OverlayMove, path: [{x: 1, y: 1}, {x: 2, y: 2}]}];
    paths = [];
    for (const {step, action} of $replayPreview.start.sliceActionsTo($replay.fullReplay, $replayPreview.end)) {
      switch (action.ActionType || 0) {
        case ACTION_TYPE.Move:
          let from = action.Order.CellFrom;
          let to = action.Order.CellTo.Cell;
          let lastPath = paths[paths.length - 1];
          if (lastPath && lastPath.component === OverlayMove) {
            let lastCell = lastPath.path[lastPath.path.length - 1];
            if (cellEqual(lastCell, from)) {
              lastPath.path.push(to);
              break;
            }
          }
          paths.push({
            component: OverlayMove,
            path: [from, to],
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
  <defs>
    <marker
      id="pointer"
      markerUnits="strokeWidth"
      orient="auto"
      markerWidth="5"
      markerHeight="5"
      refY="2.5"
      refX="4"
    >
      <polyline
        stroke="#000000"
        fill="#ffffff"
        stroke-width="0.5"
        points="0.5 0.5, 4.5 2.5, 0.5 4.5"
      />
    </marker>
  </defs>
  {#each paths as path, index}
    <svelte:component this={path.component} {...path} {index} />
  {/each}
</svg>
