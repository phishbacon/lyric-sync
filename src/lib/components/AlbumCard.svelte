<script lang="ts">
  import type { InferredSelectAlbumSchema, InferredSelectServerSchema } from "$lib/types";

  import { ProgressRing } from "@skeletonlabs/skeleton-svelte";
  import { RandomImageURL } from "$lib/external-links";
  import { CircleCheck, CircleX } from "lucide-svelte";
  import { fade } from "svelte/transition";

  import LazyLoading from "./LazyLoading.svelte";

  const selectedColor: string = "#00ff00";
  const { album, serverConfiguration }: {
    album: InferredSelectAlbumSchema;
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
<!-- the first card not being the correct size might be a skeleton ui v3 bug -->
<a
  class="card border-[1px] border-surface-200-800 card-hover divide-surface-200-800 divide-y"
  class:preset-filled-surface-100-900={!hovered}
  class:preset-filled-surface-700-100={hovered}
  onmouseenter={() => { hovered = true; }}
  onmouseleave={() => { hovered = false; }}
  href="#{album.title}"
>
  <!-- {/* Header */} -->
  <header>
    <LazyLoading>
      <img src={album.image === "no-plex" ? RandomImageURL : baseURL + album.image + plexAuthToken} class="h-40" alt="Album Artwork"
           class:hidden={loading}
           transition:fade
           onload={imageLoaded} />
      <div class:hidden={!loading}>
        <ProgressRing value={null} size="size-40" meterStroke="stroke-primary-600-400" trackStroke="stroke-secondary-50-950" />
      </div>
    </LazyLoading>

  </header>
  <!-- {/* Article */} -->
  <article class="space-y-4 p-4">
    <div>
      <h4 class="h4">{album.title}</h4>
    </div>

  </article>
  <!-- {/* Footer */} -->
  <footer class="flex items-center justify-between gap-4 p-4">
    {#if album.synced}
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
