<script lang="ts">
  import CasBox from "./CasBox.svelte";
  import { SIDE } from "../constants.js";
  import type * as Internal from "../replay/Internal.js";
  import type { CrossFadeFn, Dugout, PlayerProps } from "./types.js";
  export let pitchPlayers: Record<Internal.PlayerNumber, PlayerProps>,
    dugout: Dugout,
    send: CrossFadeFn,
    receive: CrossFadeFn;
</script>

<div class="bench">
  <CasBox
    {pitchPlayers}
    team={SIDE.away}
    casType="reserve"
    {dugout}
    {send}
    {receive}
  />
  <CasBox
    {pitchPlayers}
    team={SIDE.away}
    casType="ko"
    {dugout}
    {send}
    {receive}
  />
  <CasBox
    {pitchPlayers}
    team={SIDE.away}
    casType="cas"
    {dugout}
    {send}
    {receive}
  />
</div>

<style>
  .bench {
    width: calc(600 / 1338 * 100%);
    right: calc((1338 - 1316) / 1338 * 100%);
    bottom: 5%;
    position: absolute;
    display: grid;
    grid-template-columns: repeat(3, auto);
    grid-template-rows: 1;
  }
</style>
