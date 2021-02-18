<script>
  import CasBox from './CasBox.svelte';
  import {SIDE} from '../constants.js';
  export let dugout, send, receive;
</script>

<div class="bench">
  <CasBox team={SIDE.home} casType="cas" {dugout} {send} {receive}/>
  <CasBox team={SIDE.home} casType="ko" {dugout} {send} {receive}/>
  <CasBox team={SIDE.home} casType="reserve" {dugout} {send} {receive}/>
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
