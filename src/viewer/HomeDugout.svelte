<script>

import HomeBench from "./HomeBench.svelte";
import TeamAids from "./TeamAids.svelte";
import SelectedPlayer from "./SelectedPlayer.svelte";
import Weather from "./Weather.svelte";

export let homeTeam, weather;

</script>

<div class="dugout">
  <HomeBench dugout={homeTeam.dugout}/>
  <img src="/images/logo/256x256/logo_{homeTeam.logo}.png" alt="Logo: {homeTeam.logo}" class="logo"/>
  <div class="name">{homeTeam.name}</div>
  <div class="score"><p>{homeTeam.score}</p></div>
  <div class="turn" class:active={homeTeam.active}><p>{homeTeam.turn}</p></div>
  <div class="aids"><TeamAids /></div>
  <div class="selected"><SelectedPlayer /></div>
  <div class="weather"><Weather {weather}/></div>
</div>

<style>
  .logo {
    position: absolute;
    width: 3.5%;
    left: 1.5%;
    bottom: 1.5%;
  }
  .name {
    font-size: 1.5em;
    font-weight: bold;
    position: absolute;
    bottom: 0;
    left: 6%;
    font-family: "Nuffle";
  }
  .dugout {
    width: 100%;
    height: 14.5%;
    position: relative;
    color: hsl(0, 0%, 85%);
    font-family: Nuffle;
  }
  .weather {
    position: absolute;
    right: .5%;
    top: 4%;
    width: 5%;
  }
  .turn {
    position: absolute;
    display:flex;
    justify-content: center;
    align-items: center;
    left: 47%;
    font-size: 200%;
    width: 6%;
    bottom:0;
    height:50%;
  }
  .turn.active {
    color: hsl(60, 100%, 67%);
  }
  .score {
    display:flex;
    justify-content: center;
    align-items: center;
    position: absolute;
    left: 47%;
    font-size: 350%;
    text-align: center;
    width: 6%;
    top: 0;
    height:50%;
  }

  .aids {
    position: absolute;
    width: 30%;
    left: 53%;
    bottom: 1%;
  }

  .selected {
    width: 7.5%;
    left: 86%;
    position: relative;
  }
</style>
