<script>
  import { onMount } from "svelte";
  import { io } from "./io.js";
  import { replay, error } from "./stores.js";
  import { processReplay } from "./replay.js";
  import { get, set, entries, keys } from "idb-keyval";
  import Loading from "./Loading.svelte";
import { key } from "vega";

  export let button = "primary",
    loading = null;
  const CACHE_VERSION = 2;

  onMount(() => {
    if (!$replay) {
      loadFromSearchParams();
    }
  });

  let filePicker, urlPicker, cachePicker, replayKeys;
  const rebblRE = /.*rebbl\.net\/rebbl\/match\/([0-9a-f]*)/i;
  const goblinspyRE = /.*mordrek\.com\/gspy\/.*match\/([0-9a-f]*)/i
  const spikeRE = /.*spike\.ovh\/match\?match_uuid=([0-9a-f]*)/i

  async function loadFromSearchParams() {
      const params = new URLSearchParams(window.location.search);
      if (!replayKeys) {
        loading = "Loading saved replays";
        replayKeys = await keys();
        loading = null;
      }
      for (const [key, value] of params) {
        let cacheKey = `${key}-${value}`;
        if (replayKeys.includes(cacheKey)) {
          loadFromCache(cacheKey);
          return;
        }
      }
      const rebblUUID = params.get("rebbl");
      if (rebblUUID) {
        loadRebblReplay(rebblUUID);
        return;
      }
      const gspyMID = params.get("gspy");
      if (gspyMID) {
        loadGoblinspyReplay(gspyMID);
        return;
      }
  }

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
    $error = `Unable to understad match url ${urlPicker.value}. Try something like https://rebbl.net/rebbl/match/1234abcd, https://www.mordrek.com/gspy/comp/1234/match/abcd1234, or https://spike.ovh/match?match_uuid=abcd1234`;
  }

  async function cachedReplays() {
    if (!replayKeys) {
        loading = "Loading saved replays";
        replayKeys = await keys();
        loading = null;
    }
    const allReplays = [];
    for (const key of replayKeys) {
      loading = `Loading ${key}`;
      const replay = await get(key);
      allReplays.push([key, replay]) ;
    }
    loading = null;
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
        homeTeam: firstStep.BoardState.ListTeams.TeamState[0].Data.Name.toString(),
        homeScore: matchResult.Row.HomeScore || 0,
        awayCoach: firstStep.GameInfos.CoachesInfos.CoachInfos[1].UserId,
        awayTeam: firstStep.BoardState.ListTeams.TeamState[1].Data.Name.toString(),
        awayScore: matchResult.Row.AwayScore || 0,
        date: new Date(matchResult.Row.Finished),
        cacheKey,
      };
    });
  }

  async function loadFromCache(cacheKey) {
    loading = `Loading ${cacheKey} from cache`;
    console.log("Loading from cache", { cacheKey });
    const jsonReplayData = await get(cacheKey);
    console.log("Loaded", {jsonReplayData});
    if (jsonReplayData && jsonReplayData.CACHE_VERSION === CACHE_VERSION) {
      try {
        let [replayType, ...replayId] = cacheKey.split('-');
        replayId = replayId.join('-');
        let shareURL = new URL(window.location);
        shareURL.search = "";
        shareURL.fragment = "";
        shareURL.searchParams.set(replayType, replayId);
        window.history.pushState({[replayType]: replayId}, "", shareURL.href)
        $replay = processReplay(jsonReplayData);
        loading = null;
      } catch (err) {
        loading = null;
        $error = err;
        console.error(err);
      }
    }
  }

  async function parseReplay(replayFile, replayType, replayId) {
    loading = `Parsing ${replayFile.name}`;
    io.xmlToJson(
      replayFile,
      function (jsonReplayData) {
        console.log("Preparing to process replay json...");
        jsonReplayData.Replay.filename = replayFile.name;
        jsonReplayData.CACHE_VERSION = CACHE_VERSION;
        let shareURL = new URL(window.location);
        shareURL.search = "";
        shareURL.fragment = "";
        shareURL.searchParams.set(replayType, replayId);
        window.history.pushState({[replayType]: replayId}, "", shareURL.href)
        jsonReplayData.Replay.url = shareURL.href;
        let cacheKey = `${replayType}-${replayId}`;
        set(cacheKey, jsonReplayData);
        console.log("Setting cache", { cacheKey, jsonReplayData });
        try {
          $replay = processReplay(jsonReplayData);
          loading = null;
        } catch (err) {
          loading = null;
          $error = err;
          console.error(err);
        }
      },
      function (err) {
        loading = null;
        $error = err;
        alert(err);
      }
    );
  }

  async function loadRebblReplay(uuid) {
    loading = `Loading ${uuid} from rebbl.net`;
    $error = null;
    let replayFile = await fetch(
      `https://rebbl.net/api/v2/match/${uuid}/replay`
    ).then((r) => r.json());
    if (replayFile.filename && replayFile.filename != "No replay file found") {
      loading = `Downloading ${replayFile.filename}`;
      const blob = await fetch(replayFile.filename).then((r) => r.blob());
      loading = null;
      const file = new File([blob], replayFile.filename);
      parseReplay(file, 'rebbl', uuid);
    } else {
      $error = `Unable to load replay for https://rebbl.net/rebbl/match/${uuid}`;
      loading = null;
    }
  }

  async function loadGoblinspyReplay(mid) {
    loading = `Loading ${mid} from GoblinSpy`;
    $error = null;
    let replayFile = await fetch(
      `https://www.mordrek.com:666/api/v1/match/${mid}/url`
    ).then((r) => r.json());
    console.log("Replayfile", {replayFile});
    if (replayFile) {
      loading = `Downloading ${replayFile}`;
      const blob = await fetch(replayFile).then((r) => r.blob());
      loading = null;
      const file = new File([blob], replayFile);
      parseReplay(file, 'gspy', mid);
    } else {
      $error = `Unable to load replay for https://www.mordrek.com/gspy/match/${mid}. Try again later.`;
      loading = null;
    }
  }

  async function loadReplay() {
    console.log("Preparing to parse XML...");
    loading = true;
    $error = null;
    const files = filePicker.files;
    if (files.length > 0) {
      parseReplay(files[0], 'file', files[0].name);
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
              loadFromCache(ev.data);
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
  <Loading {loading}/>
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
