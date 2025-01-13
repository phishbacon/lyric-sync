<script lang="ts">
  import ArtistCard from "$lib/components/ArtistCard.svelte";

  import type { PageData } from "./$types";

  const { data }: { data: PageData } = $props();
</script>

<div class="px-5 py-1 grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
  {#if data.returnedArtists}
    {#each data.returnedArtists as artist}
      <ArtistCard {artist} serverConfiguration={data.serverConfiguration} />
    {/each}
  {/if}
</div>
