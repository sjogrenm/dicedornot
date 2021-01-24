<script>
  export let plus = null,
    active = false,
    target = false,
    pushbackChoice = false;

  $: plusClass = plus ? `plus${plus}` : "";
</script>

<div
  class={`cell ${plusClass}`}
  class:active
  class:target
  class:pushback-choice={pushbackChoice}
/>

<style>
  .cell {
    background: url("/images/cells.png") no-repeat;
    width: 50px;
    height: 50px;
    display: inline-block;
    background-position-x: 0px;
    position: absolute;
  }
  .pushback-choice {
    background-position-x: -50px;
    background-position-y: -150px;
  }
  .pushback-chosen {
    background-position-x: -250px;
    background-position-y: -150px;
  }
  .push-left {
    transform: scaleX(-1);
  }
  .push-down {
    transform: rotate(180deg);
  }

  .plus2 {
    background-position-x: -250px;
    background-position-y: 0px;
  }
  .plus3 {
    background-position-x: -300px;
    background-position-y: 0px;
  }
  .plus4 {
    background-position-x: -350px;
    background-position-y: 0px;
  }
  .plus5 {
    background-position-x: -250px;
    background-position-y: -50px;
  }
  .plus6 {
    background-position-x: -300px;
    background-position-y: -50px;
  }
</style>
