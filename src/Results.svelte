<script lang="ts">
  import { onMount } from "svelte";
  import embed from "vega-embed";
  import * as vega from "vega";
  import { replayCurrent, replayTarget, replay } from "./stores.js";
  import type { View } from "vega";
  import type {Action} from "./rolls.js";

  let actions: Action[],
    view: View,
    playHead: number | undefined,
    loadedReplay: string | undefined,
    chartEl: HTMLElement;
  export let spec: any;

  onMount(() => {
    return () => {
      if (view) {
        view.finalize();
      }
    };
  });

  $: {
    actions = $replay!.actions;
    if (actions && $replayCurrent) {
      let nextRoll = actions.findIndex((roll) => {
        return $replayCurrent <= roll.startIndex ;
      });
      playHead = nextRoll > 0 ? actions[nextRoll - 1].actionIndex : 0;
    }
    if (view && playHead) {
      var changeSet = vega
        .changeset()
        .remove(() => true)
        .insert([{ actionIndex: playHead }]);
      view = view.change("playHead", changeSet).run();
    }
    if ($replay!.fullReplay.metadata.filename != loadedReplay && chartEl) {
      loadedReplay = $replay!.fullReplay.metadata.filename;
      console.log("Results onMount", { replay: $replay });
      renderChart();
      console.log("Results onMount chart rendered");
    }
  }

  function renderChart() {
    const valid = actions.filter((roll) => {
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
    console.log("Valid actions", valid);
    console.log("Actual points", actuals);

    // Assign the specification to a local variable vlSpec.

    // Embed the visualization in the container with id `vis`
    embed(chartEl, spec).then((result) => {
      result.view.addEventListener("click", function (_, item) {
        if (item) {
          let selectedRoll = item.datum.actionIndex;
          $replayTarget = actions[selectedRoll].startIndex;
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
