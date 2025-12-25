<script lang="ts">
  import "./layout.css";

  import type { Snippet } from "svelte";

  import { CloudSync, Menu, Music, Settings } from "@lucide/svelte";
  import {
    AppBar,
    Navigation,
    Progress,
  } from "@skeletonlabs/skeleton-svelte";
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import { logger } from "$lib/logger";
  import { toaster } from "$lib/toaster";
  import { setContext } from "svelte";
  import { fade } from "svelte/transition";

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

    try {
      const response = await fetch("/api/get-latest-plex-data");
      if (!response.ok) {
        throw new Error(`Failed to fetch Plex data: ${response.status} ${response.statusText}`);
      }

      await invalidateAll();

      toaster.create({
        title: "Plex Fetched",
        description: "Latest Plex Data Acquired",
        type: "success",
      });
    }
    catch (error) {
      logger.error(`Error fetching Plex data:, ${error}`);

      toaster.create({
        title: "Plex Fetched Failed",
        description: "Unable to acquire latest Plex data",
        type: "error",
      });
    }
    finally {
      fetchingPlexData = false;
    }
  }
</script>

<!-- App Bar -->
<AppBar class="z-10 h-16 justify-center p-2">
  <AppBar.Toolbar class="grid-cols-[1fr_2fr_1fr]">
    <AppBar.Lead>
      {#if isViewLibrary}
        <button
          type="button"
          class="btn-icon btn-icon-lg hover:preset-tonal"
          in:fade={{ duration: 300 }}
          out:fade={{ duration: 300 }}
          onclick={toggleMenu}
        >
          <Menu class="size=6" />
        </button>
      {/if}
    </AppBar.Lead>
    <AppBar.Headline class="flex justify-center">
      {#key isViewLibrary}
        <strong
          class="text-xl uppercase"
        >
          <a href={data.currentLibrary ? "/view-library" : "/"}> Lyric-Sync </a>
        </strong>
      {/key}
    </AppBar.Headline>
    <AppBar.Trail class="justify-end">
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
    </AppBar.Trail>
  </AppBar.Toolbar>
</AppBar>

<!-- Navigation Rail -->
{#if menuOpen && isViewLibrary}
  <div transition:fade={{ duration: 500 }} class="fixed pb-16 top-16 left-0 z-0 h-full w-full">
    <Navigation layout="rail" class="w-16">
      <Navigation.Header>
      </Navigation.Header>
      <Navigation.Content>
        <Navigation.Menu>
          <Navigation.TriggerAnchor href="/view-library">
            <Music class="size-6" />
            <Navigation.TriggerText>Artists</Navigation.TriggerText>
          </Navigation.TriggerAnchor>
          <Navigation.TriggerAnchor href="#" onclick={fetchPlexData}>
            {#if fetchingPlexData}
              <div in:fade>
                <Progress class="items-center w-fit" value={null}>
                  <Progress.Circle class="[--size:--spacing(6)]">
                    <Progress.CircleTrack />
                    <Progress.CircleRange />
                  </Progress.Circle>
                </Progress>
              </div>
            {:else if !fetchingPlexData}
              <div in:fade>
                <CloudSync class="size=6" />
              </div>
            {/if}
            <Navigation.TriggerText>Fetch Plex</Navigation.TriggerText>
          </Navigation.TriggerAnchor>
        </Navigation.Menu>
      </Navigation.Content>
      <Navigation.Footer>
        <Navigation.TriggerAnchor href="/#" title="Settings" aria-label="Settings">
          <Settings />
        </Navigation.TriggerAnchor>
      </Navigation.Footer>
    </Navigation>
  </div>
{/if}

<!-- <Toaster {toaster}></Toaster> -->

<!-- Page Route Content -->
<div class="transition-all duration-500 ease-in-out {menuOpen && !isSelectLibrary ? "pl-16" : "pl-0"}">
  {@render children()}
</div>

<style>
</style>
