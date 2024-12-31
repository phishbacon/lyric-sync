<script lang="ts">
  import type { ToastContext } from "@skeletonlabs/skeleton-svelte";

  import { goto } from "$app/navigation";
  import { getContext, onMount } from "svelte";

  import type { LayoutServerData } from "./$types";

  const { data }: { data: LayoutServerData } = $props();
  export const toast: ToastContext = getContext("toast");

  onMount(() => {
    if (!data.serverConfiguration) {
      goto("/add-server");
      toast.create({
        title: "No Server Configuration",
        description: "Please add a server configuration",
        type: "error",
      });
    }
    // server configuration defined but no currentLibrary is set
    else if (!data.currentLibrary) {
      goto("/select-library");
      toast.create({
        title: "No Library Selected",
        description: "Select which library you would like to sync",
        type: "error",
      });
    }
  });
</script>

<div class="space-y-10 text-center flex flex-col items-center">
  <h2 class="h2">Welcome to Lyric-Sync</h2>
</div>
