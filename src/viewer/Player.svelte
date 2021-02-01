<script>
  export let id,
    race,
    model,
    team,
    done = false,
    moving = false,
    stunned = false,
    prone = false,
    blitz = false,
    cas = null,
    stupidity = null,
    send,
    receive;
    let classes, key;

    $: {
      classes = [race, model, team, 'sprite'].join(' ');
      key = `player_${id}`;
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
	in:receive="{{key: key}}"
  out:send="{{key: key}}"
>
  {#if cas}
    <img src={`/images/skills/${cas}.png`} alt={cas} />
  {/if}
  {#if stupidity}
    <div class={stupidity}></div>
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

  img {
    position: absolute;
    bottom: -5px;
    right: -5px;
    width: 50%;
    height: 50%;
  }
</style>
