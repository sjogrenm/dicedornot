<script>
  import { createEventDispatcher } from "svelte";
  import embed from "vega-embed";
  import * as vega from "vega";
  import vegaSpec from "../js/vega-spec.js";
  const dispatch = createEventDispatcher();

  console.log("spec", vegaSpec);

  export let rolls;
  $: {
    renderChart();
  }

  function renderChart() {
    console.log(rolls);
    var values = rolls
      .filter((roll) => {
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
      })
      .map((roll) => roll.actual);

    // Assign the specification to a local variable vlSpec.

    // Embed the visualization in the container with id `vis`
    embed(
      "#chart",
      Object.assign(
        {
          data: {
            name: "rolls",
            values: values,
          },
        },
        vegaSpec
      )
    ).then((result) => {
        result.view.addEventListener("click", function (event, item) {
          if (item) {
            dispatch('rollClicked', {rollIndex: item.datum.rollIndex});
          }
        });

      var iteration = 0;
      function addValues() {
        var values = [];
        for (var x = 0; x < 50; x++) {
          iteration++;
          values = values.concat(
            rolls.map((roll) => roll.simulated(iteration))
          );
        }
        var changeSet = vega.changeset().insert(values);
        result.view.change("rolls", changeSet).run();
        dispatch("iterationComplete", iteration);
        if (iteration < 1000) {
          window.setTimeout(addValues, 200);
        }
      }
      addValues();
    });
  }
</script>

<style>
  #chart {
    width: 100%;
  }
</style>

<div id="results">
  <div id="chart" class="col-sm-12" />
</div>
