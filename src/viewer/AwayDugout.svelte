<script>

  import { awayTeam } from "../stores";
  import AwayBench from "./AwayBench.svelte";
  import TeamAids from "./TeamAids.svelte";

</script>

<div class="row">
  <div class="col-5">
    <div class="row">
      <div class="col-8">
        <TeamAids />
      </div>
    </div>
  </div>
  <div class="col-2">
    <div>
      <span id="turn">{$awayTeam.turn}</span>
    </div>
    <div>
      <span id="score">{$awayTeam.score}</span>
    </div>
  </div>

  <div class="col-5">
    <AwayBench />
    <div class="row name">
      {$awayTeam.name}<img src="/images/logo/256x256/logo_{$awayTeam.logo}.png" alt="Logo: {$awayTeam.logo}"/>
    </div>
  </div>
</div>

<style>

.name img {
    height: 1.5em;
    width: 1.5em;
  }
  .name {
    font-size: 1.5em;
    font-weight: bold;
    justify-content: right;
  }
</style>
