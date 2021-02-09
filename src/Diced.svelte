<script>
  import { Row, Col } from "sveltestrap";
  export let homePercentile, awayPercentile, homeTeam, awayTeam;
  $: console.log(homePercentile, awayPercentile);
  function betterThan(team, percentile) {
    let comparison = percentile < 0.5 ? "worse" : "better";
    let count = percentile < 0.5 ? 100 - percentile * 100 : percentile * 100;
    return `${team}'s rolls were ${comparison} than ${count.toFixed(
      0
    )} in 100 games`;
  }
  function diced(team, percentile) {
    const sample = (items) => items[team.length % items.length];

    if (percentile > 0.985) {
      return "Nuffle's light shown down on them.";
    } else if (percentile > 0.9) {
      return sample(["Nuffle favored them.", "Game of Skill", "Just rolled Pows", "Blood Bowl is just like Chess"]);
    } else if (percentile > 0.8) {
      return sample(["Nuffle was generous.", "In blodge we trust", "Scatter don't matter"]);
    } else if (percentile < 0.01) {
      return sample(["An absolute, unmitigated dicing.", "Fuck this game.", "Rogered but good."]);
    } else if (percentile < 0.1) {
      return sample([
        "Quite a dicing.",
        `And 'lo, Nuffle did look down, and he said "No."`,
        "Because without hope, Nuffle would have nothing to destroy.",
      ]);
    } else if (percentile < 0.3) {
      return sample(["A bit of a dicing.", "Why do I believe in blodge?", "Unfair dices! Unfair game!"]);
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
