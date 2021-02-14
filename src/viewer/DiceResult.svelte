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

<div class="dice-container">
  {#if dice}
    {#each dice as die}
      <div class="dice sprite {blockDice[die]}" />
    {/each}
  {/if}
</div>

<style>
  .dice-container {
    width: 200%;
    height: 50%;
    top: 50%;
    position: absolute;
    display: inline-block;
    text-align: center;
    z-index: 5;
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
    margin-left: -4%;
    margin-right: -4%;
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

</style>
