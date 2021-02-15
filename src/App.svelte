<script>
  import ReplayLoader from "./ReplayLoader.svelte";
  import Summary from "./Summary.svelte";
  import Explanation from "./Explanation.svelte";
  import RollDetails from "./RollDetails.svelte";
  import Results from "./Results.svelte";
  import About from "./About.svelte";
  import Nav from "./Nav.svelte";
  import Viewer from "./viewer/Viewer.svelte";
  import Diced from "./Diced.svelte";
  import { Row, Col, Container, Jumbotron } from "sveltestrap";
  import { replay } from "./stores.js";
  import TurnSelectors from "./TurnSelectors.svelte";
  import Error from "./Error.svelte";
  import {improbabilitySpec, valueSpec, valueDistributionSpec} from "./vega-spec.js";

  let homePercentile, awayPercentile, loading;
  $: {
    console.log("Replay", $replay);
  }
</script>

<svelte:head>
  <meta charset="utf-8" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta
    property="og:title"
    content="Diced or Not? - Blood Bowl 2 Replay Luck Analyzer"
  />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="http://vengefulpickle.com/DicedOrNot" />
  <meta
    property="og:description"
    content="Blood Bowl 2 replay and luck analyzer. Use it to decide whether you actually got diced."
  />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:url" content="http://vengefulpickle.com/DicedOrNot" />
  <meta
    name="twitter:title"
    content="Diced or Not? - Blood Bowl 2 Replay Luck Analyzer"
  />
  <meta
    name="twitter:description"
    content="Blood Bowl 2 replay luck analyzer. Use it to decide whether you actually got diced."
  />
  <title>Diced or Not? - Blood Bowl 2 Replay Luck Analyzer</title>
  <link rel="stylesheet" href="/styles/theme.css" />
</svelte:head>

<body>
  <Nav bind:loading />
  <Error />
  {#if $replay}
    <Container fluid role="main">
      <Row>
        <Col>
          <Diced
            homeTeam={$replay.gameDetails.homeTeam.coachName}
            awayTeam={$replay.gameDetails.awayTeam.coachName}
            {homePercentile}
            {awayPercentile}
          />
          <Summary
            gameDetails={$replay.gameDetails}
            filename={$replay.fullReplay.filename}
          />
        </Col>
      </Row>
      <Row>
        <Col lg="9">
          {#key $replay.fullReplay.filename}
            <Viewer />
          {/key}
        </Col>
        <Col lg="3" class="justify-content-center">
          <TurnSelectors />
          <RollDetails />
        </Col>
      </Row>
      <Row>
        <Col>
          <Results spec={improbabilitySpec}/>
          <Results spec={valueSpec}/>
          <Results spec={valueDistributionSpec}/>
        </Col>
      </Row>
    </Container>
    <div class="container mt-4" role="main">
      <ReplayLoader bind:loading />
      <!-- <Explanation /> -->
    </div>
  {:else}
    <div class="container">
      <Jumbotron>
        <About />
        <ReplayLoader bind:loading />
      </Jumbotron>
    </div>
  {/if}

  <Container class="pt-2 pb-2">
    <details>
      <summary><span class="font-weight-bold">Known Issues</span></summary>
      <ul>
        <li>Analyzer: Apo rolls aren't merged correctly</li>
        <li>
          Analyzer: Available team rerolls aren't accounted for in expectations
        </li>
        <li>Analyzer: Bribe isn't accounted for in foul expectations</li>
        <li>
          Analyzer: Catch and scatter aren't accounted for in pass/handoff
          expectations
        </li>
        <li>Analyzer: Frenzy blocks aren't merged together</li>
        <li>Analyzer: Interceptions are accounted on the incorrect player</li>
        <li>
          Analyzer: Nega-trait rolls absorb moves with associated values, even
          though they don't end the turn
        </li>
        <li>Analyzer: Piling On isn't accounted for in block result options</li>
        <li>
          Analyzer: Push/Follow Up/Standfirm affects on player position value
          aren't accounted for
        </li>
        <li>
          Viewer: Dice rolls expand exactly in line with the replay viewer
        </li>
        <li>Viewer: Inducements aren't displayed</li>
        <li>
          Viewer: Jumping around the replay while paused doesn't work correctly
        </li>
        <li>Viewer: Player names don't wrap/scale to fit</li>
        <li>Viewer: Replay doesn't start at beginning when it's reloaded</li>
        <li>Viewer: Roll details auto-close when the player is playing</li>
        <li>Viewer: Score and team names don't scale with viewer scale</li>
        <li>Viewer: Tackle zones aren't displayed</li>
        <li>
          Viewer: There's no way to search by race or coach in saved replays
        </li>
        <li>
          Viewer: Throw teammate doesn't correctly render intermediate states
        </li>
        <li>Viewer/Analyzer: Star Player names are wrong</li>
        <li>
          Analyzer: Many roll types:
          <ul>
            <li>AlwaysHungryRoll</li>
            <li>Animosity</li>
            <li>BallAndChain</li>
            <li>Bite</li>
            <li>Bloodlust</li>
            <li>Bomb KD</li>
            <li>Bribe</li>
            <li>Chainsaw (Kickback?)</li>
            <li>Chainsaw Armor</li>
            <li>Diving Tackle</li>
            <li>EatTeammate</li>
            <li>FansRoll</li>
            <li>HailMaryPassRoll,</li>
            <li>Halfling Chef</li>
            <li>HypnoticGazeRoll,</li>
            <li>Inaccurate Pass Scatter</li>
            <li>Juggernaut</li>
            <li>Kickoff Gust</li>
            <li>Kickoff Scatter</li>
            <li>LonerRoll,</li>
            <li>Multiblock</li>
            <li>ProRoll,</li>
            <li>Raise Dead</li>
            <li>SafeThrow</li>
            <li>Shadowing</li>
            <li>Some sort of wrestle roll that doesn't do anything</li>
            <li>StabRoll</li>
            <li>Stand Firm 2</li>
            <li>Swealtering Heat</li>
            <li>Tentacles</li>
            <li>Throw-in Roll</li>
            <li>Touch Back</li>
            <li>Weather</li>
          </ul>
        </li>
      </ul>
    </details>
  </Container>

  <footer class="footer" id="contact">
    <div class="container">
      <p class="text-muted text-center">
        This website is under active development. If you notice issues, please
        post the replay and a description of the problem to
        <a href="https://github.com/cpennington/dicedornot/issues"
          >Diced Or Not Issues</a
        >.
      </p>
    </div>
  </footer>
</body>

<style>
</style>
