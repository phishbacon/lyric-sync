<script lang="ts">
  import type { ToastContext } from "@skeletonlabs/skeleton-svelte";

  import AlbumCard from "$lib/components/AlbumCard.svelte";
  import { getContext } from "svelte";

  import type { LayoutServerData } from "../$types";

  export const toast: ToastContext = getContext("toast");

  const { data }: { data: LayoutServerData } = $props();
</script>

<div class="px-5 py-1 grid grid-cols-1 w-full space-x-1 space-y-3">
  {#if data.returnedAlbums}
    {#each data.returnedAlbums as album}
      <AlbumCard {album} serverConfiguration={data.serverConfiguration} />
    {/each}
  {/if}
</div>
