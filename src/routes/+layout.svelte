<script lang="ts">
  import "../app.postcss";

  import { AppBar, type ToastContext, ToastProvider } from "@skeletonlabs/skeleton-svelte";
  import { page } from "$app/stores";
  import { getContext, setContext, type Snippet } from "svelte";

  import type { LayoutServerData } from "./$types";

  const { data, children }: { data: LayoutServerData; children: Snippet } = $props();
  const toast: ToastContext = getContext("toast");
  function toaster(title: string, description: string, type: "error" | "success" | "info") {
    toast.create({
      title,
      description,
      type,
    });
  }
  setContext("toaster", toaster);
</script>

<ToastProvider>
  <!-- App Bar -->
  <AppBar classes="fixed z-10 h-16">
    {#snippet lead()}
      <strong class="text-xl uppercase">
        <a href={data.currentLibrary ? "/view-library/artists" : "/"}>
          Lyric-Sync
        </a>
      </strong>
    {/snippet}
    {#snippet trail()}
      {#if data.serverConfiguration}
        {#if data.currentLibrary}
          <a class="btn btn-sm variant-ghost-surface" href="/select-library" rel="noreferrer">
            Syncing: {data.currentLibrary.title}
          </a>
          {#if !$page.url.pathname.includes("/view-library")}
            <a class="btn btn-sm variant-ghost-surface" href="/view-library/artists" rel="noreferrer">
              View Library
            </a>
          {/if}
        {/if}
      {:else}
        <a class="btn btn-sm variant-ghost-surface" href="/add-server" rel="noreferrer">
          Add Server
        </a>
      {/if}
    {/snippet}
  </AppBar>
  <!-- Page Route Content -->
  <div class="py-16">
    {@render children()}
  </div>
</ToastProvider>

<style>
</style>
