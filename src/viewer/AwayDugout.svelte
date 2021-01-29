<script>

  import AwayBench from "./AwayBench.svelte";
  import TeamAids from "./TeamAids.svelte";

  export let awayTeam;

</script>

<div class="dugout">
  <div class="aids"><TeamAids reverse={true}/></div>
  <div class="score">{awayTeam.score}</div>
  <div class="turn" class:active={awayTeam.active}>{awayTeam.turn}</div>
  <div class="name">{awayTeam.name}</div>
  <img class="logo" src="/images/logo/256x256/logo_{awayTeam.logo}.png" alt="Logo: {awayTeam.logo}"/>
  <AwayBench dugout={awayTeam.dugout}/>
</div>

<style>

  .logo {
    position: absolute;
    width: 3.5%;
    right: 1.5%;
    top: 1.5%;
  }
  .name {
    font-size: 1.5em;
    font-weight: bold;
    position: absolute;
    top: 0;
    right: 6%;
    font-family: "Nuffle";
  }
  .dugout {
    width: 100%;
    height: 14.5%;
    position: relative;
    color: hsl(0, 0%, 85%);
    font-family: Nuffle;
  }

  .turn {
    position: absolute;
    display:flex;
    justify-content: center;
    align-items: center;
    left: 47%;
    font-size: 200%;
    text-align: center;
    width: 6%;
    top:0;
    height:50%;
  }
  .turn.active {
    color: hsl(60, 100%, 67%);
  }
  .score {
    position: absolute;
    display:flex;
    justify-content: center;
    align-items: center;
    left: 47%;
    font-size: 350%;
    text-align: center;
    width: 6%;
    bottom: 0;
    height:50%;
  }

  .aids {
    position: absolute;
    width: 30%;
    left: 16%;
    top: 1%;
  }
</style>
