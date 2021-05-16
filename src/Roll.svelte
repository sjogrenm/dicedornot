<script lang="ts">
  import Distribution from "./Distribution.svelte";
  import RollOutcomes from "./RollOutcomes.svelte";
  import { replayTarget, showResultsAnalysis } from "./stores.js";
  import { Icon } from "sveltestrap";
  import type { Roll } from "./rolls.js";
  import type { Distribution as Dist } from "./distribution.js";
  export let roll: Roll<any>, selected: boolean;
  let actualDistributions: Dist[];
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
  function openRoll() {
    detailsOpen = !detailsOpen;
  }
</script>

<div class="row">
  <div class="col col-auto pr-0 pl-2">
    <div>
      <button
        href="#viewer"
        class="btn btn-secondary btn-sm"
        on:click={() => ($replayTarget = roll.startIndex)}
        ><Icon name="arrow-down-right" title="Jump to Roll" /></button
      >
    </div>
    {#if selected}
      <div>
        <button
          href="#viewer"
          class="btn btn-secondary btn-sm"
          on:click={() => openRoll()}
          ><Icon name="three-dots-vertical" title="Show details" /></button
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
    {#if roll.valueWithDependents.valueOf() != 0 || roll.possibleOutcomes.valueOf() != 0}
      <div class="row">
        {#if $showResultsAnalysis}
          <div class="col col-auto">{roll.valueWithDependents.valueString}</div>
        {/if}
        <div class="col col-auto">{roll.possibleOutcomes.valueString}</div>
      </div>
    {/if}
  </div>
  <!-- class={`list-group-item list-group-item-action team-${roll.activeTeam.id}`}
class:active={selectedRoll == roll.rollIndex}
on:click={handleClick(roll)} -->
</div>
