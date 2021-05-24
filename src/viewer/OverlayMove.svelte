<script context="module" lang="ts">
  import type {Cell} from '../replay/Internal.js';
  import type {Colors} from './types.js';
  export interface Roll {
    from: Cell,
    to: Cell,
    rolls: string,
  }

  export interface Props {
    path: Cell[],
    rolls: Roll[],
  }
</script>

<script lang="ts">

  export let path: Props['path'],
    rolls: Props['rolls'],
    colors: Colors,
    index: number = 0;
  let _rolls: _Roll[];

  function mixCells(cellA: Cell, cellB: Cell, pct: number) {
    return {
      x: cellA.x * (1 - pct) + cellB.x * pct,
      y: cellA.y * (1 - pct) + cellB.y * pct,
    };
  }

  interface _Roll {
    pt: Cell,
    rolls: Roll['rolls']
  }

  $: {
    _rolls = rolls.map(roll => ({
      rolls: roll.rolls,
      pt: mixCells(roll.from, roll.to, 0.5)
    }));
    if (path[0].x == path[1].x && path[0].y == path[1].y) {
      path.shift();
    }
    if (path.length == 1) {
      path = [{x: path[0].x, y: path[0].y + 0.3}];
      if (_rolls.length > 0) {
        _rolls[0].pt.x += 0.3;
        _rolls[0].pt.x += 0.3;
      }
    } else {
      let newStart = mixCells(path[0], path[1], 0.25);
      let newEnd = mixCells(path[path.length - 2], path[path.length - 1], 0.75);
      path[0] = newStart;
      path[path.length - 1] = newEnd;
    }
  }
</script>

<defs>
  <marker
    id="pointer-{index}"
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
</defs>

{#if path.length > 1}
  <polyline
    fill="none"
    filter="url(#chalk)"
    class="move"
    marker-end="url(#pointer-{index})"
    stroke-width="0.08"
    stroke={colors.color.toString()}
    points={path.map((cell) => `${cell.x || 0},${cell.y || 0}`).join(" ")}
  />
{/if}
<circle
  filter="url(#chalk)"
  fill={colors.color.toString()}
  cx={path[0].x}
  cy={path[0].y}
  r="0.2"
/>
<text
  fill={colors.textColor.toString()}
  x={path[0].x}
  y={path[0].y}
  font-size="0.25"
  text-anchor="middle"
  dominant-baseline="middle">{index}</text
>

{#each _rolls as roll}
  <line
    stroke={colors.color.toString()}
    x1={roll.pt.x - 0.1 * roll.rolls.length/2}
    y1={roll.pt.y + 0.05}
    x2={roll.pt.x + 0.1 * roll.rolls.length/2}
    y2={roll.pt.y + 0.05}
    stroke-width="0.3"
    stroke-linecap="round"
  />
  <!-- <text
    stroke="rgb({colors.color.toString()}, {colors.color.toString()}, {colors.color.toString()})"
    stroke-width="0.2"
    x={roll.pt.x}
    y={roll.pt.y}
    font-size="0.25"
    text-anchor="middle"
    dominant-baseline="middle">{roll.rolls}</text
  > -->
  <text
    fill={colors.textColor.toString()}
    x={roll.pt.x}
    y={roll.pt.y}
    font-size="0.25"
    text-anchor="middle"
    dominant-baseline="middle">{roll.rolls}</text
  >
{/each}
