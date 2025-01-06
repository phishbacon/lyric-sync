<script lang="ts">
  import { Navigation, type ToastContext } from "@skeletonlabs/skeleton-svelte";
  import { page } from "$app/stores";
  import { DiscAlbum, Music, Settings } from "lucide-svelte";
  import { getContext, onMount, type Snippet } from "svelte";

  const { children }: { children: Snippet } = $props();
  const toast: ToastContext = getContext("toast");
  const redirectOnMount: (toast: ToastContext) => void = getContext("redirectOnMount");

  onMount(() => {
    redirectOnMount(toast);
  });
</script>

<!-- Component -->
<Navigation.Rail width="25rem" classes="fixed">
  {#snippet tiles()}
    <Navigation.Tile id="0" label="Artists" href="/view-library/artists" selected={$page.url.pathname === ("/view-library/artists")}>
      <Music />
    </Navigation.Tile>
    <Navigation.Tile id="1" label="Albums" href="/view-library/albums" selected={$page.url.pathname === ("/view-library/albums")}>
      <DiscAlbum />
    </Navigation.Tile>
  {/snippet}
  <!-- TODO: Not sure when this settings tile disappeared need to get it back -->
  {#snippet footer()}
    <Navigation.Tile labelExpanded="Settings" href="#" title="settings"><Settings /></Navigation.Tile>
  {/snippet}
</Navigation.Rail>
<!-- Content -->
<div class="ml-16">
  {@render children()}
</div>
