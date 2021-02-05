<script>
  import FixedRatio from "./FixedRatio.svelte";
  export let width,
    height;
</script>

<FixedRatio {width} {height}>
  <div
    class="grid"
    style="grid-template-columns: repeat({width}, minmax(0, 1fr));  grid-template-rows: repeat({height}, minmax(0, 1fr));"
  >
    {#each Array(height) as _r, row (row)}
      {#each Array(width) as _c, column (column)}
        <slot {row} {column}>
          <div class="grid-item" class:row class:column />
        </slot>
      {/each}
    {/each}
  </div>
</FixedRatio>

<style>
  .grid {
    display: grid;
    justify-items: center;
    align-items: center;
    width: 100%;
    height: 100%;
  }

  .grid-item {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    position: relative;
  }
</style>
