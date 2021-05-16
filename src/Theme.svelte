<script lang="ts">
import type { Color, Scale } from "chroma-js";

  import {team1Color, team1Gray, team0Color, team0Gray, gray} from "./theme.js";

  function scaleToStyle(scale: Scale<Color>, prefix: string) {
    return scale.colors(10).map((color, idx) => `${prefix}-${idx}: ${color};`).join("\n")
  }
  let css = `
    ${scaleToStyle(team1Gray, '--team1-gray')}
    ${scaleToStyle(team1Color, '--team1-color')}
    ${scaleToStyle(team0Gray, '--team0-gray')}
    ${scaleToStyle(team0Color, '--team0-color')}
    ${scaleToStyle(gray, '--gray')}
  `;
</script>

<div style={css}><slot/></div>
