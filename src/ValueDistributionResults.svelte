<script>
import Explanation from "./Explanation.svelte";
import Results from "./Results.svelte";
  import {valueDistributionSpec} from "./vega-spec.js";
</script>
<Results spec={valueDistributionSpec}/>
<Explanation>
  This graphs the possible value results of each collection of rolls. The bars are proportional to the likelyhood of that value as an outcome (although very low probability events are enhanced to make them more visible in the resulting graph).
</Explanation>
