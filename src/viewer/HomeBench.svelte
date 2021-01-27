<script>
  import CasBox from './CasBox.svelte';
  export let dugout;
</script>

<div class="row no-gutters">
  <div class="col">
    <CasBox casType="cas" {dugout}/>
  </div>
  <div class="col">
    <CasBox casType="ko" {dugout}/>
  </div>
  <div class="col">
    <CasBox casType="reserve" {dugout}/>
  </div>
</div>
