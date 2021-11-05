<svelte:options immutable/>

<script lang="ts">
  import { fade } from "svelte/transition";
  export let plus: number | undefined = undefined,
    active = false,
    target = false,
    pushbackChoice = false,
    moved = false,
    kickoffTarget = false,
    row: number,
    column: number;
  import { timing, transition } from "../stores.js";
  let cellClass: string;

  $: send = $transition.send;
  $: receive = $transition.receive;
  $: {
    let plusClass = plus ? `plus${plus}` : undefined;
    let activeClass = active ? "active" : undefined;
    let targetClass = target ? "target" : undefined;
    let pushbackChoiceClass = pushbackChoice ? "pushback-choice" : undefined;
    let movedClass = moved ? "moved" : undefined;
    let kickoffTargetClass = kickoffTarget ? "kickoffTarget" : undefined;
    cellClass =
      activeClass ||
      targetClass ||
      pushbackChoiceClass ||
      plusClass ||
      movedClass ||
      kickoffTargetClass ||
      "";
  }
</script>

{#if active}
  <div
    id={`cell_${column}_${row}`}
    class={`cell sprite ${cellClass}`}
    in:send={{ key: "active-cell" }}
    out:receive={{ key: "active-cell" }}
  />
{:else}
  <div
    id={`cell_${column}_${row}`}
    class={`cell sprite ${cellClass}`}
    in:fade={{ duration: $timing * 0.1 }}
    out:fade={{ duration: $timing * 0.1 }}
  />
{/if}

<style>
  .cell {
    background-image: url("/images/cells.png");
    background-repeat: no-repeat;
    --spW: 50;
    --spH: 50;
    display: inline-block;
    --spX: 0;
    --spY: 0;
    position: absolute;
    --imH: 300;
    --imW: 400;
    width: 95%;
    height: 95%;
  }

  .active {
    --spX: 100;
    --spY: 150;
  }
  .kickoffTarget {
    --spX: 100;
    --spY: 50;
  }
  .moved {
    --spX: 100;
  }
  .target {
    --spX: 200;
    --spY: 0;
  }
  .pushback-choice {
    --spX: 50;
    --spY: 150;
  }
  .pushback-chosen {
    --spX: 250;
    --spY: 150;
  }
  .push-left {
    transform: scaleX(-1);
  }
  .push-down {
    transform: rotate(180deg);
  }

  .plus2 {
    --spX: 250;
  }
  .plus3 {
    --spX: 300;
  }
  .plus4 {
    --spX: 350;
  }
  .plus5 {
    --spX: 250;
    --spY: 50;
  }
  .plus6 {
    --spX: 300;
    --spY: 50;
  }

  .blood {
    background: url("/images/blood.png") no-repeat;
    --spW: 40;
    --spH: 40;
    --spX: 0;
    --spY: 0;
    --imH: 80;
    --imW: 80;
    position: absolute;
  }
  .splatter2 {
    --spX: 40;
  }
  .splatter3 {
    --spY: 40;
  }
  .splatter4 {
    --spX: 40;
    --spY: 40;
  }
</style>
