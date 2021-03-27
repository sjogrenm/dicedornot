<script lang="ts">
  import Results from "./Results.svelte";
  import Explanation from "./Explanation.svelte";
  import {improbabilitySpec} from "./vega-spec.js";
</script>
<Results spec={improbabilitySpec}/>
<Explanation>
  <p>A graph of the sum of roll improbability over the course of the game.</p>
  <p>The improbability of a roll that passed is equal to the likelyhood that it would fail. (So, passing a 3+ roll is has an improbability of 0.33, because there is a 33% chance of failure.) The improbability of a roll that failed is worth the negative chance of passing. (So, failing that same 3+ roll is worth -0.66, because there was a 66% chance of passing the roll.)</p>
</Explanation>
