<script lang="ts">
  import type {
    AlbumWithTrackCount,
    InferredSelectServerSchema,
  } from "$lib/types";

  import { ProgressRing } from "@skeletonlabs/skeleton-svelte";
  import { RandomImageURL } from "$lib/external-links";
  import { CircleCheck, CircleX } from "lucide-svelte";
  import { fade } from "svelte/transition";

  import LazyLoading from "./LazyLoading.svelte";

  const selectedColor: string = "#00ff00";
  const {
    album,
    serverConfiguration,
  }: {
    album: AlbumWithTrackCount;
    serverConfiguration: InferredSelectServerSchema | undefined;
  } = $props();

  const baseURL: string = `${serverConfiguration?.hostname}:${serverConfiguration?.port}`;
  const plexAuthToken: string = `?X-Plex-Token=${serverConfiguration?.xPlexToken}`;
  let hovered: boolean = $state(false);
  let loading: boolean = $state(true);

  function imageLoaded(): void {
    loading = false;
  }
</script>

<!-- TODO: Make all cards the same size no matter what -->
<div
  class="flex justify-center my-2"
  class:hidden={album.library === "hide_me"}
>
  <a
    class="card border border-surface-200-800 card-hover w-96 divide-surface-200-800 divide-y"
    class:preset-filled-surface-100-900={!hovered}
    class:preset-filled-surface-700-100={hovered}
    onmouseenter={() => {
      hovered = true;
    }}
    onmouseleave={() => {
      hovered = false;
    }}
    href="/view-library/album/{encodeURIComponent(album.uuid)}"
  >
    <!-- {/* Header */} -->
    <header class="flex p-4">
      <div class="flex w-1/2">
        <LazyLoading>
          <img
            src={album.image === "no-plex"
              ? RandomImageURL
              : baseURL + album.image + plexAuthToken}
            class="h-40"
            alt="Album Artwork"
            class:hidden={loading}
            transition:fade
            onload={imageLoaded}
          />
          <div class:hidden={!loading}>
            <ProgressRing
              value={null}
              size="size-40"
              meterStroke="stroke-primary-600-400"
              trackStroke="stroke-secondary-50-950"
            />
          </div>
        </LazyLoading>
      </div>
      <div class="flex w-1/2 justify-end">
        <ProgressRing
          value={Math.ceil((album.tracksSynced / album.totalTracks) * 100)}
          max={100}
          size="size-40"
        />
      </div>
      <!-- TODO: Figure out how to get the artist summary in here. Want it to be inline with image
       overflow hidden with ellipsis -->
    </header>
    <!-- {/* Article */} -->
    <article class="flex items-center px-4 justify-between">
      <div>
        <h4>{album.title}</h4>
      </div>
      <div>
        {album.tracksSynced} / {album.totalTracks} Tracks Synced
      </div>
    </article>
    <!-- {/* Footer */} -->
    <footer class="flex items-center justify-between gap-4 p-4 h-10">
      <!-- TODO: Fill this with more information like how many albums/tracks are synced -->
      {#if album.totalTracks === album.tracksSynced}
        <div class="flex gap-4">
          <small class="opacity-60">Synced</small>
          <CircleCheck color={selectedColor}></CircleCheck>
        </div>
      {:else}
        <div class="flex gap-4">
          <small class="opacity-60">Lyrics Missing</small>
          <CircleX></CircleX>
        </div>
        <div class="flex">
          <button type="button" class="btn preset-filled-primary-500"
          >Sync</button
          >
        </div>
      {/if}
    </footer>
  </a>
</div>

<style>
  img {
    border-radius: 0.3rem;
  }
</style>
