<script lang="ts">
  import "../app.postcss";

  import type { Snippet } from "svelte";

  import { AppBar } from "@skeletonlabs/skeleton-svelte";

  import type { LayoutServerData } from "./$types";

  const { data, children }: { data: LayoutServerData; children: Snippet } = $props();
</script>

<!-- App Bar -->
<AppBar classes="fixed z-50">
  {#snippet lead()}
    <strong class="text-xl uppercase">
      <a href="/">
        Lyric-Sync
      </a>
    </strong>
  {/snippet}
  {#snippet trail()}
    {#if data.serverConfiguration}
      {#if data.currentLibary}
        <a class="btn btn-sm variant-ghost-surface" href="/view-library" rel="noreferrer">
          View Library
        </a>
        <a class="btn btn-sm variant-ghost-surface" href="/select-library" rel="noreferrer">
          Change Library
        </a>
      {:else}
        <a class="btn btn-sm variant-ghost-surface" href="/select-library" rel="noreferrer">
          Select Library
        </a>
      {/if}
    {:else}
      <a class="btn btn-sm variant-ghost-surface" href="/add-server" rel="noreferrer">
        Add Server
      </a>
    {/if}
  {/snippet}
</AppBar>
<div class="p-24 container h-full mx-auto flex justify-center items-center">
  <!-- Page Route Content -->
  {@render children()}
</div>

<style>
</style>
