<div class="dice-container">
  <div class="dice sprite d1h foul"/>
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
  .d1h {
    left: 12px;
    bottom: -12px;
  }
  .foul {
    --spX: 25;
    --spY: 50;
  }
</style>
