<script>
import FixedRatio from "./FixedRatio.svelte";


  export let logo;
</script>
<style>
.logo {
  height: 100%;
  width: 100%;
  display: inline-block;
  background-size: contain;
}
</style>
{#if logo}
  <FixedRatio>
    <div class="logo" style="background-image: url('/images/logo/256x256/logo_{logo}.png')"/>
  </FixedRatio>
{/if}
