<script lang="ts">
  import { getContext, onMount } from "svelte";

  const redirectOnMount: () => void
    = getContext("redirectOnMount");

  onMount(() => {
    redirectOnMount();
  });
</script>

<div class="space-y-10 text-center flex flex-col items-center">
  <h2 class="h2">Welcome to Lyric-Sync</h2>
</div>
