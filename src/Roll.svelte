<script>
  import Distribution from "./Distribution.svelte";
  export let roll, selected;
  let actualDistributions;
  let actualOpen = false;

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
</script>

{#if selected}
<details
  id="roll-{roll.rollIndex}">
  <summary>
    {roll.jointDescription}
    {roll.valueWithDependents.valueString}
    {roll.possibleOutcomes.valueString}
  </summary>
  <ul class="list-group" on:click|stopPropagation>
    <li class="list-group-item list-group-item-action">
      <details
        on:click|preventDefault|stopPropagation={() => (actualOpen = !actualOpen)}
        open={actualOpen}>
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
      <Distribution dist={roll.possibleOutcomes.named('Possible Outcomes')} />
    </li>
  </ul>
</details>
{:else}
  <div>
  {roll.jointDescription}
  {roll.valueWithDependents.valueString}
  {roll.possibleOutcomes.valueString}
  </div>
{/if}
