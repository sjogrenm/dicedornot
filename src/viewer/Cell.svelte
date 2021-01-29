<script>
  export let plus = null,
    active = false,
    target = false,
    pushbackChoice = false,
    moved = false;

  $: plusClass = (!active && plus) ? `plus${plus}` : "";
</script>

<div
  class={`cell sprite ${plusClass}`}
  class:active
  class:target
  class:moved
  class:pushback-choice={pushbackChoice}
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
