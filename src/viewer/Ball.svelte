<script>
  export let held=false;
</script>
<style>
  #ball {
    background-image: url("/images/ball.png");
    top: 25%;
    left: 12.5%;
    width: 75%;
    height: 50%;
    background-repeat: no-repeat;
    background-size: contain;
    position: absolute;
  }
  #ball.held {
    background-image: url("/images/ball-held.png");
    width: 50%;
    top: 50%;
    left: 25%;
    z-index: 1;
  }
</style>


<div id="ball" class:held/>
