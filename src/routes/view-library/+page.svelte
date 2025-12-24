<script lang="ts">
  import ArtistCard from "$lib/components/ArtistCard.svelte";

  import type { PageData } from "./$types";

  const { data }: { data: PageData } = $props();
</script>

<div class="min-h-screen bg-gradient-to-br from-surface-50-900 to-surface-100-800">
  <div class="container mx-auto px-4 py-24">
    <div class="w-full max-w-7xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="h1 mb-6 text-surface-900-100">Music Library</h1>
        <p class="text-surface-600-400 text-lg">
          Browse and manage your artists and albums
        </p>
      </div>

      <!-- Artists Grid Container -->
      <div class="card border border-surface-200-800 preset-filled-surface-100-900 p-8 md:p-10 shadow-xl">
        {#if data.returnedArtists && data.returnedArtists.length > 0}
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6 md:gap-8">
            {#each data.returnedArtists as artist (artist.uuid)}
              <ArtistCard {artist} serverConfiguration={data.serverConfiguration} />
            {/each}
          </div>
        {:else}
          <!-- Empty State -->
          <div class="text-center py-16">
            <div class="text-surface-400-600 text-lg mb-4">
              No artists found in your library
            </div>
            <p class="text-surface-500-500">
              Make sure your Plex library contains music artists
            </p>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
