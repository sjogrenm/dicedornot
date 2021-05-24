<script lang="ts">
  import { Row, Col } from "sveltestrap";
  import { SIDE } from "./constants";
  import { replay } from "./stores";

  export let homeTeam: string, awayTeam: string;
  interface Value {
    team: SIDE,
    netValue: number
  }

  type Values = Record<SIDE, number>;

  let cumNetValues: { actuals: Values; simulated: Record<number, Values> },
    actuals,
    homePercentile = 0.5,
    awayPercentile = 0.5;

  function percentRank(array: number[], n: number) {
    var L = 0;
    var S = 0;
    var N = array.length;

    for (var i = 0; i < array.length; i++) {
      if (array[i] < n) {
        L += 1;
      } else if (array[i] === n) {
        S += 1;
      } else {
      }
    }

    var pct = (L + 0.5 * S) / N;

    return pct;
  }

  $: {
    cumNetValues = { actuals: {[SIDE.home]: 0, [SIDE.away]: 0}, simulated: {} };
    actuals = $replay!.actions.map((action) => ({
      team: action.activeTeam ? action.activeTeam.id : SIDE.home,
      netValue: action.valueWithDependents.singularValue - action.expectedValue,
    }));
    cumNetValues.actuals = accumulateNetValue(actuals);
    updatePercentiles();
  }

  function accumulateNetValue(values: Value[]) {
    let dest: Values = {[SIDE.home]: 0, [SIDE.away]: 0};
    values.forEach((dataPoint) => {
      dest[dataPoint.team] = (dest[dataPoint.team] || 0) + dataPoint.netValue;
    });
    return dest;
  }
  function betterThan(team: string, percentile: number) {
    let qualifier = percentile < 0.25 ? "only " : "";
    let count = percentile * 100,
      countDisp: string;
    if (count > 99) {
      countDisp = count.toFixed(1);
    } else if (count < 10) {
      countDisp = count.toFixed(2);
    } else {
      countDisp = count.toFixed(0);
    }
    return `${team}'s actions were better than ${qualifier}${countDisp} in 100 games`;
  }
  function diced(team: string, percentile: number): string {
    const sample = (items: string[]): string => items[team.length % items.length];

    if (percentile > 0.985) {
      return "Nuffle's light shone down on them.";
    } else if (percentile > 0.9) {
      return sample([
        "Nuffle favored them.",
        "Game of Skill",
        "Just rolled Pows",
        "Blood Bowl is just like Chess",
        "They are vacationing in Maui, because those dice were hot!",
      ]);
    } else if (percentile > 0.8) {
      return sample([
        "Nuffle was generous.",
        "In blodge we trust",
        "Scatter don't matter",
        `Who has two thumbs and all the dice? ${team}`,
      ]);
    } else if (percentile < 0.01) {
      return sample([
        "An absolute, unmitigated dicing.",
        "Fuck this game.",
        "Rogered but good.",
      ]);
    } else if (percentile < 0.1) {
      return sample([
        "Quite a dicing.",
        `And 'lo, Nuffle did look down, and he said "No."`,
        "Because without hope, Nuffle would have nothing to destroy.",
        "They skipped their sacrifice to Nuffle",
        "Nuffle hated them",
        "They must be in the arctic cause those dice were frozen!",
        "The should try Necromantic next season, because their dice are dead!",
      ]);
    } else if (percentile < 0.3) {
      return sample([
        "A bit of a dicing.",
        "Why do I believe in blodge?",
        "Unfair dices! Unfair game!",
        "They couldn't roll their way out of a paper bag",
        `Who has two thumbs and none of the dice? ${team}`,
      ]);
    } else {
      return "Variance, man. Variance.";
    }
  }

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function updatePercentiles() {
    await sleep(2000);
    var iteration = 0;
    for (var c = 0; c < 500; c++) {
      console.log("Computing 50 simulated games");
      for (var x = 0; x < 50; x++) {
        iteration++;
        let newValues = $replay!.actions.map((action) => ({
          team: action.activeTeam ? action.activeTeam.id : SIDE.home,
          netValue: action.possibleOutcomes.sample() - action.expectedValue,
        }));
        cumNetValues.simulated[iteration] = accumulateNetValue(newValues);
      }
      let oldHome = homePercentile,
        oldAway = awayPercentile;
      homePercentile = percentRank(
        Object.values(cumNetValues.simulated).map((cum) => cum[0]),
        cumNetValues.actuals[0]
      );
      awayPercentile = percentRank(
        Object.values(cumNetValues.simulated).map((cum) => cum[1]),
        cumNetValues.actuals[1]
      );
      console.log("Simulation iteration complete", {
        totalGames: c * 50,
        homeDelta: Math.abs(homePercentile - oldHome),
        awayDelta: Math.abs(awayPercentile - oldAway),
        homePercentile,
        oldHome,
        awayPercentile,
        oldAway,
      });
      if (
        c > 10 &&
        Math.abs(homePercentile - oldHome) < 0.001 &&
        Math.abs(awayPercentile - oldAway) < 0.001
      ) {
        return;
      }

      await sleep(100);
    }
  }
</script>

<div class="diced">
  <Row>
    <Col>
      <div class="home">
        <p>
          {betterThan(homeTeam, homePercentile)}<br />
          {diced(homeTeam, homePercentile)}
        </p>
      </div>
    </Col>
    <Col>
      <div class="away">
        <p>
          {betterThan(awayTeam, awayPercentile)}<br />
          {diced(awayTeam, awayPercentile)}
        </p>
      </div>
    </Col>
  </Row>
</div>

<style>
  .diced {
    font-size: large;
    font-weight: bold;
    text-align: center;
  }
  .home {
    color: var(--team0-color-8);
  }

  .away {
    color: var(--team1-color-8);
  }
</style>
