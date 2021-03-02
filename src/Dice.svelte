<script>
  import { BLOCK } from "./constants.js";
  export let dice,
    uphill = false,
    size = 1.45,
    separator = "";

  let DICE_MAP = {
    1: "a",
    2: "b",
    3: "c",
    4: "d",
    5: "e",
    6: "f",
    7: "g",
    8: "h",
    9: "k",
    [BLOCK.AttackerDown]: "k",
    [BLOCK.BothDown]: "n",
    [BLOCK.Push]: "j",
    [BLOCK.DefenderStumbles]: "m",
    [BLOCK.DefenderDown]: "l",
  };
</script>

{#each dice as die, dieIndex}
  <span class="die" class:uphill style={`font-size: ${size}rem`}
    >{DICE_MAP[die]}</span
  >{#if dieIndex + 1 < dice.length}<span class="separator">{separator}</span
    >{/if}
{/each}

<style>
  span.die {
    background: white;
    color: black;
    font-family: "NuffleDice";
    vertical-align: middle;
    line-height: 75%;
  }
  span.die.uphill {
    background: red;
  }
</style>
