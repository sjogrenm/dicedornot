
<details {open}  on:click|stopPropagation|preventDefault={() => open = (!open)}>
  <summary>{rolls[0].activeTeam.name} - Turn {rolls[0].turn}</summary>
  {#if open}
  <ul class="list-group" on:click|stopPropagation>
    {#each rolls as roll}
      <li id="roll-{roll.rollIndex}" class="list-group-item list-group-item-action" on:click|stopPropagation={() => roll.open = (!roll.open)}>
        <Roll roll={roll} bind:open={roll.open}/>
      </li>
    {/each}
  </ul>
  {/if}
</details>

<script>
  import Roll from './Roll.svelte';
  export let rolls;
  let open = false;
</script>
