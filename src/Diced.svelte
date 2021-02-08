<script>
  import { Row, Col } from "sveltestrap";
  import { percentRank } from "./utils";
  export let homePercentile, awayPercentile, homeTeam, awayTeam;
  function betterThan(team, percentile) {
    let comparison = percentile < 0.5 ? "worse" : "better";
    let count = percentile < 0.5 ? 100 - percentile * 100 : percentile * 100;
    return `${team}'s rolls were ${comparison} than ${count.toFixed(
      0
    )} in 100 games`;
  }
  function diced(percentile) {
    if (percentile > 0.99) {
      return "Nuffle's light shown down on them.";
    } else if (percentile > 0.9) {
      return "Nuffle favored them.";
    } else if (percentile > 0.7) {
      return "Nuffle was generous.";
    } else if (percentile < 0.3) {
      return "A bit of a dicing.";
    } else if (percentile < 0.1) {
      return "Quite a dicing.";
    } else if (percentile < 0.01) {
      return "An absolute, unmitigated dicing.";
    } else {
      return "Variance, man. Variance.";
    }
  }
</script>

<div class="diced">
  <Row>
    <Col>
      <div class="home">
        <p>
          {betterThan(homeTeam, homePercentile)}<br />
          {diced(homePercentile)}
        </p>
      </div>
    </Col>
    <Col>
      <div class="away">
        <p>
          {betterThan(awayTeam, awayPercentile)}<br />
          {diced(awayPercentile)}
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
