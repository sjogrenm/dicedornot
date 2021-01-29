<script>
  import Grid from './Grid.svelte';
  import CasSquare from './CasSquare.svelte';
  export let casType, dugout;
</script>

<div class={`bench ${casType}`}>
  <Grid width={4} height={2} prefix={casType} component={CasSquare} componentProps={{casType, dugout}}>
    <div class="grid_item" id="home_cas_0_0">
      <div id="player_14" class="vampire thrall3 sprite home">
        <img src="ArmourBust.png" width="20" height="20" /><img
          src="ArmourBust.png"
          width="20"
          height="20"
        />
      </div>
    </div>
  </Grid>
</div>

<style>
</style>
