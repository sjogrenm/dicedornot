<script>
  import CasBox from './CasBox.svelte';
</script>

<div class="row no-gutters">
  <div class="col">
    <CasBox casType="cas" team="home"/>
  </div>
  <div class="col">
    <CasBox casType="ko" team="home"/>
  </div>
  <div class="col">
    <CasBox casType="reserve" team="home"/>
  </div>
</div>
