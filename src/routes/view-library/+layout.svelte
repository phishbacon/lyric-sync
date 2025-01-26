<script lang="ts">
  import { Navigation, type ToastContext } from "@skeletonlabs/skeleton-svelte";
  import { page } from "$app/state";
  import { Music, Settings } from "lucide-svelte";
  import { getContext, onMount, type Snippet } from "svelte";

  const { children }: { children: Snippet } = $props();
  const toast: ToastContext = getContext("toast");
  const redirectOnMount: (toast: ToastContext) => void
    = getContext("redirectOnMount");

  onMount(() => {
    redirectOnMount(toast);
  });
</script>

<Navigation.Rail width="25rem" classes="fixed">
  {#snippet tiles()}
    <Navigation.Tile
      id="0"
      label="Library"
      href="/view-library"
      selected={page.url.pathname === "/view-library"}
    >
      <Music />
    </Navigation.Tile>
  {/snippet}
  <!-- TODO: Not sure when this settings tile disappeared need to get it back -->
  {#snippet footer()}
    <Navigation.Tile labelExpanded="Settings" href="#" title="settings"
    ><Settings /></Navigation.Tile
    >
  {/snippet}
</Navigation.Rail>
<!-- Content -->
<div class="ml-16 pt-16">
  {@render children()}
</div>
