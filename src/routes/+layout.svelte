<script lang="ts">
  import "../app.css";

  import {
    AppBar,
    Navigation,
    ProgressRing,
    Toaster,
  } from "@skeletonlabs/skeleton-svelte";
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import { toaster } from "$lib/toaster";
  import { Menu, Music, DatabaseBackup, Settings } from "lucide-svelte";
  import { setContext, type Snippet } from "svelte";
  import { fade, fly } from "svelte/transition";

  import type { LayoutServerData } from "./$types";

  const { data, children }: { data: LayoutServerData; children: Snippet }
    = $props();

  // Menu state
  let menuOpen: boolean = $state(false);
  let fetchingPlexData: boolean = $state(false);
  const isViewLibrary: boolean = $derived(page.url.pathname.includes("/view-library"));
  const isSelectLibrary: boolean = $derived(page.url.pathname.includes("/select-library"));

  export function redirectOnMount(): void {
    if (!data.serverConfiguration) {
      goto("/add-server");
      toaster.create({
        title: "No Server Configuration",
        description: "Please add a server configuration",
        type: "error",
      });
    }
    // server configuration defined but no currentLibrary is set
    else if (!data.currentLibrary) {
      goto("/select-library");
      toaster.create({
        title: "No Library Selected",
        description: "Select which library you would like to sync",
        type: "error",
      });
    }
  }
  setContext("redirectOnMount", redirectOnMount);

  function toggleMenu(): void {
    menuOpen = !menuOpen;
  }

  async function fetchPlexData(): Promise<void> {
    fetchingPlexData = true;
    await fetch("/api/get-latest-plex-data");
    await invalidateAll();
    toaster.create({
      title: "Plex Fetched",
      description: "Latest Plex Data Acquired",
      type: "success",
    });
    fetchingPlexData = false;
  }
</script>

<!-- App Bar -->
<AppBar classes="fixed z-10 h-16">
  {#snippet lead()}
    <div class="flex items-center gap-4">
      {#if isViewLibrary}
        <button
          type="button"
          class="btn btn-sm variant-ghost-surface p-2"
          in:fade={{ duration: 300 }}
          out:fade={{ duration: 300 }}
          onclick={toggleMenu}
        >
          <Menu size={20} />
        </button>
      {/if}
      {#key isViewLibrary}
        <strong
          class="text-xl uppercase"
          in:fly={{ x: isViewLibrary ? -40 : 0, duration: 300, opacity: 1 }}
        >
          <a href={data.currentLibrary ? "/view-library" : "/"}> Lyric-Sync </a>
        </strong>
      {/key}
    </div>
  {/snippet}
  {#snippet trail()}
    {#if data.serverConfiguration}
      {#if data.currentLibrary}
        {#if page.url.pathname !== "/select-library"}
          <a
            class="btn btn-sm variant-ghost-surface"
            href="/select-library"
            rel="noreferrer"
          >
            Change Library
          </a>
        {/if}
        {#if !page.url.pathname.includes("/view-library")}
          <a
            class="btn btn-sm variant-ghost-surface"
            href="/view-library"
            rel="noreferrer"
          >
            View Library
          </a>
        {/if}
      {/if}
    {:else}
      <a
        class="btn btn-sm variant-ghost-surface"
        href="/add-server"
        rel="noreferrer"
      >
        Add Server
      </a>
    {/if}
  {/snippet}
</AppBar>

<!-- Navigation Rail -->
{#if menuOpen && isViewLibrary}
  <div transition:fade={{duration: 100}}>
  <Navigation.Rail
    width="16rem"
    classes="fixed pb-18 top-16 left-0 z-20 h-full transition-all duration-500 ease-in-out"
  >
    {#snippet tiles()}
      <Navigation.Tile
        id="artists"
        label="Artists"
        href="/view-library"
        selected={page.url.pathname === "/view-library"}
      >
        <Music />
      </Navigation.Tile>
      <Navigation.Tile
        id="fetch-plex-data"
        label="Fetch Plex"
        onclick={fetchPlexData}
      >
        {#if fetchingPlexData}
          <div in:fade>
            <ProgressRing
              value={null}
              size="size-6"
              meterStroke="stroke-primary-600-400"
              trackStroke="stroke-secondary-50-950"
            />
          </div>
        {:else if !fetchingPlexData}
          <div in:fade>
            <DatabaseBackup />
          </div>
        {/if}
      </Navigation.Tile>
    {/snippet}
    {#snippet footer()}
      <Navigation.Tile
        label="Settings"
        href="#"
        title="settings"
      >
        <Settings />
      </Navigation.Tile>
    {/snippet}
  </Navigation.Rail>
  </div>
{/if}

<Toaster {toaster}></Toaster>

<!-- Page Route Content -->
<div class="transition-all duration-500 ease-in-out {menuOpen && !isSelectLibrary ? "pl-16" : "pl-0"}">
  {@render children()}
</div>

<style>
</style>
