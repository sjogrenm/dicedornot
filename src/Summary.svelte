<script>
  export let gameDetails;
  import { RACE_NAMES } from "../js/constants.js";
</script>

<style>
  .score {
    text-align: center;
    font-size: xx-large;
  }

  .team-details .team-name {
    font-size: large;
    font-weight: bold;
  }

  .home {
    color: blue;
  }

  .away {
    color: orange;
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
</style>

<div id="summary">
  <div class="row league-name">
    <div class="col-sm-12">
      League:
      <span id="league-name">{gameDetails.leagueName}</span>
    </div>
  </div>
  <div id="game-details">
    <div class="row">
      <div class="col-sm-5 team-details team-details-left">
        <div class="team-name home">
          <span id="home-team">{gameDetails.homeTeam.teamName}</span>
        </div>
        <div class="coach-name">
          Coach:
          <span id="home-coach">{gameDetails.homeTeam.coachName}</span>
        </div>
        <div class="race">
          Race:
          <span
            id="home-race">{RACE_NAMES[gameDetails.homeTeam.raceId] || `Unknown: gameDetails.homeTeam.raceId`}</span>
        </div>
      </div>

      <div class="col-sm-2 score">
        <span id="home-score" class="home">{gameDetails.homeTeam.score}</span>
        -
        <span id="away-score" class="away">{gameDetails.awayTeam.score}</span>
      </div>
      <div class="col-sm-5 team-details team-details-right">
        <div class="team-name away">
          <span id="away-team">{gameDetails.awayTeam.teamName}</span>
        </div>
        <div class="coach-name">
          Coach:
          <span id="away-coach">{gameDetails.awayTeam.teamName}</span>
        </div>
        <div class="race">
          Race:
          <span
            id="away-race">{RACE_NAMES[gameDetails.awayTeam.raceId] || `Unknown: gameDetails.awayTeam.raceId`}</span>
        </div>
      </div>
    </div>
    <div class="row stadium-name">
      <div class="col-sm-12">
        Stadium:
        <span id="stadium-name">{gameDetails.stadiumName}</span>
      </div>
    </div>
    <div class="row stadium-type">
      <div class="col-sm-12">
        Stadium Enhancement:
        <span id="stadium-type">{gameDetails.stadiumType || 'None'}</span>
      </div>
    </div>
  </div>
</div>
