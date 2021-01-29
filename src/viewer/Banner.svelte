<script>
import FixedRatio from "./FixedRatio.svelte";


    export let banner;
</script>
<div class="banner">
  <FixedRatio width={2} height={1}>
    <div class={`sprite ${banner}`}/>
  </FixedRatio>
</div>

<style>
  .banner {
    background-image: url("/images/banner.png");
    background-repeat: no-repeat;
    width: 75%;
    display: inline-block;
    position: absolute;
  }
  .sprite {
    --imW: 1024;
    --imH: 1024;
    --spW: 1024;
    --spH: 512;
    --spX: 0;
    --spY: 0;
  }
  .turnover {
    --spY: 539;
  }
</style>
