<script>
  import FixedRatio from "./FixedRatio.svelte";

  export let dice;

  const blockDice = [
    "attacker-down",
    "both-down",
    "push",
    "defender-stumbles",
    "defender-down",
  ];
</script>

<div class="dice-container">
  {#each dice as die}
    <div class="dice sprite d{dice.length}h {blockDice[die]}" />
  {/each}
</div>

<style>
  .dice-container {
    width: 200%;
    height: 50%;
    top: 50%;
    position: absolute;
    display: inline-block;
    text-align: center;
  }
  .dice {
    background-image: url("/images/dice.png");
    background-repeat: no-repeat;
    width: 33%;
    height: 133%;
    display: inline-block;
    --imW: 50;
    --imH: 75;
    --spW: 25;
    --spH: 25;
    --spX: 0;
    --spY: 0;
  }
  .d1v {
    top: 12px;
    left: -12px;
  }
  .d1h {
    left: 12px;
    bottom: -12px;
  }
  .d2v {
    top: 1px;
    left: -12px;
  }
  .d2v:nth-of-type(2) {
    top: 25px;
  }
  .d2h {
    bottom: -12px;
    left: 0px;
  }
  .d2h:nth-of-type(2) {
    left: 25px;
  }
  .d3v {
    top: -12px;
    left: -12px;
  }
  .d3v:nth-of-type(2) {
    top: 13px;
  }
  .d3v:nth-of-type(3) {
    top: 38px;
  }
  .d3h {
    bottom: -12px;
    left: -12px;
  }
  .d3h:nth-of-type(2) {
    left: 13px;
  }
  .d3h:nth-of-type(3) {
    left: 38px;
  }
  .both-down {
    --spY: 25;
  }
  .defender-down {
    --spY: 50;
  }
  .defender-stumbles {
    --spX: 25;
  }
  .push {
    --spX: 25;
    --spY: 25;
  }

  .foul {
    --spX: 25;
    --spY: 50;
  }
</style>
