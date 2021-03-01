<script>
  import HomeBench from "./HomeBench.svelte";
  import TeamAids from "./TeamAids.svelte";
  import Weather from "./Weather.svelte";
  import TeamLogo from "./TeamLogo.svelte";

  export let pitchPlayers, team, weather, send, receive;
</script>

<div class="dugout">
  {#if team}
    <HomeBench {pitchPlayers} dugout={team.dugout} {send} {receive} />
    <div class="logo">
      <TeamLogo logo={team.logo} />
    </div>
    <div class="name">{team.name}</div>
    <div class="score"><p>{team.score}</p></div>
    <div class="turn" class:active={team.active}><p>{team.turn}</p></div>
    <div class="aids"><TeamAids {team}/></div>
  {/if}
  <div class="weather"><Weather {weather} /></div>
</div>

<style>
  .logo {
    position: absolute;
    width: 3.5%;
    left: 1.5%;
    bottom: 1.5%;
    display: flex;
    justify-content: center;
    align-items: center;
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
    right: 0.5%;
    top: 4%;
    width: 5%;
  }
  .turn {
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    left: 47%;
    font-size: 200%;
    width: 6%;
    bottom: 0;
    height: 50%;
  }
  .turn.active {
    color: #ffb22e;
  }
  .score {
    display: flex;
    justify-content: center;
    align-items: center;
    position: absolute;
    left: 47%;
    font-size: 350%;
    text-align: center;
    width: 6%;
    top: 0;
    height: 50%;
  }

  .aids {
    position: absolute;
    width: 30%;
    left: 53%;
    bottom: 1%;
  }

</style>
