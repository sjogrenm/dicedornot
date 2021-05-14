<script lang="ts">
  import FixedRatio from "./FixedRatio.svelte";
  export let width: number, height: number, reverse: boolean = false;

  let inlineStyle: string;
  $: inlineStyle = (
    reverse ?
    "align-content: start; justify-content: end; flex-direction: row-reverse; flex-wrap: wrap" :
    "align-content: end; justify-content: start; flex-direction: row; flex-wrap: wrap-reverse"
  )
</script>

<FixedRatio {width} {height}>
  <div class="content" style={inlineStyle}>
    <slot />
  </div>
</FixedRatio>

<style>
  .content {
    display: flex;
    width: 100%;
    height: 100%;
  }
</style>
