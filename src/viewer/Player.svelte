<script lang="ts">
  import {fade} from 'svelte/transition';
  import { getPlayerType, getPlayerSprite } from "../constants.js";
  import {translateStringNumberList} from "../replay-utils.js";

  export let data,
    done = undefined,
    moving = undefined,
    prone = undefined,
    stunned = undefined,
    blitz = undefined,
    stupidity = undefined,
    send = undefined,
    receive = undefined;
  let id, race, model, team, classes, key, _done, _prone, _stunned, _stupidity;

  $: {
    ({ model, race } = getPlayerSprite(data.Id, data.Data.IdPlayerTypes));
    id = data.Id;
    team = id > 30 ? "away" : "home";
    _done = done === undefined ? data.CanAct != 1 : done;

    classes = [race, model, team, "sprite", "crisp", "player"].join(" ");
    key = `player_${id}`;
    _prone = prone === undefined ? data.Status === 1 : prone;
    _stunned = stunned === undefined ? data.Status === 2 : stunned;
    if (stupidity === undefined && data.Disabled == 1) {
      let usedSkills = translateStringNumberList(data.ListUsedSkills);
      if (usedSkills.indexOf(20) > -1) {
        //take root
        _stupidity = "Rooted";
      } else if (usedSkills.indexOf(31) > -1) {
        //bonehead
        _stupidity = "BoneHeaded";
      } else if (usedSkills.indexOf(51) > -1) {
        //really stupid
        _stupidity = "Stupid";
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
  class:done={_done}
  class:moving
  class:stunned={_stunned}
  class:prone={_prone}
  class:blitz
  in:inFn
  out:outFn
>
  {#if _stupidity}
    <div class={_stupidity} />
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
