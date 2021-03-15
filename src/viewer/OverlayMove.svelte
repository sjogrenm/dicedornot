<script>
  import { SIDE } from "../constants";
  import chroma from "chroma-js";

  import {team1Color, team1Gray, team0Color, team0Gray, gray} from "../theme.js";
  export let path,
    rolls,
    team,
    index = 0,
    maxIndex = 0;

  let color, textColor;
  function mixCells(cellA, cellB, pct) {
    return {
      x: cellA.x * pct + cellB.x * (1 - pct),
      y: cellA.y * pct + cellB.y * (1 - pct),
    };
  }

  $: {
    rolls.forEach(roll => {roll.pt = mixCells(roll.from, roll.to, 0.5)});
    if (path[0].x == path[1].x && path[0].y == path[1].y) {
      path.shift();
    }
    if (path.length == 1) {
      path = [{x: path[0].x, y: path[0].y + 0.3}];
      if (rolls.length > 0) {
        rolls[0].pt.x += 0.3;
        rolls[0].pt.x += 0.3;
      }
    } else {
      let newStart = mixCells(path[0], path[1], 0.75);
      let newEnd = mixCells(path[path.length - 1], path[path.length - 2], 0.75);
      path[0] = newStart;
      path[path.length - 1] = newEnd;
    }
    let lightText, darkText;
    if (team == SIDE.home) {
      color = team0Color((maxIndex - index) / maxIndex);
      lightText = team0Gray(0).brighten();
      darkText = team0Gray(1).darken();
    } else {
      color = team1Color(index / maxIndex);
      lightText = team1Gray(0).brighten();
      darkText = team1Gray(1).darken();
    }
    if (chroma.contrast(color, lightText) > chroma.contrast(color, darkText)) {
      textColor = lightText;
    } else {
      textColor = darkText;
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
      stroke={color}
      stroke-width="1"
      points="0.5 0.5, 4.5 2.5, 0.5 4.5"
    />
  </marker>
</defs>

{#if path.length > 1}
  <polyline
    fill="none"
    filter="url(#chalk)"
    class="move"
    marker-start="url(#move-{index})"
    marker-end="url(#pointer-{index})"
    stroke-width="0.08"
    stroke={color}
    points={path.map((cell) => `${cell.x || 0}, ${cell.y || 0}`).join(" ")}
  />
{/if}
<circle
  filter="url(#chalk)"
  fill={color}
  cx={path[0].x}
  cy={path[0].y}
  r="0.2"
/>
<text
  fill={textColor}
  x={path[0].x}
  y={path[0].y}
  font-size="0.25"
  text-anchor="middle"
  dominant-baseline="middle">{index}</text
>

{#each rolls as roll}
  <line
    stroke={color}
    x1={roll.pt.x - 0.1 * roll.rolls.length/2}
    y1={roll.pt.y + 0.05}
    x2={roll.pt.x + 0.1 * roll.rolls.length/2}
    y2={roll.pt.y + 0.05}
    stroke-width="0.3"
    stroke-linecap="round"
  />
  <!-- <text
    stroke="rgb({color}, {color}, {color})"
    stroke-width="0.2"
    x={roll.pt.x}
    y={roll.pt.y}
    font-size="0.25"
    text-anchor="middle"
    dominant-baseline="middle">{roll.rolls}</text
  > -->
  <text
    fill={textColor}
    x={roll.pt.x}
    y={roll.pt.y}
    font-size="0.25"
    text-anchor="middle"
    dominant-baseline="middle">{roll.rolls}</text
  >
{/each}
