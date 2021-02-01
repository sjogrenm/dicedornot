<script>
  import CasBox from './CasBox.svelte';
  export let dugout, send, receive;
</script>

<div class="bench">
  <CasBox casType="cas" {dugout} {send} {receive}/>
  <CasBox casType="ko" {dugout} {send} {receive}/>
  <CasBox casType="reserve" {dugout} {send} {receive}/>
</div>

<style>
  .bench {
    width: 44.5%;
    left: 2.1%;
    top: 4.7%;
    position: absolute;
    display: grid;
    grid-template-columns: repeat(3, auto);
    grid-template-rows: 1;
  }
</style>
