<script lang="ts">
  import type { ToastContext } from "@skeletonlabs/skeleton-svelte";

  import ArtistCard from "$lib/components/ArtistCard.svelte";
  import { getContext } from "svelte";

  import type { LayoutServerData } from "../$types";

  export const toast: ToastContext = getContext("toast");

  const { data }: { data: LayoutServerData } = $props();
</script>

<div class="grid grid-cols-3 space-x-1 space-y-3">
  {#if data.returnedArtists}
    {#each data.returnedArtists as artist}
      <ArtistCard {artist} serverConfiguration={data.serverConfiguration} />
    {/each}
  {/if}
</div>
