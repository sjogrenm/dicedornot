<script>
  import Turn from "./Turn.svelte";
  import Grid from "./viewer/Grid.svelte";
  export let rolls, replayStepIndex;
  let open = false;
  let rollsByTurn, selectedRoll, turns;
  $: {
    let nextRoll = rolls.findIndex(roll => {
      return replayStepIndex < roll.stepIndex;
    });
    selectedRoll = nextRoll > 0 ? rolls[nextRoll - 1].rollIndex : 0;
    updateRollLog(rolls, selectedRoll);
    turns = rollsByTurn.length;
  }
  function updateRollLog(rolls, selectedRoll) {
    rollsByTurn = rolls.reduce((groups, roll) => {
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

    open = selectedRoll !== null;
  }
</script>

<!-- <div>
  <Grid width={8} height={Math.floor(turns/8)}>
    <TurnSelector/>
  </Grid>
</div> -->

<div class="details-list">
  <ul>
    {#each rollsByTurn as rolls (rolls[0].rollIndex)}
      <li
        class="list-group-item list-group-item-action"
        on:click|stopPropagation={() => (rolls.open = !rolls.open)}
      >
        <Turn bind:open={rolls.open} {rolls} {selectedRoll} />
      </li>
    {/each}
  </ul>
</div>

<style>
</style>
