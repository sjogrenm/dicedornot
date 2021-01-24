{#each dice as die}
<div class="dice d{dice.length}h {blockDice[die]}">

</div>
{/each}

<script>
  export let dice;

  const blockDice = [
    "attacker-down",
    "both-down",
    "push",
    "defender-stumbles",
    "defender-down",
  ];
</script>
<style>

.dice,
  .logdice {
    background: url("/images/dice.png") no-repeat;
    width: 25px;
    height: 25px;
    display: inline-block;
    background-position-x: 0px;
  }
  .dice {
    position: absolute;
  }
  .logdice {
    vertical-align: bottom;
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
  .attacker-down {
    background-position-y: 0px;
  }
  .both-down {
    background-position-y: -25px;
  }
  .defender-down {
    background-position-y: -50px;
  }
  .defender-stumbles {
    background-position-x: -25px;
    background-position-y: 0px;
  }
  .push {
    background-position-x: -25px;
    background-position-y: -25px;
  }

  .foul {
    background-position-x: -25px;
    background-position-y: -50px;
  }
</style>
