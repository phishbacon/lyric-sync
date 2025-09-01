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

<div class="album-card-container">
  <a
    class="album-card"
    class:hovered={hovered}
    onmouseenter={() => {
      hovered = true;
    }}
    onmouseleave={() => {
      hovered = false;
    }}
    href="/view-library/album/{encodeURIComponent(album.uuid)}"
  >
    <!-- Album Image and Progress -->
    <div class="image-section">
      <div class="image-container">
        <LazyLoading>
          <img
            src={album.image === "no-plex"
              ? RandomImageURL
              : baseURL + album.image + plexAuthToken}
            class="album-image"
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

      <!-- Progress Ring Overlay -->
      <div class="progress-overlay">
        <ProgressRing
          value={Math.ceil((album.tracksSynced / album.totalTracks) * 100)}
          max={100}
          size="size-16"
          showLabel
        />
      </div>
    </div>

    <!-- Album Info -->
    <div class="album-info">
      <h3 class="album-title">{album.title}</h3>
      <p class="track-count">{album.tracksSynced} / {album.totalTracks} Tracks Synced</p>
    </div>

    <!-- Status Footer -->
    <div class="status-footer">
      {#if album.totalTracks === album.tracksSynced}
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
  .album-card-container {
    display: flex;
    justify-content: center;
  }

  .album-card {
    position: relative;
    background: var(--color-surface-50-900);
    border: 2px solid var(--color-surface-200-800);
    border-radius: 0.75rem;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s ease;
    width: 100%;
    max-width: 320px;
    height: 380px;
    display: flex;
    flex-direction: column;
    text-decoration: none;
    color: inherit;
  }

  .album-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    border-color: var(--color-primary-500);
  }

  .image-section {
    position: relative;
    width: 100%;
    height: 180px;
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

  .album-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 0.5rem;
    transition: transform 0.3s ease;
  }

  .album-card:hover .album-image {
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

  .album-info {
    padding: 1.25rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .album-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-surface-900-100);
    margin: 0 0 0.5rem 0;
    line-height: 1.3;
  }

  .track-count {
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
