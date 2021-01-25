<script>

  import { awayTeam } from "../stores";
  import AwayBench from "./AwayBench.svelte";
  import TeamAids from "./TeamAids.svelte";

</script>

<div class="row">
  <div class="col">
    <TeamAids />
  </div>
  <div class="col-1">
    <div>
      <span id="turn">{$awayTeam.turn}</span>
    </div>
    <div>
      <span id="score">{$awayTeam.score}</span>
    </div>
  </div>

  <div class="col">
    <div class="row">
      <div class="col name">{$awayTeam.name}</div>
      <div class="col-2 logo"><img src="/images/logo/256x256/logo_{$awayTeam.logo}.png" alt="Logo: {$awayTeam.logo}"/></div>
    </div>
    <AwayBench />
  </div>
</div>

<style>
  .logo img {
    height: 2.25em;
    width: 2.25em;
    text-align: right;
  }
  .name {
    font-size: 1.5em;
    font-weight: bold;
    text-align: right;
  }
</style>
