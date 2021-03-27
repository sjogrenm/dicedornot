<script lang="ts">
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
    width: calc(600/1338*100%);
    right: calc((1338 - 1316)/1338*100%);
    bottom: 5%;
    position: absolute;
    display: grid;
    grid-template-columns: repeat(3, auto);
    grid-template-rows: 1;
  }
</style>
