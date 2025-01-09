<script lang="ts">
  import ArtistCard from "$lib/components/ArtistCard.svelte";

  import type { LayoutServerData } from "./$types";

  const { data }: { data: LayoutServerData } = $props();
</script>

<div class="px-5 py-1 grid grid-cols-1 w-full space-y-3">
  {#if data.returnedArtists}
    {#each data.returnedArtists as artist}
      <ArtistCard {artist} serverConfiguration={data.serverConfiguration} />
    {/each}
  {/if}
</div>
