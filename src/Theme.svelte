<script lang="ts">
import type { Color, Scale } from "chroma-js";

  import {awayTeamColor, awayTeamGray, homeTeamColor, homeTeamGray, gray} from "./theme.js";

  function scaleToStyle(scale: Scale<Color>, prefix: string) {
    return scale.colors(10).map((color, idx) => `${prefix}-${idx}: ${color};`).join("\n")
  }
  let css = `
    ${scaleToStyle(awayTeamGray, '--away-gray')}
    ${scaleToStyle(awayTeamColor, '--away-color')}
    ${scaleToStyle(homeTeamGray, '--home-gray')}
    ${scaleToStyle(homeTeamColor, '--home-color')}
    ${scaleToStyle(gray, '--gray')}
  `;
</script>

<div style={css}><slot/></div>
