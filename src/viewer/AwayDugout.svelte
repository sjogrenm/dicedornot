<script>

  import AwayBench from "./AwayBench.svelte";
  import TeamAids from "./TeamAids.svelte";
  
</script>
  
<div class="row">
  <div class="col-5">
    <div class="row">
      <div class="col-8">
        <TeamAids />
      </div>
    </div>
    <div class="col-1">
      <div class="weather heat" id="weather" title="sweltering heat!">
        <h1 id="turnTimer">3:30</h1>
      </div>
    </div>
  </div>
  <div class="col-2">
    <div>
      <span id="homeScore">0</span>
    </div>
    <div>
      <span id="homeTurn" class="">4</span>
    </div>
  </div>

  <div class="col-5">
    <AwayBench />
    <div class="row">
      <img src="logo_vampire_04.png" />Bylorhofs at Camp
    </div>
  </div>
</div>

<style>
</style>
