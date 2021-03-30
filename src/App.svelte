<script lang="ts">
  import ReplayLoader from "./ReplayLoader.svelte";
  import Summary from "./Summary.svelte";
  import RollDetails from "./RollDetails.svelte";
  import About from "./About.svelte";
  import Nav from "./Nav.svelte";
  import Viewer from "./viewer/Viewer.svelte";
  import Diced from "./Diced.svelte";
  import { Jumbotron } from "sveltestrap";
  import { replay, showResultsAnalysis } from "./stores.js";
  import TurnSelectors from "./TurnSelectors.svelte";
  import Error from "./Error.svelte";
  import ImprobabilityResults from "./ImprobabilityResults.svelte";
  import ValueResults from "./ValueResults.svelte";
  import ValueDistributionResults from "./ValueDistributionResults.svelte";
  import ExpectedValueResults from "./ExpectedValueResults.svelte";
  import Terminology from "./Terminology.svelte";
  import Todo from "./Todo.svelte";
  import Theme from "./Theme.svelte";

  let homePercentile: number, awayPercentile: number, loading: boolean, playing: boolean;
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
</svelte:head>

<Theme>
  <div class="scroll-container">
    <div class="scroll-step">
      <Nav/>
      <Error />
    </div>
    {#if $replay}
      <div class="container-fluid scroll-step" role="main">
        <div class="row">
          <div class="col">
              {#if $showResultsAnalysis}
              <Diced
                homeTeam={$replay.gameDetails.homeTeam.coachName}
                awayTeam={$replay.gameDetails.awayTeam.coachName}
              />
            {/if}
            <Summary />
          </div>
        </div>
        <div class="row justify-content-center">
          <div class="col col-auto">
            {#key $replay.fullReplay.filename}
              <Viewer bind:playing />
            {/key}
          </div>
          <div class="col justify-content-center turns">
            <TurnSelectors />
            <RollDetails/>
          </div>
        </div>
          <div class="row">
            <div class="col">
              {#if $showResultsAnalysis}
              <ImprobabilityResults />
              <ValueResults />
              {:else}
              <ExpectedValueResults/>
              {/if}
              <ValueDistributionResults />
            </div>
          </div>
      </div>
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

    <div class="container pt-2 pb-2">
      {#if $replay}
        <Terminology />
        {#if !$showResultsAnalysis}
          <div class="row alert alert-warning" role="alert">
            <div class="col col-9">
            <p>
              Results-based analysis will hinder your Blood Bowl learning process. Focus on whether the actions you took and the dice you rolled were the best possible, rather than on the results of those dice rolls.
            </p>
          </div>
            <div class="col col-3">
              <button class="btn btn-danger" on:click={() => {$showResultsAnalysis = true}}>I know, show me anyway!</button>
            </div>
          </div>
        {/if}
      {/if}
      <Todo />
    </div>

    <footer class="footer" id="contact">
      <div class="container">
        <p class="text-muted text-center">
          This website is under active development. If you notice issues, please
          post the replay and a description of the problem to
          <a href="https://github.com/cpennington/dicedornot/issues"
            >Diced Or Not Issues</a
          >, or message
          <a href="https://discordapp.com/users/123511435408965632"
            >vengefulpickle on Discord</a
          >.
        </p>
      </div>
    </footer>
  </div>
</Theme>

<style>
  .scroll-container {
    scroll-snap-type: y proximity;
  }
  .scroll-step {
    scroll-snap-align: start;
  }

  .turns {
    min-width: 360px;
    max-width: 800px;
  }
</style>
