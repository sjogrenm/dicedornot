<script lang="ts">
  import {
    SingleValue,
    SimpleDistribution,
    Distribution,
    ComparativeDistribution,
    BinFuncDistribution,
  } from "./distribution.js";
  export let dist;
  let open = false;
</script>

{#if dist instanceof SingleValue}
  {#if dist.value instanceof Distribution}
    <svelte:self dist={dist.value.named(dist.name)} />
  {:else}{dist.name} {dist.valueString}{/if}
{:else if dist instanceof SimpleDistribution}
  <details
    on:click|preventDefault|stopPropagation={() => (open = !open)}
    {open}>
    <summary>
      {#if dist.name}{dist.name} &rightarrow;{/if}
      {dist.valueString}
    </summary>
    {#if open}
      <ul class="list-group" on:click|stopPropagation>
        {#each dist.values.sort((a, b) => a.name > b.name ? 1 : -1) as value}
          {#if value.value instanceof Distribution}
            <li class="list-group-item list-group-item-action">
              <svelte:self
                dist={value.value.named(`${(value.weight * 100).toFixed(1)}%: ${value.name}`)} />
            </li>
          {:else}
            <li class="list-group-item list-group-item-action">
              {(value.weight * 100).toFixed(1)}%:
              {value.name}
              &rightarrow;
              {value.value}
            </li>
          {/if}
        {/each}
      </ul>
    {/if}
  </details>
{:else if dist instanceof ComparativeDistribution}
  <svelte:self dist={dist.simple} />
{:else if dist instanceof BinFuncDistribution}
  <details
    on:click|preventDefault|stopPropagation={() => (open = !open)}
    {open}>
    <summary>
      {#if dist.name}{dist.name} &rightarrow;{/if}
      {dist.values.reduce((name, value) => {
        if (value instanceof Distribution) {
          return (name ? dist.nameFunc(name, value.name) : value.name)
        } else {
          return (name ? dist.nameFunc(name, value.toString()) : value.toString())
        }
      }, null)}
      {dist.valueString}
    </summary>
    {#if open}
      <ul class="list-group" on:click|stopPropagation>
        {#each dist.values as value}
          <li class="list-group-item list-group-item-action">
            <svelte:self dist={value} />
          </li>
        {/each}
      </ul>
    {/if}
  </details>
{:else}{dist}{/if}
