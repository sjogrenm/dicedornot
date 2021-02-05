<script>
  import {fade} from 'svelte/transition';
  import { getPlayerType, Casualties, SITUATION } from "../constants.js";
  import {translateStringNumberList} from "../replay-utils.js";

  export let data,
    done = null,
    moving = null,
    prone = null,
    stunned = null,
    blitz = null,
    stupidity = null,
    send,
    receive;
  let id, race, model, team, classes, key;

  $: {
    ({ model, race } = getPlayerType(data.Id, data.Data.IdPlayerTypes));
    id = data.Id;
    team = id > 30 ? "away" : "home";
    done = done === null ? data.CanAct != 1 : done;

    classes = [race, model, team, "sprite", "crisp"].join(" ");
    key = `player_${id}`;
    prone = prone === null ? data.Status === 1 : prone;
    stunned = stunned === null ? data.Status === 2 : stunned;
    if (stupidity === null && data.Disabled == 1) {
      let usedSkills = translateStringNumberList(data.ListUsedSkills);
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

  function inFn(node, args) {
    if (receive) {
      return receive(node, { key: key });
    } else {
      return fade(node, {duration: 0});
    }
  }
  function outFn(node, args) {
    if (send) {
      return send(node, { key: key });
    } else {
      return fade(node, {duration: 0});
    }
  }
</script>

<div
  class={classes}
  class:done
  class:moving
  class:stunned
  class:prone
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
