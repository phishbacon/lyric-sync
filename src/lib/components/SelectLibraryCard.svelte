<script lang="ts">
  import type { InferredSelectLibrarySchema, InferredSelectServerSchema } from "$lib/types";

  import { CircleCheck, CircleX } from "lucide-svelte";

  const selectedColor: string = "#00ff00";
  const { library, serverConfiguration, updateSelected }: {
    library: InferredSelectLibrarySchema;
    serverConfiguration: InferredSelectServerSchema | undefined;
    updateSelected: (uuid: string) => void;
  } = $props();

  const baseURL: string = `${serverConfiguration?.hostname}:${serverConfiguration?.port}`;
  const plexAuthToken: string = `?X-Plex-Token=${serverConfiguration?.xPlexToken}`;
  let hovered: boolean = $state(false);
</script>

<!-- TODO: Make all cards the same size no matter what -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="card border-[1px] border-surface-200-800 card-hover divide-surface-200-800 divide-y"
  class:preset-filled-surface-100-900={!hovered}
  class:preset-filled-surface-700-100={hovered}
  onmouseenter={() => { hovered = true; }}
  onmouseleave={() => { hovered = false; }}
  onclick={() => updateSelected(library.uuid)}
>
  <!-- {/* Header */} -->
  <header>
    <img src={library.image === "no-plex" ? "https://picsum.photos/200" : baseURL + library.image + plexAuthToken} alt="Library Artwork" />
  </header>
  <!-- {/* Article */} -->
  <article class="space-y-4 p-4">
    <div>
      <h4 class="h4">{library.title}</h4>
    </div>
  </article>
  <!-- {/* Footer */} -->
  <footer class="flex items-center justify-between gap-4 p-4">
    <small class="opacity-60">{library.path}</small>
    {#if library.currentLibrary}
      <CircleCheck color={selectedColor}></CircleCheck>
    {:else}
      <CircleX></CircleX>
    {/if}
  </footer>
</div>

<style>
  img {
    border-radius: .3rem;
  }
</style>
