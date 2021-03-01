<script>
  import Distribution from "./Distribution.svelte";
  import RollOutcomes from "./RollOutcomes.svelte";
  import { replayTarget } from "./stores.js";
  import { Button, Icon } from "sveltestrap";
  export let roll, selected;
  let actualDistributions;
  let actualOpen = false;
  let detailsOpen = false;

  $: {
    actualDistributions = [roll, ...roll.dependentRolls].map((roll) => {
      const dist = roll.actualValue;
      if (dist.name) {
        return dist.named(`${roll.shortDescription} - ${dist.name}`);
      } else {
        return dist.named(roll.shortDescription);
      }
    });
  }
  function jumpToRoll() {
    $replayTarget = roll.startIndex;
  }
  function openRoll() {
    detailsOpen = !detailsOpen;
  }

</script>

<div class="row">
  <div class="col col-auto pr-0 pl-2">
    <div>
    <a href="#viewer" class="badge badge-secondary" on:click={() => jumpToRoll()}
      ><Icon name="arrow-down-right" title="Jump to Roll" /></a
    >
  </div>
    {#if roll.valueWithDependents.valueOf() != 0 || roll.possibleOutcomes.valueOf() != 0}
    <div>{roll.valueWithDependents.valueString}</div>
    <div>{roll.possibleOutcomes.valueString}</div>
    {/if}
    {#if selected}
    <div>
      <a href="#viewer" class="badge badge-secondary" on:click={() => openRoll()}
        ><Icon name="three-dots-vertical" title="Show details" /></a
      >
    </div>
    {/if}
  </div>
  <div class="col pl-1 pr-2">
    {#if selected}
      <div id="roll-{roll.rollIndex}">
        <RollOutcomes {roll} />
        {#if detailsOpen}
        <ul class="list-group" on:click|stopPropagation>
          <li class="list-group-item list-group-item-action">
            <details
              on:click|preventDefault|stopPropagation={() =>
                (actualOpen = !actualOpen)}
              open={actualOpen}
            >
              <summary>Actual Outcomes</summary>
              {#if actualOpen}
                <ul class="list-group" on:click|stopPropagation>
                  {#each actualDistributions as dist}
                    <li class="list-group-item list-group-item-action">
                      <Distribution {dist} />
                    </li>
                  {/each}
                </ul>
              {/if}
            </details>
          </li>
          <li class="list-group-item list-group-item-action">
            <Distribution
              dist={roll.possibleOutcomes.named("Possible Outcomes")}
            />
          </li>
        </ul>
        {/if}
      </div>
    {:else}
      <div>
        <RollOutcomes {roll} />
      </div>
    {/if}
  </div>
  <!-- class={`list-group-item list-group-item-action team-${roll.activeTeam.id}`}
class:active={selectedRoll == roll.rollIndex}
on:click={handleClick(roll)} -->
</div>
