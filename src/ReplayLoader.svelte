<script>
  import { createEventDispatcher } from "svelte";
  import { io } from "../js/io.js";
  import { replay } from "../js/replay.js";

  const dispatch = createEventDispatcher();

  let input;
  function loadReplay() {
    console.log("Preparing to parse XML...");
    dispatch("replayLoading");
    const files = input.files;
    if (files.length > 0) {
      io.xmlToJson(
        files[0],
        function (jsonObj) {
          console.log("Preparing to process replay json...");
          jsonObj.Replay.filename = files[0].name;
          const replayData = replay.processReplay(jsonObj);

          dispatch("replayLoaded", replayData);
        },
        function (err) {
          dispatch("replayError");
          alert(err);
        }
      );
    }
  }
</script>

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

<div class="text-center">
  <span id="file-input-button" class="btn btn-primary btn-file centered">
    Select Replay
    <input
      bind:this={input}
      on:change={loadReplay}
      type="file"
      accept=".bbrz,.zip" />
  </span>
</div>

<svelte:head>
  <script src="https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js">
  </script>
  <script
    src="https://cdnjs.cloudflare.com/ajax/libs/fast-xml-parser/3.17.1/parser.min.js"
    integrity="sha512-JtZhe+DT2O3VPwzAMhyOpVY75fn92Zm1ebHVgAdXFf/x+7SfbonV/O7OWLsHkj11+yMtZAXavsuMvCaQS3WXrQ=="
    crossorigin="anonymous">
  </script>
</svelte:head>
