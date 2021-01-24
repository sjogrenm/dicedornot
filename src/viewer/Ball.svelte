<script>
  export let held=false;
</script>
<style>
  #ball {
    background-image: url("/images/ball.png");
    width: 39px;
    height: 26px;
    background-repeat: no-repeat;
  }
  .held {
    background-image: url("/images/ball-held.png") !important;
    width: 26px !important;
    position: absolute;
    bottom: 5px;
    z-index: 1;
  }
</style>


<div id="ball" class:held/>
