<script>
  import CasBox from './CasBox.svelte';
</script>

<div class="row no-gutters">
  <div class="col">
    <CasBox casType="reserve" team="away"/>
  </div>
  <div class="col">
    <CasBox casType="ko" team="away"/>
  </div>
  <div class="col">
    <CasBox casType="cas" team="away"/>
  </div>
</div>
