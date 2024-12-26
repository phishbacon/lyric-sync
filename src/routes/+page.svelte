<script lang="ts">
  import type { ToastContext } from "@skeletonlabs/skeleton-svelte";

  import { getContext } from "svelte";

  import type { LayoutServerData } from "./$types";

  const { data }: { data: LayoutServerData } = $props();
  export const toast: ToastContext = getContext("toast");

  if (!data.serverConfiguration) {
    toast.create({
      title: "No Server Configuration",
      description: "Fix this by clicking Add Server up top",
      type: "error",
    });
  }
  // server configuration defined but no currentLibrary is set
  else if (!data.currentLibrary) {
    toast.create({
      title: "No Library Selected",
      description: "Fix this by clicking Select Library up top",
      type: "error",
    });
  }
</script>

<div class="space-y-10 text-center flex flex-col items-center">
  <h2 class="h2">Welcome to Lyric-Sync.</h2>
</div>
