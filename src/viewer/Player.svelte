<svelte:options immutable/>
<script lang="ts">
  import { fade } from "svelte/transition";
  import { getPlayerSprite, STATUS, SKILL } from "../constants.js";
  import type { Player, PlayerState } from "../replay/Internal.js";
  import {transition} from "../stores.js";
import type { PlayerProps } from "./types.js";

  export let playerDef: Player,
    playerState: PlayerState | undefined,
    playerProps: PlayerProps | undefined,
    instant = false;
  let
    moving: boolean | undefined = undefined,
    blitz: boolean | undefined = undefined,
    stupidity: string | undefined = undefined,
    canAct: boolean = true,
    status: STATUS = STATUS.standing,
    disabled: boolean = false,
    usedSkills: readonly SKILL[] = [],
    race: string,
    model: string,
    classes: string,
    key: string;

  $: send = $transition.send;
  $: receive = $transition.receive;
  $: {
    ({moving, blitz, stupidity} = playerProps || {});
    ({canAct, status, disabled, usedSkills} = playerState || {
      canAct: true,
      status: STATUS.standing,
      disabled: false,
      usedSkills: [],
    });
    ({ model, race } = getPlayerSprite(playerDef.id.number, playerDef.type));

    classes = [race, model, playerDef.id.side, "sprite", "crisp", "player"].join(" ");
    key = `player_${playerDef.id.number}`;
    if (disabled) {
      if (usedSkills.indexOf(20) > -1) {
        //take root
        stupidity = "Rooted";
      } else if (usedSkills.indexOf(31) > -1) {
        //bonehead
        stupidity = "BoneHeaded";
      } else if (usedSkills.indexOf(51) > -1) {
        //really stupid
        stupidity = "Stupid";
      }
    }
  }

  function inFn(node: Element, _: any) {
    if (instant) {
      return fade(node, { duration: 0 });
    } else {
      return receive(node, { key: key });
    }
  }
  function outFn(node: Element, _: any) {
    if (instant) {
      return fade(node, { duration: 0 });
    } else {
      return send(node, { key: key });
    }
  }
</script>

<div
  class={classes}
  class:done={!canAct}
  class:moving
  class:stunned={status === STATUS.stunned}
  class:prone={status === STATUS.prone}
  class:blitz
  in:inFn
  out:outFn
>
  {#if stupidity}
    <div class={stupidity} />
  {/if}
</div>

<!-- image.src = `https://cdn2.rebbl.net/images/skills/${
  Casualties[Math.max(...p.sustainedCasualties)].icon
}.png`; -->
<style>
  .reverse {
    transform: scaleX(-1);
  }

  .home.stunned,
  .away.prone {
    transform: rotate(90deg);
    opacity: 0.5;
  }
  .away.stunned,
  .home.prone {
    transform: rotate(-90deg);
    opacity: 0.5;
  }

  .sprite {
    position: relative;
  }
  .done {
    opacity: 0.5;
  }

  .blitz:after {
    content: url(/images/blitz.png);
    position: absolute;
    display: inline-flex;
    height: 20px;
    width: 20px;
    left: -11px;
    top: -4px;
  }

  .BoneHeaded {
    background: url("/images/bonehead.png") no-repeat;
    background-size: contain;
    width: 30px;
    height: 30px;
    display: inline-block;
    position: absolute;
    z-index: 1;
    top: 0;
    left: 0;
  }
  .Stupid {
    background: url("/images/reallystupid.png") no-repeat;
    background-size: contain;
    width: 30px;
    height: 30px;
    display: inline-block;
    position: absolute;
    z-index: 1;
    top: 0;
    left: 0;
  }
  .Rooted {
    background: url("/images/takeroot.png") no-repeat;
    background-size: contain;
    width: 30px;
    height: 30px;
    display: inline-block;
    position: absolute;
    z-index: 1;
    top: 0;
    left: 0;
  }
</style>
