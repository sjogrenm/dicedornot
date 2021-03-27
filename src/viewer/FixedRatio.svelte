<script lang="ts">
  export let width=1, height=1;
  let clazz = null;
  export { clazz as class }
</script>

<div class="outer" style="padding-top: calc(({height}/{width}) * 100%)">
  <div class={`inner ${clazz || ''}`}>
    <slot/>
  </div>
</div>

<style>
  .outer {
    position: relative;
    width: 100%;
    height: 0;
  }

  .inner {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }
</style>
