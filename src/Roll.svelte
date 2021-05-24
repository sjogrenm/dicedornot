<script lang="ts">
  import Distribution from "./Distribution.svelte";
  import RollOutcomes from "./RollOutcomes.svelte";
  import { replayTarget, showResultsAnalysis } from "./stores.js";
  import { Icon } from "sveltestrap";
  import type { Action } from "./rolls.js";
  import type { Distribution as Dist } from "./distribution.js";
  export let action: Action, selected: boolean;
  let actualDistributions: Dist[];
  let actualOpen = false;
  let detailsOpen = false;

  $: {
    actualDistributions = [action, ...action.dependentActions].map((action) => {
      const dist = action.actualValue;
      if (dist.name) {
        return dist.named(`${action.shortDescription} - ${dist.name}`);
      } else {
        return dist.named(action.shortDescription);
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
        on:click={() => ($replayTarget = action.startIndex)}
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
      <div id="action-{action.actionIndex}">
        <RollOutcomes {action} />
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
                dist={action.possibleOutcomes.named("Possible Outcomes")}
              />
            </li>
          </ul>
        {/if}
      </div>
    {:else}
      <div>
        <RollOutcomes {action} />
      </div>
    {/if}
    {#if action.valueWithDependents.valueOf() != 0 || action.possibleOutcomes.valueOf() != 0}
      <div class="row">
        {#if $showResultsAnalysis}
          <div class="col col-auto">{action.valueWithDependents.valueString}</div>
        {/if}
        <div class="col col-auto">{action.possibleOutcomes.valueString}</div>
      </div>
    {/if}
  </div>
  <!-- class={`list-group-item list-group-item-action team-${action.activeTeam.id}`}
class:active={selectedRoll == action.actionIndex}
on:click={handleClick(action)} -->
</div>
