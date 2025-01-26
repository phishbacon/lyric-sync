<script lang="ts">
  import type {
    CheckTrackLyricsOnDiskResponse,
    InferredSelectAlbumSchema,
    InferredSelectArtistSchema,
    InferredSelectLibrarySchema,
    InferredSelectTrackSchema,
    SyncTrackResponse,
  } from "$lib/types";

  import {
    ProgressRing,
    type ToastContext,
  } from "@skeletonlabs/skeleton-svelte";
  import { invalidateAll } from "$app/navigation";
  import { CircleCheck, CircleX, File } from "lucide-svelte";
  import { getContext } from "svelte";
  import { fade } from "svelte/transition";

  const notSyncedColor: string = "#ff0000";
  const syncedColor: string = "#00ff00";
  const {
    library,
    artist,
    album,
    track,
  }: {
    library: InferredSelectLibrarySchema | undefined;
    artist: InferredSelectArtistSchema | undefined;
    album: InferredSelectAlbumSchema | undefined;
    track: InferredSelectTrackSchema;
  } = $props();
  let loading: boolean = $state(false);
  let loadingFileCheck: boolean = $state(false);
  const toast: ToastContext = getContext("toast");

  async function syncTrackLyrics(): Promise<void> {
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

    const syncLyricsResponseJson: SyncTrackResponse =
      await syncLyricsResponse.json();
    loading = false;
    if (syncLyricsResponseJson.synced) {
      invalidateAll();
      toast.create({
        title: "Sync Success",
        description: syncLyricsResponseJson.message,
        type: "success",
      });
    } else {
      toast.create({
        title: "Sync Failed",
        description: syncLyricsResponseJson.message,
        type: "error",
      });
    }
  }

  async function checkTrackLyrics(): Promise<void> {
    loadingFileCheck = true;
    const checkTrackResponse: Response = await fetch(
      `/api/check-for-lrcs/track?library=${library ? library.uuid : ""}&track=${track.uuid}`,
    );

    const checkTrackResponseJson: CheckTrackLyricsOnDiskResponse =
      await checkTrackResponse.json();
    loadingFileCheck = false;
    if (checkTrackResponseJson.lyricsExist) {
      if (track.synced) {
        toast.create({
          title: "Always Good To Double Check",
          description: checkTrackResponseJson.message,
          type: "info",
        });
      } else {
        // reload to reconcile the differences
        invalidateAll();
        toast.create({
          title: "Marking As Synced",
          description: checkTrackResponseJson.message,
          type: "success",
        });
      }
    } else {
      if (track.synced) {
        invalidateAll();
        toast.create({
          title: "Marking As Unsynced",
          description: checkTrackResponseJson.message,
          type: "error",
        });
      } else {
        toast.create({
          title: "Always Good To Double Check",
          description: checkTrackResponseJson.message,
          type: "info",
        });
      }
    }
  }
</script>

<tr>
  <td>{track.trackNumber.toString().padStart(2, "0")}. {track.title}</td>
  <td>{track.path.split("/")[track.path.split("/").length - 1]}</td>
  <td>
    <div class="flex justify-end" transition:fade>
      <div class:hidden={loadingFileCheck}>
        {#if track.synced}
          <!-- using a here because I want the cursor to turn into a pointer
                       when the user is hovering over the icon -->
          <!-- svelte-ignore a11y_invalid_attribute -->
          <a href="" onclick={checkTrackLyrics}>
            <File color={syncedColor}></File>
          </a>
        {:else}
          <!-- using a here because I want the cursor to turn into a pointer
                       when the user is hovering over the icon -->
          <!-- svelte-ignore a11y_invalid_attribute -->
          <a href="" onclick={checkTrackLyrics}>
            <File color={notSyncedColor}></File>
          </a>
        {/if}
      </div>
      <div transition:fade class:hidden={!loadingFileCheck}>
        <ProgressRing
          value={null}
          size="size-6"
          meterStroke="stroke-tertiary-600-400"
          trackStroke="stroke-tertiary-50-950"
        />
      </div>

      <div class:hidden={loading}>
        {#if track.synced}
          <CircleCheck color={syncedColor}></CircleCheck>
        {:else}
          <!-- using a here because I want the cursor to turn into a pointer
                       when the user is hovering over the icon -->
          <!-- svelte-ignore a11y_invalid_attribute -->
          <a href="" onclick={syncTrackLyrics}>
            <CircleX color={notSyncedColor}></CircleX>
          </a>
        {/if}
      </div>
      <div transition:fade class:hidden={!loading}>
        <ProgressRing
          value={null}
          size="size-6"
          meterStroke="stroke-tertiary-600-400"
          trackStroke="stroke-tertiary-50-950"
        />
      </div>
    </div>
  </td>
</tr>
