<script>
  export let title = "Explanation";
</script>

<div class="container">
  <div id="explanation" class="row">
    <div class="col-sm-12">
      <details>
        <summary><span class="btn btn-secondary">{title}</span></summary>
        <slot />
      </details>
    </div>
  </div>
</div>

<style>
  details > summary {
    list-style: none;
    text-align: center;
  }
</style>
