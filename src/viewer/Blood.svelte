<script lang="ts">
    export let blood: number;
</script>
  
  <div
    class={`blood sprite splatter${blood}`}
  />
  
  <style>
    .blood {
      background: url("/images/blood.png") no-repeat;
      --spW: 40;
      --spH: 40;
      --spX: 0;
      --spY: 0;
      --imH: 80;
      --imW: 80;
      position: absolute;
    }
    .splatter2 {
      --spX: 40;
    }
    .splatter3 {
      --spY: 40;
    }
    .splatter4 {
      --spX: 40;
      --spY: 40;
    }
  </style>
  