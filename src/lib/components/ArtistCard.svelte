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
        <LazyLoading>
          <img
            src={artist.image === "no-plex"
              ? RandomImageURL
              : baseURL + artist.image + plexAuthToken}
            class="artist-image"
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

      <!-- Progress Ring Overlay -->
      <div class="progress-overlay">
        <ProgressRing
          value={Math.ceil((artist.albumsSynced / artist.totalAlbums) * 100)}
          max={100}
          size="size-16"
          showLabel
        />
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

  .artist-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 0.5rem;
    transition: transform 0.3s ease;
  }

  .artist-card:hover .artist-image {
    transform: scale(1.05);
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
