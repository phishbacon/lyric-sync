<script lang="ts">
  import type { Snippet } from "svelte";

  import { Navigation } from "@skeletonlabs/skeleton-svelte";
  import { page } from "$app/stores";
  import { DiscAlbum, FileMusic, Music, Settings } from "lucide-svelte";

  const { children }: { children: Snippet } = $props();
</script>

<div class="pt-15 card border-surface-100-900 grid h-full w-full grid-cols-[auto_1fr] border-[1px]">
  <!-- Component -->
  <Navigation.Rail width="25rem" classes="fixed">
    {#snippet tiles()}
      <Navigation.Tile id="0" label="Artists" href="/view-library/artists" selected={$page.url.pathname === ("/view-library/artists")}>
        <Music />
      </Navigation.Tile>
      <Navigation.Tile id="1" label="Albums" href="/view-library/albums" selected={$page.url.pathname === ("/view-library/albums")}>
        <DiscAlbum />
      </Navigation.Tile>
      <Navigation.Tile id="2" label="Tracks" href="/view-library/tracks" selected={$page.url.pathname === ("/view-library/tracks")}>
        <FileMusic />
      </Navigation.Tile>
    {/snippet}
    {#snippet footer()}
      <Navigation.Tile labelExpanded="Settings" href="#" title="settings"><Settings /></Navigation.Tile>
    {/snippet}
  </Navigation.Rail>
  <!-- Content -->
  <div class="pt-16 pb-3 pl-20 flex items-center justify-center">
    {@render children()}
  </div>
</div>
