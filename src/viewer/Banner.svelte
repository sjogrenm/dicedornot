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
    width: 75%;
    display: inline-block;
    position: absolute;
    top: 25%;
    left: 12.5%;
  }
  .sprite {
    background-image: url("/images/banner.png");
    background-repeat: no-repeat;
    --imW: 1024;
    --imH: 1024;
    --spW: 1024;
    --spH: 512;
    --spX: 0;
    --spY: 0;
    width: 100%;
    height: 100%;
  }
  .turnover {
    --spY: 539;
  }
</style>
