<script lang="ts">
  import "./layout.css";

  import type { PlexPinApiResponse, PlexPollApiResponse, PlexUpdateTokenApiResponse, ReauthenticateAndRetry } from "$lib/types";
  import type { Snippet } from "svelte";

  import { CloudSync, Menu, Music, Settings, TriangleAlert, X } from "@lucide/svelte";
  import {
    AppBar,
    Navigation,
    Progress,
    Toast,
  } from "@skeletonlabs/skeleton-svelte";
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import { logger } from "$lib/logger";
  import { toaster } from "$lib/toaster";
  import { onMount, setContext } from "svelte";
  import { fade } from "svelte/transition";

  import type { LayoutServerData } from "./$types";

  const AUTH_POLL_INTERVAL_MS = 1000;
  const AUTH_POLL_TIMEOUT_MS = 60000;

  const { data, children }: { data: LayoutServerData; children: Snippet }
    = $props();

  // Menu state
  let menuOpen: boolean = $state(false);
  let fetchingPlexData: boolean = $state(false);
  const isViewLibrary: boolean = $derived(page.url.pathname.includes("/view-library"));
  const isSelectLibrary: boolean = $derived(page.url.pathname.includes("/select-library"));

  // Re-auth banner state
  let bannerDismissed: boolean = $state(false);
  let tokenInvalidLocal: boolean = $state(false);
  const showReauthBanner: boolean = $derived((!data.tokenValid || tokenInvalidLocal) && !bannerDismissed);
  let reauthInProgress: boolean = $state(false);

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

  async function pollForToken(pinId: number, pinCode: string, clientId: string): Promise<string | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < AUTH_POLL_TIMEOUT_MS) {
      const params = new URLSearchParams({
        pinId: String(pinId),
        pinCode,
        clientId,
      });

      const response: Response = await fetch(`/api/plex-auth/poll?${params.toString()}`);

      if (response.ok) {
        const pollData: PlexPollApiResponse = await response.json();
        if (pollData.authenticated && pollData.token) {
          return pollData.token;
        }
      }

      await new Promise(resolve => setTimeout(resolve, AUTH_POLL_INTERVAL_MS));
    }

    return null;
  }

  // Re-authentication flow — returns true if re-auth succeeded, false otherwise
  async function reauthenticate(): Promise<boolean> {
    reauthInProgress = true;

    try {
      // Step 1: Request a PIN
      const pinResponse: Response = await fetch("/api/plex-auth/pin", {
        method: "POST",
      });

      if (!pinResponse.ok) {
        throw new Error("Failed to create Plex PIN");
      }

      const pinData: PlexPinApiResponse = await pinResponse.json();

      // Step 2: Open Plex auth page in a new tab
      if (pinData.authUrl) {
        window.open(pinData.authUrl, "_blank");
      }

      // Step 3: Poll for authentication
      const token = await pollForToken(pinData.pinId, pinData.pinCode, pinData.clientId);

      if (token) {
        // Step 4: Update the token in the database
        const updateResponse: Response = await fetch("/api/plex-auth/update-token", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, clientIdentifier: pinData.clientId }),
        });

        const updateData: PlexUpdateTokenApiResponse = await updateResponse.json();

        if (updateData.updated) {
          bannerDismissed = true;
          tokenInvalidLocal = false;
          await invalidateAll();
          toaster.create({
            title: "Re-authenticated",
            description: "Your Plex token has been updated",
            type: "success",
          });
          return true;
        }
        else {
          toaster.create({
            title: "Update Failed",
            description: updateData.message,
            type: "error",
          });
          return false;
        }
      }
      else {
        toaster.create({
          title: "Authentication Timed Out",
          description: "Please try again. You have 60 seconds to log in.",
          type: "error",
        });
        return false;
      }
    }
    catch {
      toaster.create({
        title: "Authentication Error",
        description: "Failed to start Plex authentication",
        type: "error",
      });
      return false;
    }
    finally {
      reauthInProgress = false;
    }
  }

  // Re-authenticate and then re-run all server load functions
  const reauthenticateAndRetry: ReauthenticateAndRetry = async () => {
    tokenInvalidLocal = true;
    bannerDismissed = false;

    toaster.create({
      title: "Authentication Expired",
      description: "Your Plex token is no longer valid. Please re-authenticate.",
      type: "error",
    });

    const success = await reauthenticate();

    if (success) {
      await invalidateAll();
    }
  };
  setContext("reauthenticateAndRetry", reauthenticateAndRetry);

  async function fetchPlexData(): Promise<void> {
    fetchingPlexData = true;

    try {
      const response = await fetch("/api/get-latest-plex-data");

      if (response.status === 401) {
        await reauthenticateAndRetry();
        return;
      }

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
      logger.error(`Error fetching Plex data: ${error}`);

      toaster.create({
        title: "Plex Fetch Failed",
        description: "Unable to acquire latest Plex data",
        type: "error",
      });
    }
    finally {
      fetchingPlexData = false;
    }
  }

  // On mount, if the server detected an invalid token, auto-trigger re-auth
  // Page will reload on successful re-authentication
  onMount(() => {
    if (!data.tokenValid && data.serverConfiguration) {
      reauthenticateAndRetry();
    }
  });
