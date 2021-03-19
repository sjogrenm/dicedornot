<script>
  import Results from "./Results.svelte";
  import { expectedValueSpec } from "./vega-spec.js";
  import Explanation from "./Explanation.svelte";
</script>

<Results spec={expectedValueSpec} />
<Explanation>
  <div>
    <p>
      This graph is a measure of <a href="#cum-exp-value-def">Cumulative Expected Value</a>.
    </p>
  </div>
</Explanation>
