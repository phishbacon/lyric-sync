<script lang="ts">
  import "../app.postcss";

  import type { Snippet } from "svelte";

  import { AppBar } from "@skeletonlabs/skeleton-svelte";

  import type { LayoutServerData } from "./$types";

  const { data, children }: { data: LayoutServerData; children: Snippet } = $props();
</script>

<!-- App Bar -->
<AppBar>
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
<!-- Page Route Content -->
{@render children()}
