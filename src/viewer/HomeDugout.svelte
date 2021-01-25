<script>

import HomeBench from "./HomeBench.svelte";
import TeamAids from "./TeamAids.svelte";
import SelectedPlayer from "./SelectedPlayer.svelte";
import FixedRatio from "./FixedRatio.svelte";
import { homeTeam } from "../stores";

</script>

<div class="row">
  <div class="col">
    <HomeBench />
    <div class="row name">
      <div class="col-2">
        <img src="/images/logo/256x256/logo_{$homeTeam.logo}.png" alt="Logo: {$homeTeam.logo}" class="logo"/>
      </div>
      <div class="col">{$homeTeam.name}</div>
    </div>
  </div>
  <div class="col-1">
    <div>
      <span id="score">{$homeTeam.score}</span>
    </div>
    <div>
      <span id="turn" class="">{$homeTeam.turn}</span>
    </div>
  </div>
  <div class="col">
    <div class="row no-gutters">
      <div class="col">
        <TeamAids />
      </div>
      <div class="col-2">
        <SelectedPlayer />
      </div>
      <div class="col-1">
        <FixedRatio>
          <div class="weather sprite heat" id="weather" title="sweltering heat!"/>
        </FixedRatio>
      </div>
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
    background-image: url("/images/weather.png");
    width: 100%;
    height: 100%;
    --imW: 192;
    --imH: 36;
    --spW: 36;
    --spH: 36;
    /* position: absolute; */
  }
  .heat {
    --spX: 0;
  }
  .sunny {
    --spX: 39;
  }
  .perfect {
    --spX: 78;
  }
  .rain {
    --spX: 117;
  }
  .blizzard {
    --spX: 156;
  }
</style>
