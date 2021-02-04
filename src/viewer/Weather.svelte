<script>
  import FixedRatio from "./FixedRatio.svelte";
  import {WEATHER} from "../constants.js";
  export let weather;

  const weatherText = {
    [WEATHER.Nice]: 'perfect blood bowl weather',
    [WEATHER.SwelteringHeat]: 'sweltering heat!',
    [WEATHER.VerySunny]: 'very sunny',
    [WEATHER.PouringRain]: 'pouring rain',
    [WEATHER.Blizzard]: 'blizzard go brrrr',
  }
  const weatherClass = {
    [WEATHER.Nice]: 'nice',
    [WEATHER.SwelteringHeat]: 'heat',
    [WEATHER.VerySunny]: 'sunny',
    [WEATHER.PouringRain]: 'rain',
    [WEATHER.Blizzard]: 'blizzard',
  }
</script>

<FixedRatio>
  <div class={`weather sprite ${weatherClass[weather]}`} title={weatherText[weather]} />
</FixedRatio>

<style>
  .weather {
    background-image: url("/images/weather.png");
    width: 100%;
    height: 100%;
    --imW: 192;
    --imH: 36;
    --spW: 36;
    --spH: 36;
    /* position: absolute; */
  }
  .heat {
    --spX: 0;
  }
  .sunny {
    --spX: 39;
  }
  .nice {
    --spX: 78;
  }
  .rain {
    --spX: 117;
  }
  .blizzard {
    --spX: 156;
  }
</style>
