<script>
  import { onMount } from "svelte";
  import { io } from "./io.js";
  import { replay, replayStart, replayEnd } from "./stores.js";
  import { processReplay } from "./replay.js";
  import { get, set } from "idb-keyval";
  import Loading from "./Loading.svelte";
  import Error from "./Error.svelte";

  export let button = "primary",
    loading,
    error;
  const CACHE_VERSION = 1;

  onMount(() => {
    if (!$replay) {
      const params = new URLSearchParams(window.location.search);
      const rebblUUID = params.get("rebbl");
      if (rebblUUID) {
        loadRebblReplay(rebblUUID);
      }
    }
  });

  let filePicker, urlPicker;
  const rebblRE = /https?:\/\/rebbl.net\/rebbl\/match\/([0-9a-f]*)/i;

  function loadURL() {
    const rebblMatch = urlPicker.value.match(rebblRE);
    if (rebblMatch) {
      loadRebblReplay(rebblMatch[1]);
    }
  }

  async function loadFromCache(cacheKey, completeLoad) {
    const jsonReplayData = await get(cacheKey);
    console.log("Loading from cache", {cacheKey, jsonReplayData});
    if (jsonReplayData && jsonReplayData.CACHE_VERSION === CACHE_VERSION) {
      loading = false;
      $replay = processReplay(jsonReplayData);
      $replayStart = null;
      $replayEnd = null;
    } else {
      await completeLoad(cacheKey)
    }
  }

  async function parseReplay(replayFile, cacheKey) {
    io.xmlToJson(
      replayFile,
      function (jsonReplayData) {
        console.log("Preparing to process replay json...");
        jsonReplayData.Replay.filename = replayFile.name;
        jsonReplayData.CACHE_VERSION = CACHE_VERSION;
        set(cacheKey, jsonReplayData);
        console.log("Setting cache", {cacheKey, jsonReplayData});
        const replayData = processReplay(jsonReplayData);

        loading = false;
        $replay = replayData;
        $replayStart = null;
        $replayEnd = null;
      },
      function (err) {
        loading = false;
        error = err;
        alert(err);
      }
    );
  }

  async function loadRebblReplay(uuid) {
    loading = true;
    error = null;
    loadFromCache(`rebbl-${uuid}`, async cacheKey => {
      let replayFile = await fetch(
        `https://rebbl.net/api/v2/match/${uuid}/replay`
      ).then((r) => r.json());
      if (replayFile.filename) {
        const blob = await fetch(replayFile.filename).then((r) => r.blob());
        const file = new File([blob], replayFile.filename);
        parseReplay(file, cacheKey);
      }
    })
  }

  async function loadReplay() {
    console.log("Preparing to parse XML...");
    loading = true;
    error = null;
    const files = filePicker.files;
    if (files.length > 0) {
      loadFromCache(`file-${files[0]}`, cacheKey => parseReplay(files[0], cacheKey))
    }
  }
</script>

<div>
  <div class="row align-items-center justify-content-md-center">
    <span id="file-input-button" class={`btn btn-${button} btn-file centered`}>
      Select Replay
      <input
        bind:this={filePicker}
        on:change={loadReplay}
        type="file"
        accept=".bbrz,.zip"
      />
    </span>
  </div>
  <div class="row align-items-center justify-content-md-center pt-2">
    <div class="col-3">
      <input
        bind:this={urlPicker}
        type="text"
        class="form-control form-control-sm"
        placeholder="Paste your rebbl.net match url here..."
      />
    </div>
    <div class="col-auto">
      <button class={`btn btn-${button}`} on:click={loadURL}>Load</button>
    </div>
  </div>
  {#if loading}
    <Loading />
  {/if}
  {#if error}
    <Error {error}/>
  {/if}
</div>

<svelte:head
  ><script src="https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js">
  </script><script
    src="https://cdnjs.cloudflare.com/ajax/libs/fast-xml-parser/3.17.1/parser.min.js"
    integrity="sha512-JtZhe+DT2O3VPwzAMhyOpVY75fn92Zm1ebHVgAdXFf/x+7SfbonV/O7OWLsHkj11+yMtZAXavsuMvCaQS3WXrQ=="
    crossorigin="anonymous">
  </script></svelte:head
>

<style>
  .btn-file {
    position: relative;
    overflow: hidden;
  }

  .btn-file input[type="file"] {
    position: absolute;
    top: 0;
    right: 0;
    min-width: 100%;
    min-height: 100%;
    font-size: 100px;
    text-align: right;
    filter: alpha(opacity=0);
    opacity: 0;
    outline: none;
    background: white;
    cursor: inherit;
    display: block;
  }
</style>
