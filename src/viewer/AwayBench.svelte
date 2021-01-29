<script>
  import CasBox from './CasBox.svelte';
  export let dugout;
</script>

<div class="bench">
  <CasBox casType="reserve" {dugout}/>
  <CasBox casType="ko" {dugout}/>
  <CasBox casType="cas" {dugout}/>
</div>

<style>
  .bench {
    width: 44.5%;
    right: 1.7%;
    bottom: 2.5%;
    position: absolute;
    display: grid;
    grid-template-columns: repeat(3, auto);
    grid-template-rows: 1;
  }
</style>
