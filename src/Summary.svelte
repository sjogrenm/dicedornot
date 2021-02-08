<script>
  export let gameDetails, filename, homePercentile, awayPercentile;
  import { RACE_NAMES } from "./constants.js";
</script>

<div id="summary" class="container">
  <div class="row filename">
    <div class="col-sm-12">
      {filename}
    </div>
  </div>
  <div class="row league-name">
    <div class="col-sm-12">
      League:
      <span id="league-name">{gameDetails.leagueName}</span>
    </div>
  </div>
  <div class="row">
    <div class="col score">
      <span class="home">{gameDetails.homeTeam.score}</span> -
      <span class="away">{gameDetails.awayTeam.score}</span>
    </div>
  </div>
  <div class="row">
    <div class="col team-details team-details-left">
      <div class="team-name home">
        <img
          class="race-logo"
          src={`/images/races/${gameDetails.homeTeam.raceId}.png`}
          alt={RACE_NAMES[gameDetails.homeTeam.raceId] || `Unknown: ${gameDetails.homeTeam.raceId}`}
          title={RACE_NAMES[gameDetails.homeTeam.raceId] || `Unknown: ${gameDetails.homeTeam.raceId}`}
        >
        <span id="home-team">{gameDetails.homeTeam.teamName}</span>
      </div>
      <div class="coach-name">
        Coach:
        <span id="home-coach">{gameDetails.homeTeam.coachName}</span>
      </div>
    </div>
    <div class="col team-details team-details-right">
      <div class="team-name away">
        <span id="away-team">{gameDetails.awayTeam.teamName}</span>
        <img
          class="race-logo"
          src={`/images/races/${gameDetails.awayTeam.raceId}.png`}
          alt={RACE_NAMES[gameDetails.awayTeam.raceId] || `Unknown: ${gameDetails.awayTeam.raceId}`}
          title={RACE_NAMES[gameDetails.awayTeam.raceId] || `Unknown: ${gameDetails.awayTeam.raceId}`}
        >
      </div>
      <div class="coach-name">
        Coach:
        <span id="away-coach">{gameDetails.awayTeam.coachName}</span>
      </div>
    </div>
  </div>
  <div class="row">
  </div>
  <div class="row stadium-name">
    <div class="col-sm-12">
      Stadium:
      <span>{gameDetails.stadiumName}</span>
      {#if gameDetails.stadiumType}
      <span>[{gameDetails.stadiumType}]</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .race-logo {
    width: 2em;
    height: 2em;
  }
  .score {
    text-align: center;
    font-size: xx-large;
  }

  .team-details .team-name {
    font-size: large;
    font-weight: bold;
  }

  .home {
    color: var(--team0-color-8);
  }

  .away {
    color: var(--team1-color-8);
  }

  .team-details .coach-name,
  .team-details .race {
    font-size: medium;
  }

  .team-details-left {
    text-align: right;
  }

  .team-details-right {
    text-align: left;
  }

  .stadium-name {
    text-align: center;
  }

  .stadium-type {
    text-align: center;
  }

  .league-name {
    text-align: center;
  }
  .filename {
    text-align: center;
    font-weight: bold;
  }

  #summary {
    padding: 20px 0px;
  }
</style>
