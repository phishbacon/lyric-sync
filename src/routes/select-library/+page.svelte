<script lang="ts">
  import SelectLibraryCard from "$lib/components/SelectLibraryCard.svelte";

  import type { LayoutServerData } from "../$types";

  const { data }: { data: LayoutServerData } = $props();
</script>
<div class="space-y-10 flex-col items-center">
  <h2 class="h2 text-center">Select Library.</h2>
  <div class="grid grid-cols-2 space-x-3 space-y-3">
    {#each data.libraries as library}
      <SelectLibraryCard {library} serverConfiguration={data.serverConfiguration} />
    {/each}
  </div>
</div>
