<script lang="ts">
  import { ProgressRing } from "@skeletonlabs/skeleton-svelte";
  import { invalidateAll } from "$app/navigation";
  import TrackTableRow from "$lib/components/TrackTableRow.svelte";
  import { RandomImageURL } from "$lib/external-links";
  import { logger } from "$lib/logger";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";

  import type { PageData } from "./$types";

  const { data }: { data: PageData } = $props();
  // TODO: Move this to the server side maybe...

  const baseURL: string = `${data.serverConfiguration?.hostname}:${data.serverConfiguration?.port}`;
  const plexAuthToken: string = `?X-Plex-Token=${data.serverConfiguration?.xPlexToken}`;
  let loading: boolean = $state(true);

  const {
    totalTracks,
    tracksSynced,
  }: { totalTracks: number; tracksSynced: number } = $derived.by(() => {
    const returnData: { totalTracks: number; tracksSynced: number } = {
      totalTracks: 0,
      tracksSynced: 0,
    };

    onMount(() => {
      if (data.invalidateData) {
        logger.info("Album marked as synced in db. Refreshing data");
        invalidateAll();
      }
    });

    if (data.returnedTracks) {
      returnData.totalTracks = data.returnedTracks.length;
      returnData.tracksSynced = data.returnedTracks.reduce((acc, el) => {
        if (el.synced) {
          return acc + 1;
        }
        else {
          return acc;
        }
      }, 0);
    }

    return returnData;
  });

  function imageLoaded(): void {
    loading = false;
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-surface-50-900 to-surface-100-800">
  <div class="container mx-auto px-4 py-24">
    <div class="w-full max-w-7xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="h2 mb-6 text-surface-900-100">Album Details</h1>
      </div>

      <!-- Album Info Card -->
      {#if data.returnedAlbum}
        <div class="card border border-surface-200-800 preset-filled-surface-100-900 p-6 shadow-xl mb-4">
          <div class="flex items-center gap-4">
            <!-- Album Image -->
            <div class="flex-shrink-0">
              <div class="relative">
                <img
                  src={data.returnedAlbum.image === "no-plex"
                    ? RandomImageURL
                    : baseURL + data.returnedAlbum.image + plexAuthToken}
                  class="w-24 h-24 object-cover rounded-lg shadow-lg"
                  alt="Album Artwork"
                  class:hidden={loading}
                  transition:fade
                  onload={imageLoaded}
                />
                {#if loading}
                  <div class="w-24 h-24 flex items-center justify-center">
                    <ProgressRing
                      value={null}
                      size="size-24"
                      meterStroke="stroke-primary-600-400"
                      trackStroke="stroke-secondary-50-950"
                    />
                  </div>
                {/if}
              </div>
            </div>

            <!-- Album Info -->
            <div class="flex-1">
              <h2 class="h3 mb-2 text-surface-900-100">{data.returnedAlbum.title}</h2>
              {#if data.returnedAlbum.summary}
                <p class="text-surface-600-400 text-sm leading-relaxed line-clamp-2">
                  {data.returnedAlbum.summary}
                </p>
              {:else}
                <p class="text-surface-500-500 italic text-sm">
                  No description available for this album
                </p>
              {/if}
            </div>
          </div>
        </div>
      {/if}

      <div class="text-center mb-4">
        <h1 class="h3 text-surface-900-100">Tracks</h1>
      </div>

      <!-- Tracks Table Container -->
      <div class="card border border-surface-200-800 preset-filled-surface-100-900 p-8 md:p-10 shadow-xl">
        {#if data.returnedTracks && data.returnedTracks.length > 0}
          <div class="table-wrap">
            <table class="table caption-bottom">
              <caption class="pt-4 text-surface-600-400">Track List</caption>
              <thead>
                <tr>
                  <th class="text-surface-900-100">Title</th>
                  <th class="text-surface-900-100">Path</th>
                  <th class="text-right! text-surface-900-100">Synced</th>
                </tr>
              </thead>
              <tbody>
                {#each data.returnedTracks as track}
                  <TrackTableRow
                    library={data.currentLibrary}
                    artist={data.returnedArtist}
                    album={data.returnedAlbum}
                    {track}
                  />
                {/each}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" class="text-surface-600-400 font-medium">Total Synced</td>
                  <td class="text-right text-surface-900-100 font-medium">{tracksSynced}/{totalTracks}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        {:else}
          <!-- Empty State -->
          <div class="text-center py-16">
            <div class="text-surface-400-600 text-lg mb-4">
              No tracks found for this album
            </div>
            <p class="text-surface-500-500">
              This album doesn't have any tracks in your library
            </p>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
