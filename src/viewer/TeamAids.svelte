<script lang="ts">
import FlexGrid from "./FlexGrid.svelte";
  export let team, reverse;
</script>

<FlexGrid width={10} height={3} {reverse}>
  {#if team.rerolls}
    {#each Array(team.rerolls.total) as _, i}
      <div class="reroll sprite" class:used={i >= team.rerolls.available} />
    {/each}
    <div class="break"/>
  {/if}
  {#if team.inducements}
    {#if team.inducements.wizard}
      <div class="inducement sprite wizard"/>
    {/if}
    {#if team.inducements.chef}
      <div class="inducement sprite chef"/>
    {/if}
    {#if team.inducements.igor}
      <div class="inducement sprite igor"/>
    {/if}
    {#each Array(team.inducements.apo.total) as _, i}
      <div class="inducement sprite apo" class:used={i >= team.inducements.apo.available}/>
    {/each}
    {#each Array(team.inducements.babes) as _}
      <div class="inducement sprite babe"/>
    {/each}
    {#each Array(team.inducements.bribes.total) as _, i}
      <div class="inducement sprite bribe" class:used={i >= team.inducements.bribes.available}/>
    {/each}
  {/if}
  <!-- <div class="grid_item_dice">
    <div class="inducement wizard" />
  </div>
  <div class="grid_item_dice">
    <div class="inducement apo" />
  </div>
  <div class="grid_item_dice">
    <div class="reroll" />
  </div> -->
</FlexGrid>

<style>
  .break {
    flex-basis: 100%;
    height: 0;
  }
  .reroll.sprite {
    background-image: url("/images/rerolls.png");
    display: flex;
    justify-content: center;
    align-items: center;
    width: calc(100%/10);
    height: calc(100%/3);
    --imW: 34;
    --imH: 68;
    --spW: 34;
    --spH: 34;
  }
  .inducement.sprite {
    background-image: url("/images/inducements.png");
    display: flex;
    justify-content: center;
    align-items: center;
    width: calc(100%/10);
    height: calc(100%/3);
    --imW: 205;
    --imH: 68;
    --spW: 34;
    --spH: 34;
  }
  .apo {
    --spX: ;
  }
  .babe {
    --spX: 34;
  }
  .wizard {
    --spX: 68;
  }
  .chef {
    --spX: 102;
  }
  .bribe {
    --spX: 136;
  }
  .igor {
    --spX: 172;
  }
  .used {
    --spY: 34;
  }
</style>
