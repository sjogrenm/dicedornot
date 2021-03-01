<script>
  import CasBox from './CasBox.svelte';
  import {SIDE} from '../constants.js';
  export let pitchPlayers, dugout, send, receive;
</script>

<div class="bench">
  <CasBox {pitchPlayers} team={SIDE.away} casType="reserve" {dugout} {send} {receive}/>
  <CasBox {pitchPlayers} team={SIDE.away} casType="ko" {dugout} {send} {receive}/>
  <CasBox {pitchPlayers} team={SIDE.away} casType="cas" {dugout} {send} {receive}/>
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
