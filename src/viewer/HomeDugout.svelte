<script>

import HomeBench from "./HomeBench.svelte";
import TeamAids from "./TeamAids.svelte";
import SelectedPlayer from "./SelectedPlayer.svelte";

</script>

<div class="row">
  <div class="col-5">
    <HomeBench />
    <div class="row">
      <img src="logo_vampire_04.png" />Bylorhofs at Camp
    </div>
  </div>
  <div class="col-2">
    <div>
      <span id="homeScore">0</span>
    </div>
    <div>
      <span id="homeTurn" class="">4</span>
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
      <div class="weather heat" id="weather" title="sweltering heat!">
        <h1 id="turnTimer">3:30</h1>
      </div>
    </div>
  </div>
</div>

<style>
  .weather {
    background: url("/images/weather.png") no-repeat;
    width: 36px;
    height: 36px;
    display: inline-block;
    background-position-x: 0px;
    position: absolute;
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
