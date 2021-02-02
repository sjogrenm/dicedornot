<script>
  import { createEventDispatcher, onMount } from "svelte";
  import embed from "vega-embed";
  import * as vega from "vega";
  import vegaSpec from "../js/vega-spec.js";
  const dispatch = createEventDispatcher();

  export let rolls, replayStepIndex, selectedRoll, replayStart, replayEnd;
  let view, playHead;

  onMount(() => {
    console.log("Results onMount");
    renderChart();
    console.log("Results onMount chart rendered");
    return () => console.log("destroyed");
  });

  $: {
    if (rolls && replayStepIndex) {
      let nextRoll = rolls.findIndex(roll => {
        return replayStepIndex < roll.stepIndex;
      });
      playHead = nextRoll > 0 ? rolls[nextRoll - 1].rollIndex : 0;
    }
    if (view && playHead) {
      var changeSet = vega.changeset().remove(() => true).insert([{rollIndex: playHead}]);
      view = view.change("playHead", changeSet).run();
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
    embed("#chart", vegaSpec).then((result) => {
      result.view.addEventListener("click", function (event, item) {
        if (item) {
          selectedRoll = item.datum.rollIndex;
          replayStart = rolls[selectedRoll].stepIndex;
          replayEnd = rolls[selectedRoll+1].stepIndex;
          console.log("Results clicked", {selectedRoll, replayStart, replayEnd});
        }
      });

      view = result.view;
      view = result.view.insert("actual", actuals).run();
      view = view.insert("simulated", actuals).run();

      var iteration = 0;
      function addValues() {
        var values = [];
        for (var x = 0; x < 50; x++) {
          iteration++;
          values = values.concat(
            valid.map((roll) => roll.simulated(iteration))
          );
        }
        var changeSet = vega.changeset().insert(values);
        view = view.change("simulated", changeSet).run();
        dispatch("iterationComplete", iteration);
        if (iteration < 1000) {
          window.setTimeout(addValues, 200);
        }
      }
      addValues();
    });
  }
</script>

<div id="results">
  <div id="chart" class="col-sm-12" />
</div>

<style>
  #chart {
    width: 100%;
    height: 300px;
  }
</style>
