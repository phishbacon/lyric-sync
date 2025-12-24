<script lang="ts">
  import type { ImageConfig, InferredSelectArtistSchema } from "$lib/types";

  import { page } from "$app/state";
  import AlbumCard from "$lib/components/AlbumCard.svelte";
  import Image from "$lib/components/Image.svelte";

  import type { PageData } from "./$types";

  const { data }: { data: PageData } = $props();
  // TODO: Move this to the server side maybe...

  const artist: InferredSelectArtistSchema | undefined = $derived.by(() => {
    if (data.returnedArtists) {
      return data.returnedArtists.find(artist => artist.uuid === page.params.uuid);
    }
    else {
      return undefined;
    }
  });

  const imageConfig: ImageConfig = $derived({
    image: artist?.image,
    baseURL: `${data.serverConfiguration?.hostname}:${data.serverConfiguration?.port}`,
    plexAuthToken: `?X-Plex-Token=${data.serverConfiguration?.xPlexToken}`,
  });
</script>

<div class="min-h-screen bg-gradient-to-br from-surface-50-900 to-surface-100-800">
  <div class="container mx-auto px-4 py-24">
    <div class="w-full max-w-7xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="h2 mb-6 text-surface-900-100">Artist Details</h1>
      </div>

      <!-- Artist Info Card -->
      {#if artist}
        <div class="card border border-surface-200-800 preset-filled-surface-100-900 p-6 shadow-xl mb-4">
          <div class="flex items-center gap-4 mb-4">
            <!-- Artist Image -->
            <div class="flex-shrink-0">
              <div class="relative">
                {#key imageConfig}
                  <Image
                    {imageConfig}
                    alt="Artist Artwork"
                    imgClasses="w-24 h-24 object-cover rounded-lg shadow-lg"
                    loadingClasses="w-24 h-24 flex items-center justify-center"
                    size="size-24"
                    meterStroke="stroke-primary-600-400"
                    trackStroke="stroke-secondary-50-950"
                    showLabel={true}
                    lazy={false}
                  />
                {/key}
              </div>
            </div>

            <!-- Artist Info -->
            <div class="flex-1">
              <h2 class="h3 mb-2 text-surface-900-100">{artist.title}</h2>
              {#if artist.summary}
                <p class="text-surface-600-400 text-sm leading-relaxed line-clamp-2">
                  {artist.summary}
                </p>
              {:else}
                <p class="text-surface-500-500 italic text-sm">
                  No description available for this artist
                </p>
              {/if}
            </div>
          </div>
          <div class="flex justify-end">
            <button
              type="button"
              class="btn preset-filled-primary-500 w-24"
            >
              Sync All
            </button>
          </div>
        </div>
      {/if}

      <div class="text-center mb-4">
        <h1 class="h3 text-surface-900-100">Albums</h1>
      </div>

      <!-- Albums Grid Container -->
      <div class="card border border-surface-200-800 preset-filled-surface-100-900 p-8 md:p-10 shadow-xl">
        {#if data.returnedAlbums && data.returnedAlbums.length > 0}
          <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8">
            {#each data.returnedAlbums as album (album.uuid)}
              <AlbumCard {album} serverConfiguration={data.serverConfiguration} />
            {/each}
          </div>
        {:else}
          <!-- Empty State -->
          <div class="text-center py-16">
            <div class="text-surface-400-600 text-lg mb-4">
              No albums found for this artist
            </div>
            <p class="text-surface-500-500">
              This artist doesn't have any albums in your library
            </p>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
