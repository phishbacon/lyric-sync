<script lang="ts">
  import type {
    CheckTrackLyricsOnDiskResponse,
    InferredSelectAlbumSchema,
    InferredSelectArtistSchema,
    InferredSelectLibrarySchema,
    InferredSelectTrackSchema,
    SyncTrackResponse,
  } from "$lib/types";

  import { CircleCheck, CircleX, File } from "@lucide/svelte";
  import {
    Progress,
  } from "@skeletonlabs/skeleton-svelte";
  import { toaster } from "$lib/toaster";
  import { encodePlexID } from "$lib/uuid-encoder";
  import { fade } from "svelte/transition";

  const notSyncedColor: string = "#ff0000";
  const syncedColor: string = "#00ff00";
  const {
    library,
    artist,
    album,
    track = $bindable(),
  }: {
    library: InferredSelectLibrarySchema | undefined;
    artist: InferredSelectArtistSchema | undefined;
    album: InferredSelectAlbumSchema | undefined;
    track: InferredSelectTrackSchema;
  } = $props();
  let loading: boolean = $state(false);
  let loadingFileCheck: boolean = $state(false);

  let trackSynced: boolean = $state(track.synced);

  export async function syncTrackLyrics(showToasts: boolean = true, calledFromParent: boolean = false): Promise<void> {
    // only need to do anything if user is directly clicking on the tracks sync button or we are calling from the parent
    // and the track isn't synced yet
    if (!calledFromParent || !trackSynced) {
      loading = true;
      const syncLyricsResponse: Response = await fetch(`/api/sync-lyrics/track`, {
        method: "POST",
        body: JSON.stringify({
          library: library ? (library.uuid ?? "") : "",
          artistName: artist ? (artist.title ?? "") : "",
          albumName: album ? (album.title ?? "") : "",
          track,
        }),
      });

      const syncLyricsResponseJson: SyncTrackResponse
        = await syncLyricsResponse.json();
      loading = false;
      if (syncLyricsResponseJson.synced) {
        trackSynced = true;
        if (showToasts) {
          toaster.create({
            title: "Sync Success",
            description: syncLyricsResponseJson.message,
            type: "success",
          });
        }
      }
      else {
        trackSynced = false;
        if (showToasts) {
          toaster.create({
            title: "Sync Failed",
            description: syncLyricsResponseJson.message,
            type: "error",
          });
        }
      }
    }
    track.synced = trackSynced;
  }

  export async function checkTrackLyrics(showToasts: boolean = true): Promise<void> {
    loadingFileCheck = true;
    const checkTrackResponse: Response = await fetch(
      `/api/check-for-lrcs/track?library=${library ? encodePlexID(library.uuid) : ""}&track=${encodePlexID(track.uuid)}`,
    );

    const checkTrackResponseJson: CheckTrackLyricsOnDiskResponse
      = await checkTrackResponse.json();
    loadingFileCheck = false;
    if (checkTrackResponseJson.lyricsExist) {
      if (track.synced) {
        if (showToasts) {
          toaster.create({
            title: "Always Good To Double Check",
            description: checkTrackResponseJson.message,
            type: "info",
          });
        }
      }
      else {
        // reload to reconcile the differences
        trackSynced = true;
        if (showToasts) {
          toaster.create({
            title: "Marking As Synced",
            description: checkTrackResponseJson.message,
            type: "success",
          });
        }
      }
    }
    else {
      if (track.synced) {
        trackSynced = false;
        if (showToasts) {
          toaster.create({
            title: "Marking As Unsynced",
            description: checkTrackResponseJson.message,
            type: "error",
          });
        }
      }
      else {
        if (showToasts) {
          toaster.create({
            title: "Always Good To Double Check",
            description: checkTrackResponseJson.message,
            type: "info",
          });
        }
      }
    }
  }
</script>

<tr class="hover:preset-tonal-primary transition-colors duration-200">
  <td>{track.trackNumber.toString().padStart(2, "0")}. {track.title}</td>
  <td>{track.path.split("/")[track.path.split("/").length - 1]}</td>
  <td>
    <div class="flex justify-end" transition:fade>
      <div class:hidden={loadingFileCheck}>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div class="pointer" role="button" tabindex={track.trackNumber} onclick={() => checkTrackLyrics()}>
          {#if trackSynced}
            <File color={syncedColor}></File>
          {:else}
            <File color={notSyncedColor}></File>
          {/if}
        </div>
      </div>
      <div transition:fade class:hidden={!loadingFileCheck}>
        <Progress class="items-center w-fit" value={null}>
          <Progress.Circle class="[--size:--spacing(6)]">
            <Progress.CircleTrack class="stroke-tertiary-50-950" />
            <Progress.CircleRange class="stroke-tertiary-600-400" />
          </Progress.Circle>
        </Progress>
      </div>

      <div class:hidden={loading}>
        {#if trackSynced}
          <CircleCheck color={syncedColor}></CircleCheck>
        {:else}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <div class="pointer" role="button" tabindex={track.trackNumber} onclick={() => syncTrackLyrics()}>
            <CircleX color={notSyncedColor}></CircleX>
          </div>
        {/if}
      </div>
      <div transition:fade class:hidden={!loading}>
        <Progress class="items-center w-fit" value={null}>
          <Progress.Circle class="[--size:--spacing(6)]">
            <Progress.CircleTrack class="stroke-tertiary-50-950" />
            <Progress.CircleRange class="stroke-tertiary-600-400" />
          </Progress.Circle>
        </Progress>
      </div>
    </div>
  </td>
</tr>

<style>
  .pointer {
    cursor: pointer;
  }
</style>
