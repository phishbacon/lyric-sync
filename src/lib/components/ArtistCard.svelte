<script lang="ts">
  import type {
    ArtistWithAlbumCount,
    ImageConfig,
    InferredSelectServerSchema,
  } from "$lib/types";

  import { CircleCheck, CircleX } from "@lucide/svelte";
  import { Progress } from "@skeletonlabs/skeleton-svelte";

  import Image from "./Image.svelte";

  const selectedColor: string = "#00ff00";
  const {
    artist,
    serverConfiguration,
  }: {
    artist: ArtistWithAlbumCount;
    serverConfiguration: InferredSelectServerSchema | undefined;
  } = $props();

  const imageConfig: ImageConfig = $derived({
    image: artist.image,
    baseURL: `${serverConfiguration?.hostname}:${serverConfiguration?.port}`,
    plexAuthToken: `?X-Plex-Token=${serverConfiguration?.xPlexToken}`,
  });
  let hovered: boolean = $state(false);
</script>

<div class="artist-card-container">
  <a
    class="artist-card"
    class:hovered={hovered}
    onmouseenter={() => {
      hovered = true;
    }}
    onmouseleave={() => {
      hovered = false;
    }}
    href="/view-library/artist/{encodeURIComponent(artist.uuid)}"
  >
    <!-- Artist Image and Progress -->
    <div class="image-section">
      <div class="image-container">
        {#key imageConfig}
          <Image
            {imageConfig}
            alt="Artist Artwork"
            imgClasses="hover-image"
            loadingClasses="flex items-center justify-center"
            size="[--size:--spacing(40)]"
            meterStroke="stroke-primary-600-400"
            trackStroke="stroke-secondary-50-950"
          />
        {/key}
      </div>

      <!-- Progress Ring Overlay -->
      <div class="progress-overlay">
        <Progress class="w-fit relative"
                  value={typeof artist.albumsSynced === "number"
                    && typeof artist.totalAlbums === "number"
                    && artist.totalAlbums > 0
                    ? Math.ceil((artist.albumsSynced / artist.totalAlbums) * 100)
                    : 0}
        >
          <div class="absolute inset-0 flex items-center justify-center">
            <Progress.ValueText />
          </div>
          <Progress.Circle class="[--size:--spacing(16)]">
            <Progress.CircleTrack />
            <Progress.CircleRange />
          </Progress.Circle>
        </Progress>
      </div>
    </div>

    <!-- Artist Info -->
    <div class="artist-info">
      <h3 class="artist-title">{artist.title}</h3>
      <p class="album-count">{artist.albumsSynced} / {artist.totalAlbums} Albums Synced</p>
    </div>

    <!-- Status Footer -->
    <div class="status-footer">
      {#if artist.totalAlbums === artist.albumsSynced}
        <div class="status-item synced">
          <span class="status-text">Synced</span>
          <CircleCheck color={selectedColor} size={20} />
        </div>
      {:else}
        <div class="status-item missing">
          <span class="status-text">Lyrics Missing</span>
          <CircleX color="#d41976" size={20} />
        </div>
        <button type="button" class="sync-button">
          Sync
        </button>
      {/if}
    </div>
  </a>
</div>

<style>
  .artist-card-container {
    display: flex;
    justify-content: center;
  }

  .artist-card {
    position: relative;
    background: var(--color-surface-50-900);
    border: 2px solid var(--color-surface-200-800);
    border-radius: 0.75rem;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s ease;
    width: 100%;
    max-width: 280px;
    height: 420px;
    display: flex;
    flex-direction: column;
    text-decoration: none;
    color: inherit;
  }

  .artist-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    border-color: var(--color-primary-500);
  }

  .image-section {
    position: relative;
    width: 100%;
    height: 200px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .image-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .progress-overlay {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 50%;
    width: 4rem;
    height: 4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
  }

  .artist-info {
    padding: 1.25rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .artist-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-surface-900-100);
    margin: 0 0 0.5rem 0;
    line-height: 1.3;
  }

  .album-count {
    font-size: 0.875rem;
    color: var(--color-surface-600-400);
    margin: 0;
    line-height: 1.4;
  }

  .status-footer {
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--color-surface-200-800);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-item.synced {
    color: var(--color-success-500);
  }

  .status-item.missing {
    color: var(--color-error-500);
  }

  .status-text {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .sync-button {
    background: var(--color-primary-500);
    color: white;
    border: none;
    border-radius: 0.375rem;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .sync-button:hover {
    background: var(--color-primary-600);
    transform: translateY(-1px);
  }
</style>
