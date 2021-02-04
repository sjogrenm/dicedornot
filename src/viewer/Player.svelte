<script>
  import { selectedPlayer } from "../stores.js";
  import { Popover } from "sveltestrap";
  import { getPlayerType, Casualties, SITUATION } from "../constants.js";
  import {translateStringNumberList} from "../replay-utils.js";
  import SelectedPlayer from "./SelectedPlayer.svelte";

  export let data,
    done = null,
    moving = null,
    prone = null,
    stunned = null,
    blitz = null,
    cas = null,
    stupidity = null,
    send,
    receive;
  let id, race, model, team, classes, key;

  $: {
    ({ model, race } = getPlayerType(data.Id, data.Data.IdPlayerTypes));
    id = data.Id;
    team = id > 30 ? "away" : "home";
    done = done === null ? data.CanAct != 1 : done;

    classes = [race, model, team, "sprite"].join(" ");
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

    if (cas === null && data.Situation >= SITUATION.Casualty) {
      if (data.Situation === SITUATION.Casualty) {
        cas =
          Casualties[
            Math.max(...translateStringNumberList(data.ListCasualties))
          ].icon;
      } else {
        cas = "Expelled";
      }
    }
  }
</script>

<div
  id={key}
  class={classes}
  class:done
  class:moving
  class:stunned
  class:prone
  class:blitz
  in:receive={{ key: key }}
  out:send={{ key: key }}
  on:click={() => {
    console.log("Clicked player", { player: data });
    $selectedPlayer = data;
  }}
>
  {#if cas}
    <img src={`/images/skills/${cas}.png`} alt={cas} />
  {/if}
  {#if stupidity}
    <div class={stupidity} />
  {/if}
</div>
<Popover trigger="hover" placement="right" target={key}>
  <div class="player-card">
    <SelectedPlayer player={data} />
  </div>
</Popover>

<!-- image.src = `https://cdn2.rebbl.net/images/skills/${
  Casualties[Math.max(...p.sustainedCasualties)].icon
}.png`; -->
<style>
  .player-card {
    width: 10vw;
  }
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

  img {
    position: absolute;
    bottom: -5px;
    right: -5px;
    width: 50%;
    height: 50%;
  }
</style>
