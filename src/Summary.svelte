<script lang="ts">
  import { RACE_NAMES } from "./constants.js";
  import { Row, Col, Button } from "sveltestrap";
  import { replay as replayStore } from "./stores.js";
  import type * as Internal from "./replay/Internal.js";

  let shared = false,
    replay: Internal.Replay;

  $: {
    replay = $replayStore!.fullReplay;
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
            src={`/images/races/${replay.teams.home.race}.png`}
            alt={RACE_NAMES[replay.teams.home.race] ||
              `Unknown: ${replay.teams.home.race}`}
            title={RACE_NAMES[replay.teams.home.race] ||
              `Unknown: ${replay.teams.home.race}`}
          />
        </Col>
        <Col xs="auto">
          <div class="team">{replay.teams.home.name}</div>
          <div class="coach">{replay.teams.home.coach}</div>
        </Col>
      </Row>
    </div>
  </Col>

  <Col xs="auto" class="text-center">
    <div class="score">
      <span class="home">{replay.finalScore.home}</span> -
      <span class="away">{replay.finalScore.away}</span>
    </div>
  </Col>
  <Col>
    <div class="team-name away">
      <Row class="align-items-center justify-content-center">
        <Col xs="auto" class="order-12 order-lg-1">
          <div class="team">{replay.teams.away.name}</div>
          <div class="coach">{replay.teams.away.coach}</div>
        </Col>
        <Col xs="auto" class="order-1 order-lg-12">
          <img
            class="race-logo"
            src={`/images/races/${replay.teams.away.race}.png`}
            alt={RACE_NAMES[replay.teams.away.race] ||
              `Unknown: ${replay.teams.away.race}`}
            title={RACE_NAMES[replay.teams.away.race] ||
              `Unknown: ${replay.teams.away.race}`}
          />
        </Col>
      </Row>
    </div>
  </Col>
</Row>
<Row class="text-center justify-content-center align-items-center">
  <Col xs="auto">
    {replay.metadata.filename}
  </Col>

  <Col xs="auto">
    Stadium:
    <span>{replay.stadium.name}</span>
    {#if replay.stadium.enhancement}
      <span>[{replay.stadium.enhancement}]</span>
    {/if}
  </Col>

  <Col xs="auto">
    {#if replay.metadata.league}
      League: {replay.metadata.league}
    {:else}
      Friendly
    {/if}
  </Col>

  {#if replay && replay.metadata.url}
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
    color: var(--home-color-8);
  }

  .away {
    color: var(--away-color-8);
  }

  .coach {
    font-variant: small-caps;
    font-size: 1rem;
  }
</style>
