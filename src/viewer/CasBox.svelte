<script>
  import Grid from './Grid.svelte';
  import CasSquare from './CasSquare.svelte';
  export let casType, dugout;
</script>

<div class={casType}>
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
  .cas {
    background-color: hsl(0, 100%, 89%);
  }
  .ko {
    background-color: hsl(60, 100%, 90%);
  }

  .reserve {
    background-color: hsl(120, 26%, 70%)
  }
</style>
