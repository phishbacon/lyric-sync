<script lang="ts">
  import type { InferredSelectArtistSchema, InferredSelectServerSchema } from "$lib/types";

  import { CircleCheck, CircleX } from "lucide-svelte";

  const selectedColor: string = "#00ff00";
  const { artist, serverConfiguration }: {
    artist: InferredSelectArtistSchema;
    serverConfiguration: InferredSelectServerSchema | undefined;
  } = $props();

  const baseURL: string = `${serverConfiguration?.hostname}:${serverConfiguration?.port}`;
  const plexAuthToken: string = `?X-Plex-Token=${serverConfiguration?.xPlexToken}`;
  let hovered: boolean = $state(false);
</script>

<!-- TODO: Make all cards the same size no matter what -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="card border-[1px] border-surface-200-800 card-hover divide-surface-200-800 divide-y"
  class:preset-filled-surface-100-900={!hovered}
  class:preset-filled-surface-900-100={hovered}
  onmouseenter={() => { hovered = true; }}
  onmouseleave={() => { hovered = false; }}
>
  <!-- {/* Header */} -->
  <header>
    <img src={baseURL + artist.image + plexAuthToken} alt="Artist Artwork" />
  </header>
  <!-- {/* Article */} -->
  <article class="space-y-4 p-4">
    <div>
      <h4 class="h4">{artist.title}</h4>
    </div>
  </article>
  <!-- {/* Footer */} -->
  <footer class="flex items-center justify-between gap-4 p-4">
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
</div>

<style>
  img {
    border-radius: .3rem;
  }
</style>