</script>

<!-- Re-auth Banner -->
{#if showReauthBanner}
  <div
    transition:fade={{ duration: 300 }}
    class="fixed top-0 left-0 right-0 z-10 h-16 justify-center p-2 bg-warning-500/90 text-surface-900 px-4 py-3"
  >
    <div class="flex items-center justify-center gap-3 max-w-4xl mx-auto">
      <TriangleAlert class="size-5 shrink-0" />
      <span class="font-medium">Your Plex authentication has expired.</span>
      {#if reauthInProgress}
        <div class="flex items-center gap-2">
          <div class="animate-spin h-4 w-4 border-2 border-surface-900 border-t-transparent rounded-full"></div>
          <span class="text-sm">Waiting for authentication...</span>
        </div>
      {:else}
        <button
          type="button"
          onclick={reauthenticate}
          class="btn btn-sm preset-filled-surface-500 font-medium"
        >
          Re-authenticate
        </button>
      {/if}
      <button
        type="button"
        onclick={() => bannerDismissed = true}
        class="btn-icon btn-icon-sm hover:preset-tonal"
        aria-label="Dismiss"
      >
        <X class="size-4" />
      </button>
    </div>
  </div>
{/if}

<!-- App Bar -->
<AppBar class="fixed top-0 left-0 right-0 z-10 h-16 justify-center p-2 {showReauthBanner ? "mt-12" : ""}">
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
          <Menu class="size-6" />
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
  <div transition:fade={{ duration: 500 }} class="fixed top-0 left-0 z-0 h-full {showReauthBanner ? "pt-12" : ""}">
    <Navigation layout="rail" class="w-16">
      <Navigation.Header>
      </Navigation.Header>
      <Navigation.Content>
        <Navigation.Menu>
          <Navigation.TriggerAnchor href="/view-library">
            <Music class="size-6" />
            <Navigation.TriggerText>Artists</Navigation.TriggerText>
          </Navigation.TriggerAnchor>
          <Navigation.Trigger onclick={fetchPlexData} class="w-12 h-14">
            {#if fetchingPlexData}
              <div in:fade>
                <Progress class="items-center w-fit" value={null}>
                  <Progress.Circle class="[--size:--spacing(6)]">
                    <Progress.CircleTrack />
                    <Progress.CircleRange />
                  </Progress.Circle>
                </Progress>
              </div>
            {:else}
              <div in:fade>
                <CloudSync class="size-6" />
              </div>
            {/if}
            <Navigation.TriggerText>Fetch Plex</Navigation.TriggerText>
          </Navigation.Trigger>
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

<!-- Page Route Content -->
<div class="transition-all duration-500 ease-in-out {menuOpen && !isSelectLibrary ? "pl-16" : "pl-0"} {showReauthBanner ? "mt-12" : ""}">
  {@render children()}
  <Toast.Group {toaster}>
    {#snippet children(toast)}
      <Toast toast={toast}>
        <Toast.Message>
          <Toast.Title>{toast.title}</Toast.Title>
          <Toast.Description>{toast.description}</Toast.Description>
        </Toast.Message>
        <Toast.CloseTrigger />
      </Toast>
    {/snippet}
  </Toast.Group>
</div>

<style>
</style>
