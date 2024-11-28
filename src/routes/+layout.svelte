<script lang="ts">
  import "../app.css";
  import "../app.postcss";
  import { AppShell, AppBar } from "@skeletonlabs/skeleton";
  import type { LayoutServerData } from "./$types";
  import type { Snippet } from "svelte";

  let { data, children }: { data: LayoutServerData, children: Snippet } = $props()
</script>

<!-- App Shell -->
<AppShell>
  <svelte:fragment slot="header">
    <!-- App Bar -->
    <AppBar>
      <svelte:fragment slot="lead">
        <strong class="text-xl uppercase">
          <a href="/">
            Lyric-Sync
          </a>
        </strong>
      </svelte:fragment>
      <svelte:fragment slot="trail">
        {#if data.serverConfiguration}
          <a class="btn btn-sm variant-ghost-surface" href="/" rel="noreferrer">
            View Library
          </a>
        {:else}
          <a class="btn btn-sm variant-ghost-surface" href="/addserver" rel="noreferrer">
            Add Server
          </a>
        {/if}
      </svelte:fragment>
    </AppBar>
  </svelte:fragment>
  <!-- Page Route Content -->
  {@render children()}
</AppShell>
