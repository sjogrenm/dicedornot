<script>
  import Grid from "./Grid.svelte";
  import PitchSquare from "./PitchSquare.svelte";
</script>

<div class="row">
  <div class="col">
    <div class="pitch">
      <Grid width={26} height={15} prefix="pos" component={PitchSquare}>
        <div class="grid_item" id="pos_14_1">
          <div class="cell target" />
          <div class="dice d1h push" />
          <div class="cell target" />
          <div id="player_2" class="vampire vampire1 sprite home" />
        </div>
        <div class="grid_item" id="pos_12_6">
          <div class="blood splatter3" />
        </div>
      </Grid>
    </div>
  </div>
</div>

<style>
  .pitch {
    background-color: hsl(118, 74%, 78%);
  }
</style>
