<script>
  import { fade } from "svelte/transition";
  export let plus = null,
    active = false,
    target = false,
    pushbackChoice = false,
    moved = false,
    row, column,
    send,
    receive;
  import { timing } from "../stores.js";
  let inFn, outFn, inParms, outParms, plusClass = "";

  $: {
    plusClass = plus ? `plus${plus}` : "";
    if (active) {
      inFn = receive;
      outFn = send;
      inParms = outParms = {key: "active-cell"};
    } else {
      inFn = outFn = fade;
      inParms = outParms = {duration: $timing * 0.1};
    }
  }
</script>

<div
  id={`cell_${column}_${row}`}
  class={`cell sprite ${plusClass}`}
  class:target
  class:moved
  class:active
  class:pushback-choice={pushbackChoice}
  in:inFn={inParms}
  out:outFn={outParms}
/>

<style>
  .cell {
    background-image: url("/images/cells.png");
    background-repeat: no-repeat;
    --spW: 50;
    --spH: 50;
    display: inline-block;
    --spX: 0;
    --spY: 0;
    position: absolute;
    --imH: 300;
    --imW: 400;
    width: 95%;
    height: 95%;
  }

  .active {
    --spX: 100;
    --spY: 150;
  }
  .moved {
    --spX: 100;
  }
  .target {
    --spX: 200;
    --spY: 0;
  }
  .pushback-choice {
    --spX: 50;
    --spY: 150;
  }
  .pushback-chosen {
    --spX: 250;
    --spY: 150;
  }
  .push-left {
    transform: scaleX(-1);
  }
  .push-down {
    transform: rotate(180deg);
  }

  .plus2 {
    --spX: 250;
  }
  .plus3 {
    --spX: 300;
  }
  .plus4 {
    --spX: 350;
  }
  .plus5 {
    --spX: 250;
    --spY: 50;
  }
  .plus6 {
    --spX: 300;
    --spY: 50;
  }

  .blood {
    background: url("/images/blood.png") no-repeat;
    --spW: 40;
    --spH: 40;
    --spX: 0;
    --spY: 0;
    --imH: 80;
    --imW: 80;
    position: absolute;
  }
  .splatter2 {
    --spX: 40;
  }
  .splatter3 {
    --spY: 40;
  }
  .splatter4 {
    --spX: 40;
    --spY: 40;
  }
</style>
