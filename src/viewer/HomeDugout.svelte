<script>

import HomeBench from "./HomeBench.svelte";
import TeamAids from "./TeamAids.svelte";
import SelectedPlayer from "./SelectedPlayer.svelte";
import { homeTeam } from "../stores";

</script>

<div class="row">
  <div class="col-5">
    <HomeBench />
    <div class="row name">
      <img src="/images/logo/256x256/logo_{$homeTeam.logo}.png" alt="Logo: {$homeTeam.logo}" class="logo"/>{$homeTeam.name}
    </div>
  </div>
  <div class="col-2">
    <div>
      <span id="score">{$homeTeam.score}</span>
    </div>
    <div>
      <span id="turn" class="">{$homeTeam.turn}</span>
    </div>
  </div>
  <div class="col-5">
    <div class="row">
      <div class="col-8">
        <TeamAids />
      </div>
      <div class="col-3">
        <SelectedPlayer />
      </div>
    </div>
    <div class="col-1">
      <div class="weather heat" id="weather" title="sweltering heat!"/>
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
  }
  .weather {
    background: url("/images/weather.png") no-repeat;
    width: 36px;
    height: 36px;
    display: inline-block;
    background-position-x: 0px;
    /* position: absolute; */
  }
  .heat {
    background-position-x: 0px;
  }
  .sunny {
    background-position-x: -39px;
  }
  .perfect {
    background-position-x: -78px;
  }
  .rain {
    background-position-x: -117px;
  }
  .blizzard {
    background-position-x: -156px;
  }
</style>
