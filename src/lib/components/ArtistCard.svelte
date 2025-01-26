<script lang="ts">
  import type {
    ArtistWithAlbumCount,
    InferredSelectServerSchema,
  } from "$lib/types";

  import { ProgressRing } from "@skeletonlabs/skeleton-svelte";
  import { RandomImageURL } from "$lib/external-links";
  import { CircleCheck, CircleX } from "lucide-svelte";
  import { fade } from "svelte/transition";

  import LazyLoading from "./LazyLoading.svelte";

  const selectedColor: string = "#00ff00";
  const {
    artist,
    serverConfiguration,
  }: {
    artist: ArtistWithAlbumCount;
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
  class:hidden={artist.library === "hide_me"}
>
  <a
    class="card border-[1px] border-surface-200-800 card-hover w-96 divide-surface-200-800 divide-y"
    class:preset-filled-surface-100-900={!hovered}
    class:preset-filled-surface-700-100={hovered}
    onmouseenter={() => {
      hovered = true;
    }}
    onmouseleave={() => {
      hovered = false;
    }}
    href="/view-library/artist/{encodeURIComponent(artist.uuid)}"
  >
    <!-- {/* Header */} -->
    <header class="flex p-4">
      <div class="flex w-1/2">
        <LazyLoading>
          <img
            src={artist.image === "no-plex"
              ? RandomImageURL
              : baseURL + artist.image + plexAuthToken}
            class="h-40"
            alt="Artist Artwork"
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
          value={Math.ceil((artist.albumsSynced / artist.totalAlbums) * 100)}
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
        <h4>{artist.title}</h4>
      </div>
      <div>
        {artist.albumsSynced} / {artist.totalAlbums} Albums Synced
      </div>
    </article>
    <!-- {/* Footer */} -->
    <footer class="flex items-center justify-between gap-4 p-4 h-10">
      <!-- TODO: Fill this with more information like how many albums/tracks are synced -->
      {#if artist.totalAlbums === artist.albumsSynced}
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
