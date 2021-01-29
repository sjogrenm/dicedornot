<script>
  import FixedRatio from "./FixedRatio.svelte";
  export let weather;
</script>

<FixedRatio>
  <div class={`weather sprite ${weather}`} title="sweltering heat!" />
</FixedRatio>

<style>
  .weather {
    background-image: url("/images/weather.png");
    width: 100%;
    height: 100%;
    --imW: 192;
    --imH: 36;
    --spW: 36;
    --spH: 36;
    /* position: absolute; */
  }
  .heat {
    --spX: 0;
  }
  .sunny {
    --spX: 39;
  }
  .perfect {
    --spX: 78;
  }
  .rain {
    --spX: 117;
  }
  .blizzard {
    --spX: 156;
  }
</style>
