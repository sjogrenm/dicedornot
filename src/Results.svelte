<script>
  import { onMount } from "svelte";
  import embed from "vega-embed";
  import * as vega from "vega";
  import { replayCurrent, replayTarget, replay } from "./stores.js";

  let rolls,
    view,
    playHead,
    activeTimeout,
    loadedReplay,
    chartEl;
  export let spec;

  onMount(() => {
    return () => {
      if (view) {
        view.finalize();
      }
      if (activeTimeout) {
        clearTimeout(activeTimeout);
        activeTimeout = null;
      }
    };
  });

  $: {
    rolls = $replay.rolls;
    if (rolls && $replayCurrent) {
      let nextRoll = rolls.findIndex((roll) => {
        return roll.startIndex.atOrAfter($replayCurrent);
      });
      playHead = nextRoll > 0 ? rolls[nextRoll - 1].rollIndex : 0;
    }
    if (view && playHead) {
      var changeSet = vega
        .changeset()
        .remove(() => true)
        .insert([{ rollIndex: playHead }]);
      view = view.change("playHead", changeSet).run();
    }
    if ($replay.fullReplay.filename != loadedReplay && chartEl) {
      loadedReplay = $replay.fullReplay.filename;
      if (activeTimeout) {
        clearTimeout(activeTimeout);
        activeTimeout = null;
      }
      console.log("Results onMount", { replay: $replay });
      renderChart();
      console.log("Results onMount chart rendered");
    }
  }

  function renderChart() {
    const valid = rolls.filter((roll) => {
      const dataPoint = roll.actual;
      if (!isFinite(dataPoint.outcomeValue)) {
        console.warn("Dice roll with non-finite outcome value", {
          roll: roll,
          dataPoint: dataPoint,
        });
        return false;
      }
      if (!isFinite(dataPoint.expectedValue)) {
        console.warn("Dice roll with non-finite expected value", {
          roll: roll,
          dataPoint: dataPoint,
        });
        return false;
      }
      return true;
    });
    const actuals = valid.map((roll) => roll.actual);
    console.log("Valid rolls", valid);
    console.log("Actual points", actuals);

    // Assign the specification to a local variable vlSpec.

    // Embed the visualization in the container with id `vis`
    console.log(chartEl);
    embed(chartEl, spec).then((result) => {
      result.view.addEventListener("click", function (event, item) {
        if (item) {
          let selectedRoll = item.datum.rollIndex;
          $replayTarget = rolls[selectedRoll].startIndex;
        }
      });

      view = result.view;
      view = result.view.insert("actual", actuals).run();
      // view = view.insert("simulated", actuals).run();

    });
  }
</script>

<div class="chart" bind:this={chartEl} />

<style>
  .chart {
    width: 100%;
    height: 300px;
    margin-top: 2em;
  }
</style>
