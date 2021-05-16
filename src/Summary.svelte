<script lang="ts">
  import { RACE_NAMES } from "./constants.js";
  import { Row, Col, Button } from "sveltestrap";
  import { replay } from "./stores.js";
  import type { GameDetails } from "./replay.js";

  let gameDetails: GameDetails,
    filename: string | undefined,
    shared = false;

  $: {
    gameDetails = $replay!.gameDetails;
    filename = $replay!.fullReplay.filename;
  }

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function share() {
    await navigator.clipboard.writeText(window.location.href);
    shared = true;
    await sleep(3000);
    shared = false;
  }
</script>

<Row class="text-center">
  <Col>
    <div class="team-name home">
      <Row class="align-items-center justify-content-center">
        <Col xs="auto">
          <img
            class="race-logo"
            src={`/images/races/${gameDetails.homeTeam.raceId}.png`}
            alt={RACE_NAMES[gameDetails.homeTeam.raceId] ||
              `Unknown: ${gameDetails.homeTeam.raceId}`}
            title={RACE_NAMES[gameDetails.homeTeam.raceId] ||
              `Unknown: ${gameDetails.homeTeam.raceId}`}
          />
        </Col>
        <Col xs="auto">
          <div class="team">{gameDetails.homeTeam.teamName}</div>
          <div class="coach">{gameDetails.homeTeam.coachName}</div>
        </Col>
      </Row>
    </div>
  </Col>

  <Col xs="auto" class="text-center">
    <div class="score">
      <span class="home">{gameDetails.homeTeam.score}</span> -
      <span class="away">{gameDetails.awayTeam.score}</span>
    </div>
  </Col>
  <Col>
    <div class="team-name away">
      <Row class="align-items-center justify-content-center">
        <Col xs="auto" class="order-12 order-lg-1">
          <div class="team">{gameDetails.awayTeam.teamName}</div>
          <div class="coach">{gameDetails.awayTeam.coachName}</div>
        </Col>
        <Col xs="auto" class="order-1 order-lg-12">
          <img
            class="race-logo"
            src={`/images/races/${gameDetails.awayTeam.raceId}.png`}
            alt={RACE_NAMES[gameDetails.awayTeam.raceId] ||
              `Unknown: ${gameDetails.awayTeam.raceId}`}
            title={RACE_NAMES[gameDetails.awayTeam.raceId] ||
              `Unknown: ${gameDetails.awayTeam.raceId}`}
          />
        </Col>
      </Row>
    </div>
  </Col>
</Row>
<Row class="text-center justify-content-center align-items-center">
  <Col xs="auto">
    {filename}
  </Col>

  <Col xs="auto">
    Stadium:
    <span>{gameDetails.stadiumName}</span>
    {#if gameDetails.stadiumType}
      <span>[{gameDetails.stadiumType}]</span>
    {/if}
  </Col>

  <Col xs="auto">
    {#if gameDetails.leagueName}
      League: {gameDetails.leagueName}
    {:else}
      Friendly
    {/if}
  </Col>

  {#if $replay && $replay.fullReplay.url}
    <Col xs="auto">
      <Button on:click={share} color={shared ? "success" : "primary"}>
        {#if shared}
          Link copied to clipboard!
        {:else}
          Share!
        {/if}
      </Button>
    </Col>
  {/if}
</Row>

<style>
  .race-logo {
    width: 3em;
    height: 3em;
  }
  .score {
    font-size: xx-large;
  }

  .team-name {
    font-size: large;
    font-weight: bold;
  }

  .home {
    color: var(--team0-color-8);
  }

  .away {
    color: var(--team1-color-8);
  }

  .coach {
    font-variant: small-caps;
    font-size: 1rem;
  }
</style>
