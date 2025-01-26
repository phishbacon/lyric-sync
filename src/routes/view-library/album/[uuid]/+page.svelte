<script lang="ts">
  import { ProgressRing } from "@skeletonlabs/skeleton-svelte";
  import { invalidateAll } from "$app/navigation";
  import TrackTableRow from "$lib/components/TrackTableRow.svelte";
  import { RandomImageURL } from "$lib/external-links";
  import { logger } from "$lib/logger";
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

    if (data.invalidateData) {
      logger.info("Album marked as synced in db. Refreshing data");
      invalidateAll();
    }

    if (data.returnedTracks) {
      returnData.totalTracks = data.returnedTracks.length;
      returnData.tracksSynced = data.returnedTracks.reduce((acc, el) => {
        if (el.synced) {
          return acc + 1;
        } else {
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

<div class="px-2 py-1 grid grid-cols-1 w-full space-y-3">
  <div
    class="card preset-filled-surface-100-900 border-[1px] border-surface-200-800 w-full h-56 p-4 flex"
  >
    {#if data.returnedAlbum}
      <img
        src={data.returnedAlbum.image === "no-plex"
          ? RandomImageURL
          : baseURL + data.returnedAlbum.image + plexAuthToken}
        class="h-48"
        alt="Album Artwork"
        class:hidden={loading}
        transition:fade
        onload={imageLoaded}
      />
      <div class:hidden={!loading}>
        <ProgressRing
          value={null}
          size="size-48"
          meterStroke="stroke-primary-600-400"
          trackStroke="stroke-secondary-50-950"
        />
      </div>
      <span class="text-ellipsis overflow-hidden content-center text-left px-3">
        {data.returnedAlbum.summary}
      </span>
    {/if}
  </div>
</div>

<div class="px-2 py-1">
  {#if data.returnedTracks}
    <div class="table-wrap">
      <table class="table caption-bottom">
        <caption class="pt-4">Track List</caption>
        <thead>
          <tr>
            <th>Title</th>
            <th>Path</th>
            <th class="!text-right">Synced</th>
          </tr>
        </thead>
        <tbody class="hover:[&>tr]:preset-tonal-primary">
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
            <td colspan="2">Total Synced</td>
            <td class="text-right">{tracksSynced}/{totalTracks}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  {/if}
</div>
