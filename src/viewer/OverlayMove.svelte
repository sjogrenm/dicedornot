<script>
  export let path,
    index = 0;

  function mixCells(cellA, cellB, pct) {
    return {
      x: cellA.x * pct + cellB.x * (1 - pct),
      y: cellA.y * pct + cellB.y * (1 - pct),
    };
  }

  $: {
    console.log({path, index});
    if (path.length == 2 && path[0].x == path[1].x && path[0].y == path[1].y) {
      path = [{x: path[0].x, y: path[0].y + 0.3}];
    } else {
      let newStart = mixCells(path[0], path[1], 0.75);
      let newEnd = mixCells(path[path.length - 1], path[path.length - 2], 0.75);
      path[0] = newStart;
      path[path.length - 1] = newEnd;
    }
  }
</script>

{#if path.length > 1}
  <polyline
    class="move-border"
    stroke-width="0.15"
    points={path.map((cell) => `${cell.x || 0}, ${cell.y || 0}`).join(" ")}
  />
  <polyline
    class="move"
    marker-start="url(#move-{index})"
    marker-end="url(#pointer)"
    stroke-width="0.08"
    points={path.map((cell) => `${cell.x || 0}, ${cell.y || 0}`).join(" ")}
  />
{/if}
<circle
  stroke="#000000"
  fill="#ffffff"
  stroke-width="0.01"
  cx={path[0].x}
  cy={path[0].y}
  r="0.2"
/>
<text
  x={path[0].x}
  y={path[0].y}
  font-size="0.25"
  text-anchor="middle"
  dominant-baseline="middle">{index}</text
>

<style>
  .move {
    fill: none;
    stroke: #ffffff;
  }
  .move-border {
    fill: none;
    stroke: #000000;
  }
</style>
