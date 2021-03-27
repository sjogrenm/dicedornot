<script lang="ts">
  import CasBox from './CasBox.svelte';
  import {SIDE} from '../constants.js';
  export let pitchPlayers, dugout, send, receive;
</script>

<div class="bench">
  <CasBox {pitchPlayers} team={SIDE.home} casType="cas" {dugout} {send} {receive}/>
  <CasBox {pitchPlayers} team={SIDE.home} casType="ko" {dugout} {send} {receive}/>
  <CasBox {pitchPlayers} team={SIDE.home} casType="reserve" {dugout} {send} {receive}/>
</div>

<style>
  .bench {
    width: calc(600/1338*100%);
    left: 2.1%;
    top: 4.7%;
    position: absolute;
    display: grid;
    grid-template-columns: repeat(3, auto);
    grid-template-rows: 1;
  }
</style>
