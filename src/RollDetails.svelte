<script>
  import Turn from "./Turn.svelte";
  export let rolls;
  export let selectedRoll = null;
  let open = false;
  let groupedRolls;
  $: {
    updateRollLog();
  }
  function updateRollLog() {
    groupedRolls = rolls.reduce((groups, roll) => {
      const lastGroup = groups[groups.length - 1];
      const lastRoll = lastGroup && lastGroup[lastGroup.length - 1];
      if (
        !lastGroup ||
        !lastRoll ||
        lastRoll.activeTeam.id != roll.activeTeam.id ||
        lastRoll.turn != roll.turn
      ) {
        groups.push([roll]);
      } else {
        lastGroup.push(roll);
      }
      return groups;
    }, []);

    open = !selectedRoll;
  }
</script>

<div id="details" class="row">
  <div class="col-sm-12">
    <details {open}>
      <summary>Roll Value Details</summary>
      <ul id="details-list">
        {#each groupedRolls as rolls}
          <li
            class="list-group-item list-group-item-action"
            on:click|stopPropagation={() => (rolls.open = !rolls.open)}>
            <Turn bind:open={rolls.open} {rolls} {selectedRoll} />
          </li>
        {/each}
      </ul>
    </details>
  </div>
</div>
