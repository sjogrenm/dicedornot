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

  let loading = false;
  let error = false;
  let replay;
  let selectedRoll;
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
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/bootstrap@4.4.1/dist/css/bootstrap.min.css"
    integrity="sha256-L/W5Wfqfa0sdBNIKN9cG6QA5F2qx4qICmU2VgLruv9Y="
    crossorigin="anonymous"
  />
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/datatables@1.10.18/media/css/jquery.dataTables.min.css"
    integrity="sha256-YY1izqyhIj4W3iyJOaGWOpXDSwrHWFL4Nfk+W0LyCHE="
    crossorigin="anonymous"
  />
</svelte:head>

<body>
  <Nav />
  <div id="content">
    <div class="container-flex">
      <div class="jumbotron">
        <About />
        <ReplayLoader
          on:replayLoaded={(e) => {
            loading = false;
            replay = e.detail;
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
      </div>

      {#if loading}
        <Loading />
      {/if}
      {#if error}
        <Error />
      {/if}
    </div>
    {#if replay}
      <div class="container-fluid" role="main">
        <div class="row">
          <Summary gameDetails={replay.gameDetails} />
        </div>
        <div class="row">
          <div class="col-8">
            <Results
              rolls={replay.rolls}
              on:rollClicked={(e) => (selectedRoll = e.detail.rollIndex)}
            />
            <Viewer
              replaySteps={replay && replay.fullReplay.ReplayStep}
            />
          </div>
          <div class="col-4">
            <RollDetails rolls={replay.rolls} bind:selectedRoll />
          </div>
        </div>
      </div>
      <div class="container" role="main">
        <Explanation />
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
