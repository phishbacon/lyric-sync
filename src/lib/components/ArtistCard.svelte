<script lang="ts">
  import type { InferredSelectArtistSchema, InferredSelectServerSchema } from "$lib/types";

  import { ProgressRing } from "@skeletonlabs/skeleton-svelte";
  import { CircleCheck, CircleX } from "lucide-svelte";
  import { fade } from "svelte/transition";

  import LazyLoading from "./LazyLoading.svelte";

  const selectedColor: string = "#00ff00";
  const { artist, serverConfiguration }: {
    artist: InferredSelectArtistSchema;
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
<a
  class="card border-[1px] border-surface-200-800 card-hover divide-surface-200-800 divide-y"
  class:preset-filled-surface-100-900={!hovered}
  class:preset-filled-surface-700-100={hovered}
  onmouseenter={() => { hovered = true; }}
  onmouseleave={() => { hovered = false; }}
  href="#{artist.title}"
>
  <!-- {/* Header */} -->
  <header>
    <LazyLoading>
      <img src={baseURL + artist.image + plexAuthToken} class="h-40" alt="Artist Artwork"
           class:hidden={loading}
           transition:fade
           onload={imageLoaded} />
      <div class:hidden={!loading}>
        <ProgressRing value={null} size="size-40" meterStroke="stroke-primary-600-400" trackStroke="stroke-secondary-50-950" />
      </div>
    </LazyLoading>
    <!-- TODO: Figure out how to get the artist summary in here. Want it to be inline with image
     overflow hidden with ellipsis -->
  </header>
  <!-- {/* Article */} -->
  <article class="space-y-4 p-4">
    <div>
      <h4>{artist.title}</h4>
    </div>

  </article>
  <!-- {/* Footer */} -->
  <footer class="flex items-center justify-between gap-4 p-4 h-10">
    <!-- TODO: Fill this with more information like how many albums/tracks are synced -->
    {#if artist.synced}
      <div class="flex gap-4">
        <small class="opacity-60">Synced</small>
        <CircleCheck color={selectedColor}></CircleCheck>
      </div>
    {:else}
      <div class="flex gap-4">
        <small class="opacity-60">Lyrics Missing</small>
        <CircleX></CircleX>
      </div>
      <button type="button" class="btn preset-filled-primary-500">Sync</button>
    {/if}
  </footer>
</a>

<style>
  img {
    border-radius: .3rem;
  }
</style>
