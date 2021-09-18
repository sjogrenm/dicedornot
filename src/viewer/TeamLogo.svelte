<svelte:options immutable/>

<script lang="ts">
  import FixedRatio from "./FixedRatio.svelte";

  export let logo: string | undefined;
</script>

{#if logo}
  <FixedRatio>
    <div
      class="logo"
      style="background-image: url('/images/logo/256x256/logo_{logo}.png')"
    />
  </FixedRatio>
{/if}

<style>
  .logo {
    height: 100%;
    width: 100%;
    display: inline-block;
    background-size: contain;
  }
</style>
