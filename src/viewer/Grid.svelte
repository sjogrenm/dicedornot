<FixedRatio {width} {height}>
  <div class="grid" style="grid-template-columns: repeat({width}, minmax(0, 1fr));  grid-template-rows: repeat({height}, minmax(0, 1fr));">
    {#each Array(height) as _r, row}
      {#each Array(width) as _C, column}
        {#if component}
          <svelte:component this={component} {row} {column} {width} {height} {...componentProps} id="{prefix}_{column}_{row}"/>
        {:else}
          <div class="grid-item" id="{prefix}_{column}_{row}"/>
        {/if}
      {/each}
    {/each}
  </div>
</FixedRatio>

<script>
  import AwayBench from "./AwayBench.svelte";
import FixedRatio from "./FixedRatio.svelte"
  export let prefix, width, height, component=null, componentProps={};
</script>

<style>
.grid {
  display: grid;
  justify-items: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.grid-item {
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    -webkit-box-pack: center;
    -ms-flex-pack: center;
    justify-content: center;
    -webkit-box-align: center;
    -ms-flex-align: center;
    align-items: center;
    width: 100%;
    height: 100%;
    position: relative;
  }
</style>
