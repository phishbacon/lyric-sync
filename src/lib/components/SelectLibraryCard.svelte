<script lang="ts">
  import type {
    InferredSelectLibrarySchema,
    InferredSelectServerSchema,
  } from "$lib/types";

  import { getImageSrc } from "$lib/image-utils";
  import { CircleCheck, CircleX } from "lucide-svelte";

  const selectedColor: string = "#00ff00";
  const {
    library,
    serverConfiguration,
    updateSelected,
  }: {
    library: InferredSelectLibrarySchema;
    serverConfiguration: InferredSelectServerSchema | undefined;
    updateSelected: (uuid: string) => void;
  } = $props();

  const baseURL: string = `${serverConfiguration?.hostname}:${serverConfiguration?.port}`;
  const plexAuthToken: string = `?X-Plex-Token=${serverConfiguration?.xPlexToken}`;
  let hovered: boolean = $state(false);

</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="library-card"
  class:selected={library.currentLibrary}
  class:hovered={hovered}
  onmouseenter={() => {
    hovered = true;
  }}
  onmouseleave={() => {
    hovered = false;
  }}
  onclick={() => updateSelected(library.uuid)}
>
  <!-- Library Image -->
  <div class="image-container">
    <img
      src={getImageSrc({ image: library.image, baseURL, plexAuthToken })}
      alt="Library Artwork"
      class="library-image"
    />
    <div class="image-overlay">
      {#if library.currentLibrary}
        <CircleCheck color={selectedColor} size={32} />
      {:else}
        <CircleX color="#d41976" size={32} />
      {/if}
    </div>
  </div>

  <!-- Library Info -->
  <div class="library-info">
    <h3 class="library-title">{library.title}</h3>
    <p class="library-path">{library.path}</p>
  </div>
</div>

<style>
  .library-card {
    position: relative;
    background: var(--color-surface-50-900);
    border: 2px solid var(--color-surface-200-800);
    border-radius: 0.75rem;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s ease;
    width: 100%;
    max-width: 320px;
    height: 400px;
    display: flex;
    flex-direction: column;
  }

  .library-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    border-color: var(--color-primary-500);
  }

  .library-card.selected {
    border-color: var(--color-success-500);
    box-shadow: 0 0 0 3px var(--color-success-500/10);
  }

  .library-card.selected:hover {
    border-color: var(--color-success-600);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15), 0 0 0 3px var(--color-success-500/10);
  }

  .image-container {
    position: relative;
    width: 100%;
    height: 240px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .library-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .library-card:hover .library-image {
    transform: scale(1.05);
  }

  .image-overlay {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 50%;
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
  }

  .library-info {
    padding: 1.5rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 0;
  }

  .library-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-surface-900-100);
    margin: 0 0 0.75rem 0;
    line-height: 1.3;
  }

  .library-path {
    font-size: 0.875rem;
    color: var(--color-surface-600-400);
    margin: 0;
    line-height: 1.4;
    word-break: break-word;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
</style>
