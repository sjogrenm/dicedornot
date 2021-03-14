<script>
  export let path,
    rolls,
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
    color = 0 * ((maxIndex - index) / maxIndex) + 255 * (index / maxIndex);
    textColor = color > 150 ? "#000000" : "#ffffff";
    color = `rgb(${color}, ${color}, ${color})`;
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
      stroke={textColor}
      fill={color}
      stroke-width="0.25"
      points="0.5 0.5, 4.5 2.5, 0.5 4.5"
    />
  </marker>
</defs>

{#if path.length > 1}
  <polyline
    stroke={textColor}
    class="move-border"
    stroke-width="0.1"
    points={path.map((cell) => `${cell.x || 0}, ${cell.y || 0}`).join(" ")}
  />
  <polyline
    class="move"
    marker-start="url(#move-{index})"
    marker-end="url(#pointer-{index})"
    stroke-width="0.08"
    stroke={color}
    points={path.map((cell) => `${cell.x || 0}, ${cell.y || 0}`).join(" ")}
  />
{/if}
<circle
  stroke={textColor}
  fill={color}
  stroke-width="0.01"
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



<style>
  .move {
    fill: none;
  }
  .move-border {
    fill: none;
  }
</style>
