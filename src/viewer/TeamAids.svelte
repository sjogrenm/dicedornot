<script>
  import Grid from "./Grid.svelte";
</script>

<Grid width={10} height={3} prefix="dice">
  <div class="grid_item_dice">
    <div class="inducement wizard" />
  </div>
  <div class="grid_item_dice">
    <div class="inducement apo" />
  </div>
  <div class="grid_item_dice">
    <div class="reroll" />
  </div>
</Grid>

<style>
  .reroll {
    background: url("/images/rerolls.png") no-repeat;
    width: 34px;
    height: 34px;
    display: inline-block;
    background-position-x: 0px;
    position: absolute;
  }
  .inducement {
    background: url("/images/inducements.png") no-repeat;
    width: 34px;
    height: 34px;
    display: inline-block;
    background-position-x: 0px;
    position: absolute;
  }
  .apo {
    background-position-x: 0px;
  }
  .babe {
    background-position-x: -34px;
  }
  .wizard {
    background-position-x: -68px;
  }
  .chef {
    background-position-x: -102px;
  }
  .bribe {
    background-position-x: -136px;
  }
  .igor {
    background-position-x: -172px;
  }
  .used {
    background-position-y: -34px;
  }
</style>
