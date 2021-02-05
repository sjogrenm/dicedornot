<script>
  import ReplayLoader from "./ReplayLoader.svelte";
  import Loading from "./Loading.svelte";
  import Summary from "./Summary.svelte";
  import Explanation from "./Explanation.svelte";
  import Error from "./Error.svelte";
  import RollDetails from "./RollDetails.svelte";
  import Results from "./Results.svelte";
  import About from "./About.svelte";
  import Nav from "./Nav.svelte";
  import Viewer from "./viewer/Viewer.svelte";
  import { Row, Col, Container, Jumbotron } from "sveltestrap";

  let loading = false;
  let error = false;
  let replay;
  let replayStepIndex = 0;
  let replayStart, replayEnd;
  $: {
    console.log("Replay", replay);
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
  <Nav bind:loading bind:replay bind:replayStart bind:replayEnd />
  <div id="content">
    {#if replay}
      <Container fluid role="main">
        <Row>
          <Col lg="8" class="order-lg-1 order-12">
            <Results
              rolls={replay.rolls}
              {replayStepIndex}
              bind:replayStart
              bind:replayEnd
            />
          </Col>

          <Col lg="4" class="order-lg-12 order-1">
            <Summary
              gameDetails={replay.gameDetails}
              filename={replay.fullReplay.filename}
            />
          </Col>
        </Row>
        <Row>
          <Col lg="8">
            <Viewer
              replaySteps={replay && replay.fullReplay.ReplayStep}
              bind:replayStepIndex
              {replayStart}
              {replayEnd}
            />
          </Col>
          <Col lg="4">
            <RollDetails
              rolls={replay.rolls}
              {replayStepIndex}
              bind:replayStart
              bind:replayEnd
            />
          </Col>
        </Row>
      </Container>
      <div class="container mt-4" role="main">
        <Explanation />
      </div>
    {:else}
      <div class="container">
        <Jumbotron>
          <About />
          <ReplayLoader
            on:replayLoaded={(e) => {
              loading = false;
              replay = e.detail;
              replayStart = null;
              replayEnd = null;
              console.log(e);
            }}
            on:replayLoading={() => {
              replay = null;
              error = false;
              loading = true;
            }}
            on:replayError={() => {
              loading = false;
              error = true;
              replay = null;
            }}
          />
          {#if loading}
            <Loading />
          {/if}
          {#if error}
            <Error />
          {/if}
        </Jumbotron>
      </div>
    {/if}

    <footer class="footer" id="contact">
      <div class="container">
        <p class="text-muted">
          This website is under active development. If you notice issues, please
          post the replay and a description of the problem to
          <a href="https://github.com/cpennington/dicedornot/issues"
            >Diced Or Not Issues</a
          >.
        </p>
      </div>
    </footer>
  </div>
</body>

<style>
  #content {
    margin-left: 200px;
    position: relative;
  }
  .footer {
    padding-top: 10px;
    padding-bottom: 10px;
    background-color: #f5f5f5;
  }

  .container .text-muted {
    margin: 10px 0;
    text-align: center;
  }

  .text-muted {
    color: #777;
  }

  .jumbotron {
    margin-bottom: 0;
  }
</style>
