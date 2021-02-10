<script>
  import { createEventDispatcher, onMount } from "svelte";
  import embed from "vega-embed";
  import * as vega from "vega";
  import vegaSpec from "./vega-spec.js";
  import { replayCurrent, replayTarget, replay } from "./stores.js";
  import { ReplayPosition , REPLAY_STEP} from "./replay-utils.js";
import { percentRank } from "./utils.js";

  let rolls, view, playHead, cumNetValues = {actuals: {}, simulated: {}};
  export let homePercentile, awayPercentile;

  onMount(() => {
    console.log("Results onMount");
    renderChart();
    console.log("Results onMount chart rendered");
    return () => console.log("destroyed");
  });

  $: {
    rolls = $replay.rolls;
    if (rolls && $replayCurrent) {
      let nextRoll = rolls.findIndex((roll) => {
        const rollPosition = new ReplayPosition(
          roll.stepIndex,
          REPLAY_STEP.BoardAction,
          roll.actionIndex,
          roll.resultIndex
        );
        return rollPosition.atOrAfter($replayCurrent);
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
  }

  function accumulateNetValue(values) {
    let dest = {};
    values.forEach(dataPoint => {
      dest[dataPoint.activeTeamId] = (dest[dataPoint.activeTeamId] || 0) + dataPoint.netValue;
    });
    return dest;
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
          let selectedRoll = item.datum.rollIndex;
          $replayTarget = rolls[selectedRoll].startIndex;
        }
      });

      view = result.view;
      view = result.view.insert("actual", actuals).run();
      view = view.insert("simulated", actuals).run();

      cumNetValues.actuals = accumulateNetValue(actuals);

      var iteration = 0;
      function addValues() {
        var values = [];
        for (var x = 0; x < 50; x++) {
          iteration++;
          let newValues = valid.map((roll) => roll.simulated(iteration));
          cumNetValues.simulated[iteration] = accumulateNetValue(newValues);
          values.push(...newValues);
        }

        homePercentile = percentRank(Object.values(cumNetValues.simulated).map(cum => cum[0]), cumNetValues.actuals[0]);
        awayPercentile = percentRank(Object.values(cumNetValues.simulated).map(cum => cum[1]), cumNetValues.actuals[1]);

        var changeSet = vega.changeset().insert(values);
        view = view.change("simulated", changeSet).run();
        if (iteration < 1000) {
          window.setTimeout(addValues, 200);
        }
      }
      addValues();
    });
  }
</script>

<div id="chart" class="col-sm-12" />

<style>
  #chart {
    width: 100%;
    height: 300px;
  }
</style>
