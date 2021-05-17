<script lang="ts">
  import Results from "./Results.svelte";
  import { valueSpec } from "./vega-spec.js";
  import Explanation from "./Explanation.svelte";
</script>

<Results spec={valueSpec} />
<Explanation>
  <div>
    <p>
      This graph is a measure of <a href="#cum-value-def">Cumulative Value</a> (solid line) vs <a href="#cum-exp-value-def">Cumulative Expected Value</a> (dotted line). The <a href="#cum-net-value-def">Cumulative Net Value</a> is measured by the difference in those values (the shaded region).
    </p>
  </div>
</Explanation>

