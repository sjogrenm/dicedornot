<script>
  import { onMount } from "svelte";
  import { io } from "./io.js";
  import { replay } from "./stores.js";
  import { processReplay } from "./replay.js";
  import { get, set, entries } from "idb-keyval";
  import Loading from "./Loading.svelte";
  import Error from "./Error.svelte";

  export let button = "primary",
    loading,
    error;
  const CACHE_VERSION = 2;

  onMount(() => {
    if (!$replay) {
      const params = new URLSearchParams(window.location.search);
      const rebblUUID = params.get("rebbl");
      if (rebblUUID) {
        loadRebblReplay(rebblUUID);
      }
      const gspyMID = params.get("gspy");
      if (gspyMID) {
        loadGoblinspyReplay(gspyMID);
      }
    }
  });

  let filePicker, urlPicker, cachePicker;
  const rebblRE = /.*rebbl\.net\/rebbl\/match\/([0-9a-f]*)/i;
  const goblinspyRE = /.*mordrek\.com\/gspy\/.*match\/([0-9a-f]*)/i
  const spikeRE = /.*spike\.ovh\/match\?match_uuid=([0-9a-f]*)/i

  function loadURL() {
    if (!urlPicker.value) {
      return;
    }
    const rebblMatch = urlPicker.value.match(rebblRE);
    if (rebblMatch) {
      loadRebblReplay(rebblMatch[1]);
      return;
    }
    const goblinspyMatch = urlPicker.value.match(goblinspyRE);
    if (goblinspyMatch) {
      loadGoblinspyReplay(goblinspyMatch[1]);
      return;
    }
    const spikeMatch = urlPicker.value.match(spikeRE);
    if (spikeMatch) {
      loadGoblinspyReplay(`cid_${spikeMatch[1]}`);
      return;
    }
    error = `Unable to understad match url ${urlPicker.value}. Try something like https://rebbl.net/rebbl/match/1234abcd, https://www.mordrek.com/gspy/comp/1234/match/abcd1234, or https://spike.ovh/match?match_uuid=abcd1234`;
  }

  async function cachedReplays() {
    const allReplays = await entries();
    const validReplays = allReplays.filter(
      ([_, replay]) => replay.CACHE_VERSION === CACHE_VERSION
    );
    return validReplays.map(([cacheKey, replayJSON]) => {
      const firstStep = replayJSON.Replay.ReplayStep[0];
      const matchResult =
        replayJSON.Replay.ReplayStep[replayJSON.Replay.ReplayStep.length - 1]
          .RulesEventGameFinished.MatchResult;
      return {
        homeCoach: firstStep.GameInfos.CoachesInfos.CoachInfos[0].UserId,
        homeTeam: firstStep.BoardState.ListTeams.TeamState[0].Data.Name,
        homeScore: matchResult.Row.HomeScore || 0,
        awayCoach: firstStep.GameInfos.CoachesInfos.CoachInfos[1].UserId,
        awayTeam: firstStep.BoardState.ListTeams.TeamState[1].Data.Name,
        awayScore: matchResult.Row.AwayScore || 0,
        date: new Date(matchResult.Row.Finished),
        cacheKey,
      };
    });
  }

  async function loadFromCache(cacheKey, completeLoad) {
    const jsonReplayData = await get(cacheKey);
    console.log("Loading from cache", { cacheKey, jsonReplayData });
    if (jsonReplayData && jsonReplayData.CACHE_VERSION === CACHE_VERSION) {
      try {
        $replay = processReplay(jsonReplayData);
        loading = false;
      } catch (err) {
        loading = false;
        error = err;
        console.error(err);
      }
    } else {
      await completeLoad(cacheKey);
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
        console.log("Setting cache", { cacheKey, jsonReplayData });
        try {
          $replay = processReplay(jsonReplayData);
          loading = false;
        } catch (err) {
          loading = false;
          error = err;
          console.error(err);
        }
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
    loadFromCache(`rebbl-${uuid}`, async (cacheKey) => {
      let replayFile = await fetch(
        `https://rebbl.net/api/v2/match/${uuid}/replay`
      ).then((r) => r.json());
      if (replayFile.filename && replayFile.filename != "No replay file found") {
        const blob = await fetch(replayFile.filename).then((r) => r.blob());
        const file = new File([blob], replayFile.filename);
        parseReplay(file, cacheKey);
      } else {
        error = `Unable to load replay for https://rebbl.net/rebbl/match/${uuid}`;
        loading = false;
      }
    });
  }

  async function loadGoblinspyReplay(mid) {
    loading = true;
    error = null;
    loadFromCache(`gspy-${mid}`, async (cacheKey) => {
      let replayFile = await fetch(
        `https://www.mordrek.com:666/api/v1/match/${mid}/url`
      ).then((r) => r.json());
      console.log("Replayfile", {replayFile});
      if (replayFile) {
        const blob = await fetch(replayFile).then((r) => r.blob());
        const file = new File([blob], replayFile);
        parseReplay(file, cacheKey);
      } else {
        error = `Unable to load replay for https://www.mordrek.com/gspy/match/${mid}. Try again later.`;
        loading = false;
      }
    });
  }

  async function loadReplay() {
    console.log("Preparing to parse XML...");
    loading = true;
    error = null;
    const files = filePicker.files;
    if (files.length > 0) {
      loadFromCache(`file-${files[0].name}`, (cacheKey) =>
        parseReplay(files[0], cacheKey)
      );
    }
  }
</script>

<div>
  <div class="row align-items-center justify-content-center">
    <div class="col-auto">
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
  </div>
  <div class="row align-items-center justify-content-center pt-2">
    <div class="col col-md-7 col-lg-5">
      <input
        bind:this={urlPicker}
        type="text"
        class="form-control form-control-sm"
        placeholder="Paste your ReBBL, GoblinSpy or Spike match url here..."
      />
    </div>
    <div class="col-auto">
      <button class={`btn btn-${button}`} on:click={loadURL}>Load</button>
    </div>
  </div>
  {#await cachedReplays() then replays}
    <div class="row align-items-center justify-content-center pt-2">
      <div class="col-auto">
        <label for="saved-replay-choice">Saved replays:</label>
      </div>
      <div class="col">
        <input
          list="saved-replay-options"
          id="saved-replay-choice"
          name="saved-replay-choice"
          placeholder="Enter team name here for saved replay..."
          bind:this={cachePicker}
          on:input={(ev) => {
            if (replays.map(replay => replay.cacheKey).includes(ev.data)) {
              cachePicker.value = "";
              loadFromCache(ev.data, (cacheKey) =>
                alert(`Unable to load ${cacheKey} from cache`)
              );
            }
          }}
        />

        <datalist id="saved-replay-options">
          {#each replays as replay (replay.cacheKey)}
            <option value={replay.cacheKey}
              >{replay.homeTeam}
              {replay.homeScore}-{replay.awayScore}
              {replay.awayTeam} [{replay.date.toLocaleString()}]</option
            >
          {/each}
        </datalist>
      </div>
    </div>
  {/await}
  {#if loading}
    <Loading />
  {/if}
  <Error {error} />
</div>

<style>
  #saved-replay-choice {
    width: 100%;
  }
  .btn-file {
    position: relative;
    overflow: hidden;
  }

  .btn-file input[type="file"] {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    outline: none;
    background: white;
    cursor: inherit;
    display: block;
  }
</style>
