<script>

  import AwayBench from "./AwayBench.svelte";
  import TeamAids from "./TeamAids.svelte";
  import TeamLogo from "./TeamLogo.svelte";

  export let pitchPlayers, team, send, receive;

</script>

<div class="dugout">
  <div class="aids"><TeamAids reverse={true} {team}/></div>
  <div class="score">{team.score}</div>
  <div class="turn" class:active={team.active}>{team.turn}</div>
  <div class="name">{team.name}</div>
  <div class="logo">
    <TeamLogo logo={team.logo}/>
  </div>
  <AwayBench {pitchPlayers} dugout={team.dugout} {send} {receive}/>
</div>

<style>

  .logo {
    position: absolute;
    width: 3.5%;
    right: 1.5%;
    top: 1.5%;
    display: flex;
    justify-content: center;
    align-items: center;
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
    color: #ffb22e;
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
    top: 2%;
  }
</style>
