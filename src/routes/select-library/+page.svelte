<script lang="ts">
  import SelectLibraryCard from "$lib/components/SelectLibraryCard.svelte";

  import type { PageData } from "./$types";

  const { data }: { data: PageData } = $props();
</script>
<div class="container h-full mx-auto flex justify-center items-center">
  <div class="space-y-10 flex-col items-center">
    <h2 class="h2 text-center">Select Library.</h2>
    <div class="grid grid-cols-2 space-x-3 space-y-3">
      {#each data.musicLibraries as directory}
        {#if directory.hidden !== 1}
          <SelectLibraryCard {directory} serverConfiguration={data.serverConfiguration} />
        {/if}
      {/each}
    </div>
  </div>
</div>
