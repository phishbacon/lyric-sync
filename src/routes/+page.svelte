<script lang="ts">
  import type { ToastContext } from "@skeletonlabs/skeleton-svelte";

  import { getContext, onMount } from "svelte";

  const toast: ToastContext = getContext("toast");
  const redirectOnMount: (toast: ToastContext) => void
    = getContext("redirectOnMount");

  onMount(() => {
    redirectOnMount(toast);
  });
</script>

<div class="space-y-10 text-center flex flex-col items-center">
  <h2 class="h2">Welcome to Lyric-Sync</h2>
</div>
