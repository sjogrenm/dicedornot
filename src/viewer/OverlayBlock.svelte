<script context="module" lang="ts">
  import type { Cell } from "../replay/Internal.js";
  import type { Colors } from "./types.js";
  export interface Props {
    from: Cell;
    to: Cell;
    follow: boolean;
    rolls: string;
    pushTo?: Cell;
  }
</script>

<script lang="ts">
  export let from: Cell,
    to: Cell,
    follow: boolean,
    rolls: string,
    colors: Colors,
    pushTo: Cell | undefined = undefined,
    index: number = 0;
  let center: Cell, pushFrom: Cell;

  function mixCells(cellA: Cell, cellB: Cell, pct: number) {
    return {
      x: cellA.x * (1 - pct) + cellB.x * pct,
      y: cellA.y * (1 - pct) + cellB.y * pct,
    };
  }

  $: {
    let newFrom = mixCells(from, to, 0.25);
    let newTo = mixCells(from, to, 0.75);
    if (pushTo) {
      pushFrom = mixCells(to, pushTo, 0.25);
      pushTo = mixCells(to, pushTo, 0.75);
    }
    center = mixCells(from, to, 0.5);
    to = newTo;
    from = newFrom;
  }
</script>

<defs>
  <marker
    id="push-{index}"
    markerUnits="strokeWidth"
    orient="auto"
    markerWidth="5"
    markerHeight="5"
    refY="2.5"
    refX="4"
  >
    <polyline
      fill="none"
      stroke={colors.oppColor.toString()}
      stroke-width="1"
      points="0.5,0.5 4.5,2.5 0.5,4.5"
    />
  </marker>
  <marker
    id="arrow-{index}"
    markerUnits="strokeWidth"
    orient="auto"
    markerWidth="5"
    markerHeight="5"
    refY="2.5"
    refX="4"
  >
    <polyline
      fill="none"
      stroke={colors.color.toString()}
      stroke-width="1"
      points="0.5,0.5 4.5,2.5 0.5,4.5"
    />
  </marker>
  <marker
    id="stop-{index}"
    markerUnits="strokeWidth"
    orient="auto"
    markerWidth="5"
    markerHeight="5"
    refY="2.5"
    refX="0.5"
  >
    <polyline
      fill="none"
      stroke={colors.color.toString()}
      stroke-width="1"
      points="0.5,0.5 0.5,4.5"
    />
  </marker>
</defs>

<polyline
  fill="none"
  filter="url(#chalk)"
  class="move"
  marker-end={follow ? `url(#arrow-${index})` : `url(#stop-${index})`}
  stroke-width="0.08"
  stroke={colors.color.toString()}
  points={`${from.x},${from.y} ${to.x},${to.y}`}
/>
{#if pushTo}
  <polyline
    fill="none"
    filter="url(#chalk)"
    class="move"
    marker-end="url(#push-{index})"
    stroke-width="0.08"
    stroke={colors.oppColor.toString()}
    points={`${pushFrom.x},${pushFrom.y} ${pushTo.x},${pushTo.y}`}
  />
{/if}
<circle filter="url(#chalk)" fill={colors.color.toString()} cx={from.x} cy={from.y} r="0.2" />
<text
  fill={colors.textColor.toString()}
  x={from.x}
  y={from.y}
  font-size="0.25"
  text-anchor="middle"
  dominant-baseline="middle">{index}</text
>

<line
  stroke={colors.color.toString()}
  x1={center.x - (0.1 * rolls.length) / 2}
  y1={center.y + 0.05}
  x2={center.x + (0.1 * rolls.length) / 2}
  y2={center.y + 0.05}
  stroke-width="0.3"
  stroke-linecap="round"
/>
<text
  fill={colors.textColor.toString()}
  x={center.x}
  y={center.y}
  font-size="0.25"
  text-anchor="middle"
  dominant-baseline="middle">{rolls}</text
>
