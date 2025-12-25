<script lang="ts">
  import type { Snippet } from "svelte";

  import { getContext, onMount } from "svelte";

  const { children }: { children: Snippet } = $props();
  const redirectOnMount: () => void
    = getContext("redirectOnMount");

  onMount(() => {
    redirectOnMount();
  });
</script>

<!-- Content -->
{@render children()}
